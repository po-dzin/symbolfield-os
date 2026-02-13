import { collectClusterDescendantIds } from '../graph/clusterHierarchy';
import { spaceManager, type SpaceData } from '../state/SpaceManager';
import { stateEngine } from '../state/StateEngine';
import { asNodeId, type Edge, type NodeBase, type NodeId } from '../types';
import { entitlementsService } from '../access/EntitlementsService';
import type { ExternalGraphLinkVisibility } from '../types/gateway';
import {
    clearRemoteUiStateKey,
    isUiStateRemoteEnabled,
    readRemoteUiStateKey,
    writeRemoteUiStateKey
} from '../data/uiStateRemote';

const SHARE_STORAGE_KEY = 'sf_share_links.v0.5';
const REMOTE_SHARE_LINKS_KEY = 'share-links';
const REMOTE_WRITE_DEBOUNCE_MS = 160;

export type ShareScopeType = 'space' | 'cluster' | 'node';

export interface ShareLinkSnapshot {
    id: string;
    token: string;
    title: string;
    scopeType: ShareScopeType;
    spaceId: string;
    scopeNodeId: string | null;
    nodes: NodeBase[];
    edges: Edge[];
    createdAt: number;
    updatedAt: number;
    visibility: ExternalGraphLinkVisibility;
}

export interface CreateShareLinkInput {
    title: string;
    scopeType: ShareScopeType;
    spaceId: string;
    scopeNodeId?: NodeId | string | null;
    visibility?: ExternalGraphLinkVisibility;
}

const normalizeString = (value: unknown): string => (
    typeof value === 'string' ? value.trim() : ''
);

const normalizeScopeType = (value: unknown): ShareScopeType | null => (
    value === 'space' || value === 'cluster' || value === 'node'
        ? value
        : null
);

const normalizeVisibility = (value: unknown): ExternalGraphLinkVisibility => (
    value === 'private' || value === 'public' || value === 'shared'
        ? value
        : 'shared'
);

const parseShareLinkSnapshot = (value: unknown): ShareLinkSnapshot | null => {
    if (!value || typeof value !== 'object') return null;
    const raw = value as Record<string, unknown>;
    const id = normalizeString(raw.id);
    const token = normalizeString(raw.token);
    const title = normalizeString(raw.title) || 'Shared Graph';
    const scopeType = normalizeScopeType(raw.scopeType);
    const spaceId = normalizeString(raw.spaceId);
    if (!id || !token || !scopeType || !spaceId) return null;

    const nodes = Array.isArray(raw.nodes) ? (raw.nodes as NodeBase[]) : [];
    const edges = Array.isArray(raw.edges) ? (raw.edges as Edge[]) : [];
    const createdAt = typeof raw.createdAt === 'number' && Number.isFinite(raw.createdAt)
        ? raw.createdAt
        : Date.now();
    const updatedAt = typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt)
        ? raw.updatedAt
        : createdAt;
    const scopeNodeId = normalizeString(raw.scopeNodeId) || null;
    const visibility = normalizeVisibility(raw.visibility);

    return {
        id,
        token,
        title,
        scopeType,
        spaceId,
        scopeNodeId,
        nodes,
        edges,
        createdAt,
        updatedAt,
        visibility
    };
};

const sortShareLinks = (links: ShareLinkSnapshot[]): ShareLinkSnapshot[] => (
    [...links].sort((a, b) => b.updatedAt - a.updatedAt)
);

const normalizeShareLinks = (value: unknown): ShareLinkSnapshot[] => (
    Array.isArray(value)
        ? sortShareLinks(
            value
                .map(item => parseShareLinkSnapshot(item))
                .filter((item): item is ShareLinkSnapshot => Boolean(item))
        )
        : []
);

const mergeShareLinks = (
    localLinks: ShareLinkSnapshot[],
    remoteLinks: ShareLinkSnapshot[]
): ShareLinkSnapshot[] => {
    const next = new Map<string, ShareLinkSnapshot>();
    const upsert = (link: ShareLinkSnapshot) => {
        const key = link.token || link.id;
        if (!key) return;
        const existing = next.get(key);
        if (!existing || link.updatedAt >= existing.updatedAt) {
            next.set(key, link);
        }
    };

    localLinks.forEach(upsert);
    remoteLinks.forEach(upsert);
    return sortShareLinks(Array.from(next.values()));
};

