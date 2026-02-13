import { collectClusterDescendantIds } from '../graph/clusterHierarchy';
import { spaceManager, type SpaceData } from '../state/SpaceManager';
import { stateEngine } from '../state/StateEngine';
import { asNodeId, type Edge, type NodeBase, type NodeId } from '../types';
import { entitlementsService } from '../access/EntitlementsService';

const SHARE_STORAGE_KEY = 'sf_share_links.v0.5';

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
}

export interface CreateShareLinkInput {
    title: string;
    scopeType: ShareScopeType;
    spaceId: string;
    scopeNodeId?: NodeId | string | null;
}

const normalizeString = (value: unknown): string => (
    typeof value === 'string' ? value.trim() : ''
);

const normalizeScopeType = (value: unknown): ShareScopeType | null => (
    value === 'space' || value === 'cluster' || value === 'node'
        ? value
        : null
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
        updatedAt
    };
};

const loadShareLinks = (): ShareLinkSnapshot[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(SHARE_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map(item => parseShareLinkSnapshot(item))
            .filter((item): item is ShareLinkSnapshot => Boolean(item))
            .sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
        return [];
    }
};

const persistShareLinks = (links: ShareLinkSnapshot[]) => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(SHARE_STORAGE_KEY, JSON.stringify(links));
    } catch {
        // Ignore storage write failures in MVP mode.
    }
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
    loadShareLinks,
    clearShareLinks: () => persistShareLinks([]),
    resolveShareLinkByToken: (token: string): ShareLinkSnapshot | null => {
        const normalizedToken = normalizeString(token);
        if (!normalizedToken) return null;
        const links = loadShareLinks();
        return links.find(link => link.token === normalizedToken) ?? null;
    },
    createShareLink: (input: CreateShareLinkInput): ShareLinkSnapshot | null => {
        const title = normalizeString(input.title) || 'Shared Graph';
        const spaceId = normalizeString(input.spaceId);
        const scopeType = normalizeScopeType(input.scopeType);
        if (!spaceId || !scopeType) return null;
        const currentLinks = loadShareLinks();
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
            updatedAt: now
        };

        const nextLinks = [nextLink, ...currentLinks].sort((a, b) => b.updatedAt - a.updatedAt);
        persistShareLinks(nextLinks);
        return nextLink;
    }
};