let remoteHydrated = false;
let remoteHydrating = false;
let remoteHydrationPromise: Promise<void> | null = null;
let remoteWriteTimer: number | null = null;

const loadShareLinks = (): ShareLinkSnapshot[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(SHARE_STORAGE_KEY);
        if (!raw) return [];
        return normalizeShareLinks(JSON.parse(raw) as unknown);
    } catch {
        return [];
    }
};

const scheduleRemoteShareWrite = (links: ShareLinkSnapshot[]) => {
    if (!isUiStateRemoteEnabled()) return;
    if (remoteWriteTimer !== null) {
        window.clearTimeout(remoteWriteTimer);
    }
    remoteWriteTimer = window.setTimeout(() => {
        remoteWriteTimer = null;
        void writeRemoteUiStateKey(REMOTE_SHARE_LINKS_KEY, links);
    }, REMOTE_WRITE_DEBOUNCE_MS);
};

const persistShareLinks = (links: ShareLinkSnapshot[], options: { syncRemote?: boolean } = {}) => {
    if (typeof window === 'undefined') return;
    try {
        const normalized = sortShareLinks(links);
        window.localStorage.setItem(SHARE_STORAGE_KEY, JSON.stringify(normalized));
        if (options.syncRemote !== false) {
            scheduleRemoteShareWrite(normalized);
        }
    } catch {
        // Ignore storage write failures in MVP mode.
    }
};

const hydrateShareLinksFromRemote = (): Promise<void> => {
    if (!isUiStateRemoteEnabled()) return Promise.resolve();
    if (remoteHydrated) return Promise.resolve();
    if (remoteHydrating && remoteHydrationPromise) return remoteHydrationPromise;
    remoteHydrating = true;
    remoteHydrationPromise = (async () => {
        try {
            const payload = await readRemoteUiStateKey(REMOTE_SHARE_LINKS_KEY);
            const remoteLinks = normalizeShareLinks(payload);
            const localLinks = loadShareLinks();
            const merged = mergeShareLinks(localLinks, remoteLinks);
            if (merged.length !== localLinks.length || merged.some((link, index) => localLinks[index]?.token !== link.token)) {
                persistShareLinks(merged, { syncRemote: false });
                if (merged.length > remoteLinks.length) {
                    scheduleRemoteShareWrite(merged);
                }
            }
            remoteHydrated = true;
        } finally {
            remoteHydrating = false;
            remoteHydrationPromise = null;
        }
    })();
    return remoteHydrationPromise;
};

const toNodeId = (value: NodeId | string): NodeId => (
    typeof value === 'string' ? asNodeId(value) : value
);

const pickScopedSnapshot = (
    data: SpaceData,
    scopeType: ShareScopeType,
    scopeNodeId: NodeId | string | null | undefined
): { nodes: NodeBase[]; edges: Edge[]; scopeNodeId: string | null } => {
    const nodes = data.nodes ?? [];
    const edges = data.edges ?? [];

    if (scopeType === 'space') {
        return { nodes, edges, scopeNodeId: null };
    }

    const normalizedScopeId = scopeNodeId ? String(scopeNodeId) : '';
    if (!normalizedScopeId) {
        return { nodes: [], edges: [], scopeNodeId: null };
    }

    const nodeMap = new Map<string, NodeBase>(nodes.map(node => [String(node.id), node]));
    const root = nodeMap.get(normalizedScopeId);
    if (!root) {
        return { nodes: [], edges: [], scopeNodeId: normalizedScopeId };
    }

    const includedNodeIds = new Set<string>([normalizedScopeId]);
    const shouldCollectSubtree = scopeType === 'cluster' || root.type === 'cluster';

    if (shouldCollectSubtree) {
        const descendants = collectClusterDescendantIds(
            toNodeId(normalizedScopeId),
            nodes,
            edges,
            { includeEdgeLinked: true }
        );
        descendants.forEach((id) => includedNodeIds.add(String(id)));
    }

    const scopedNodes = nodes.filter(node => includedNodeIds.has(String(node.id)));
    const scopedEdges = edges.filter(edge => (
        includedNodeIds.has(String(edge.source)) && includedNodeIds.has(String(edge.target))
    ));

    return {
        nodes: scopedNodes,
        edges: scopedEdges,
        scopeNodeId: normalizedScopeId
    };
};

export const buildShareSnapshotForScope = (
    data: SpaceData,
    scopeType: ShareScopeType,
    scopeNodeId?: NodeId | string | null
): { nodes: NodeBase[]; edges: Edge[]; scopeNodeId: string | null } => (
    pickScopedSnapshot(data, scopeType, scopeNodeId)
);

export const buildShareUrl = (token: string): string => {
    const cleanToken = normalizeString(token);
    if (!cleanToken || typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    url.searchParams.set('share', cleanToken);
    return url.toString();
};

export const readShareTokenFromLocation = (href: string): string | null => {
    if (!href) return null;
    try {
        const url = new URL(href, 'http://localhost');
        const fromSearch = normalizeString(url.searchParams.get('share'));
        if (fromSearch) return fromSearch;
        const pathMatch = url.pathname.match(/\/share\/([a-zA-Z0-9_-]+)/);
        return pathMatch?.[1] ?? null;
    } catch {
        return null;
    }
};

export const shareService = {
    loadShareLinks: () => {
        void hydrateShareLinksFromRemote();
        return loadShareLinks();
    },
    hydrateShareLinksFromRemote: async () => {
        await hydrateShareLinksFromRemote();
    },
    clearShareLinks: () => {
        persistShareLinks([]);
        if (isUiStateRemoteEnabled()) {
            void clearRemoteUiStateKey(REMOTE_SHARE_LINKS_KEY);
        }
    },
    resolveShareLinkByToken: (token: string): ShareLinkSnapshot | null => {
        const normalizedToken = normalizeString(token);
        if (!normalizedToken) return null;
        const links = shareService.loadShareLinks();
        return links.find(link => link.token === normalizedToken) ?? null;
    },
    resolveShareLinkByTokenAsync: async (token: string): Promise<ShareLinkSnapshot | null> => {
        const normalizedToken = normalizeString(token);
        if (!normalizedToken) return null;
        await hydrateShareLinksFromRemote();
        const links = loadShareLinks();
        return links.find(link => link.token === normalizedToken) ?? null;
    },
    createShareLinkAsync: async (input: CreateShareLinkInput): Promise<ShareLinkSnapshot | null> => {
        const currentLinks = shareService.loadShareLinks();
        await entitlementsService.ensureCanCreateShareLink(currentLinks.length);
        return shareService.createShareLink(input);
    },
    createShareLink: (input: CreateShareLinkInput): ShareLinkSnapshot | null => {
        const title = normalizeString(input.title) || 'Shared Graph';
        const spaceId = normalizeString(input.spaceId);
        const scopeType = normalizeScopeType(input.scopeType);
        if (!spaceId || !scopeType) return null;
        const currentLinks = shareService.loadShareLinks();
        entitlementsService.assertCanCreateShareLink(currentLinks.length);

        if (stateEngine.getState().currentSpaceId === spaceId) {
            spaceManager.saveCurrentSpace();
        }

        const data = spaceManager.getSpaceData(spaceId);
        if (!data) return null;

        const scoped = pickScopedSnapshot(data, scopeType, input.scopeNodeId);
        if (scoped.nodes.length === 0) return null;

        const now = Date.now();
        const nextLink: ShareLinkSnapshot = {
            id: crypto.randomUUID(),
            token: crypto.randomUUID().replace(/-/g, ''),
            title,
            scopeType,
            spaceId,
            scopeNodeId: scoped.scopeNodeId,
            nodes: scoped.nodes,
            edges: scoped.edges,
            createdAt: now,
            updatedAt: now,
            visibility: normalizeVisibility(input.visibility)
        };

        const nextLinks = sortShareLinks([nextLink, ...currentLinks]);
        persistShareLinks(nextLinks);
        return nextLink;
    }
};
