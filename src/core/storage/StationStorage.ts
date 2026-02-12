import {
    clearRemoteUiState,
    clearRemoteUiStateKey,
    isUiStateRemoteEnabled,
    readRemoteUiState,
    readRemoteUiStateKey,
    writeRemoteUiState,
    writeRemoteUiStateKey
} from '../data/uiStateRemote';
import { eventBus, EVENTS } from '../events/EventBus';
import type { ExternalGraphLink, ExternalGraphLinkVisibility, ExternalGraphRoute } from '../types/gateway';

const STATION_LAYOUT_KEY = 'station_layout.v0.5';
const EXTERNAL_GRAPH_LINKS_KEY = 'station_external_graph_links.v0.5';
const REMOTE_EXTERNAL_GRAPH_LINKS_KEY = 'station-external-graph-links';

export type StationLayout = Record<string, { x: number; y: number }>;

const normalizeStationLayout = (input: unknown): StationLayout => {
    if (!input || typeof input !== 'object') return {};
    const raw = input as Record<string, unknown>;
    const next: StationLayout = {};

    Object.entries(raw).forEach(([id, value]) => {
        if (!value || typeof value !== 'object') return;
        const coords = value as Record<string, unknown>;
        const x = coords.x;
        const y = coords.y;
        if (typeof x !== 'number' || !Number.isFinite(x)) return;
        if (typeof y !== 'number' || !Number.isFinite(y)) return;
        next[id] = { x, y };
    });

    return next;
};

const normalizeRoute = (input: unknown): ExternalGraphRoute | null => {
    if (!input || typeof input !== 'object') return null;
    const raw = input as Record<string, unknown>;
    if (raw.type === 'symbolverse') {
        return { type: 'symbolverse' };
    }
    if (raw.type === 'atlas') {
        return { type: 'atlas' };
    }
    if (raw.type === 'brand') {
        const slug = typeof raw.slug === 'string' ? raw.slug.trim() : '';
        if (!slug) return null;
        return { type: 'brand', slug };
    }
    if (raw.type === 'portal-builder') {
        const slug = typeof raw.slug === 'string' ? raw.slug.trim() : '';
        if (!slug) return null;
        return { type: 'portal-builder', slug };
    }
    if (raw.type === 'portal') {
        const brandSlug = typeof raw.brandSlug === 'string' ? raw.brandSlug.trim() : '';
        const portalSlug = typeof raw.portalSlug === 'string' ? raw.portalSlug.trim() : '';
        if (!brandSlug || !portalSlug) return null;
        return { type: 'portal', brandSlug, portalSlug };
    }
    return null;
};

const normalizeVisibility = (input: unknown): ExternalGraphLinkVisibility => (
    input === 'shared' || input === 'public' ? input : 'private'
);

const buildDefaultLinkLabel = (target: ExternalGraphRoute): string => {
    if (target.type === 'symbolverse') {
        return 'Symbolverse';
    }
    if (target.type === 'atlas') {
        return 'Atlas';
    }
    if (target.type === 'brand') {
        return `Brand: ${target.slug}`;
    }
    if (target.type === 'portal-builder') {
        return `Builder: ${target.slug}`;
    }
    return `Portal: ${target.brandSlug}/${target.portalSlug}`;
};

const normalizeExternalGraphLinks = (input: unknown): ExternalGraphLink[] => {
    if (!Array.isArray(input)) return [];
    const now = Date.now();
    const next: ExternalGraphLink[] = [];
    const seenIds = new Set<string>();
    input.forEach((item) => {
        if (!item || typeof item !== 'object') return;
        const raw = item as Record<string, unknown>;
        const id = typeof raw.id === 'string' ? raw.id.trim() : '';
        if (!id || seenIds.has(id)) return;
        const target = normalizeRoute(raw.target);
        if (!target) return;
        const label = typeof raw.label === 'string' && raw.label.trim()
            ? raw.label.trim()
            : buildDefaultLinkLabel(target);
        const createdAt = typeof raw.createdAt === 'number' && Number.isFinite(raw.createdAt)
            ? raw.createdAt
            : now;
        const updatedAt = typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt)
            ? raw.updatedAt
            : createdAt;
        const link: ExternalGraphLink = {
            id,
            label,
            target,
            visibility: normalizeVisibility(raw.visibility),
            createdAt,
            updatedAt
        };
        if (typeof raw.lastOpenedAt === 'number' && Number.isFinite(raw.lastOpenedAt)) {
            link.lastOpenedAt = raw.lastOpenedAt;
        }
        seenIds.add(id);
        next.push(link);
    });
    return next.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
};

const routeKey = (target: ExternalGraphRoute): string => (
    target.type === 'symbolverse'
        ? 'symbolverse'
        : target.type === 'atlas'
            ? 'atlas'
            : target.type === 'brand'
                ? `brand:${target.slug.toLowerCase()}`
                : target.type === 'portal-builder'
                    ? `builder:${target.slug.toLowerCase()}`
                    : `portal:${target.brandSlug.toLowerCase()}/${target.portalSlug.toLowerCase()}`
);

const loadLocalStationLayout = (): StationLayout => {
    if (typeof window === 'undefined') return {};
    try {
        const raw = window.localStorage.getItem(STATION_LAYOUT_KEY);
        if (!raw) return {};
        return normalizeStationLayout(JSON.parse(raw));
    } catch {
        return {};
    }
};

const saveLocalStationLayout = (layout: StationLayout) => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STATION_LAYOUT_KEY, JSON.stringify(layout));
    } catch {
        // ignore
    }
};

const clearLocalStationLayout = () => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(STATION_LAYOUT_KEY);
    } catch {
        // ignore
    }
};

const loadLocalExternalGraphLinks = (): ExternalGraphLink[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(EXTERNAL_GRAPH_LINKS_KEY);
        if (!raw) return [];
        return normalizeExternalGraphLinks(JSON.parse(raw));
    } catch {
        return [];
    }
};

const saveLocalExternalGraphLinks = (links: ExternalGraphLink[]) => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(EXTERNAL_GRAPH_LINKS_KEY, JSON.stringify(normalizeExternalGraphLinks(links)));
    } catch {
        // ignore
    }
};

const clearLocalExternalGraphLinks = () => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(EXTERNAL_GRAPH_LINKS_KEY);
    } catch {
        // ignore
    }
};

let stationLayoutHydrated = false;
let stationLayoutHydrating = false;
let stationLinksHydrated = false;
let stationLinksHydrating = false;

const hydrateStationLayoutFromRemote = () => {
    if (!isUiStateRemoteEnabled()) return;
    if (stationLayoutHydrated || stationLayoutHydrating) return;
    stationLayoutHydrating = true;
    void (async () => {
        const payload = await readRemoteUiState('station-layout');
        const remote = normalizeStationLayout(payload);
        if (Object.keys(remote).length > 0) {
            saveLocalStationLayout(remote);
        }
        stationLayoutHydrated = true;
        stationLayoutHydrating = false;
    })();
};

const hydrateExternalGraphLinksFromRemote = () => {
    if (!isUiStateRemoteEnabled()) return;
    if (stationLinksHydrated || stationLinksHydrating) return;
    stationLinksHydrating = true;
    void (async () => {
        const payload = await readRemoteUiStateKey(REMOTE_EXTERNAL_GRAPH_LINKS_KEY);
        const remote = normalizeExternalGraphLinks(payload);
        if (remote.length > 0) {
            saveLocalExternalGraphLinks(remote);
            eventBus.emit(EVENTS.EXTERNAL_GRAPH_LINKS_CHANGED, { links: remote });
        }
        stationLinksHydrated = true;
        stationLinksHydrating = false;
    })();
};

const loadStationLayout = (): StationLayout => {
    hydrateStationLayoutFromRemote();
    return loadLocalStationLayout();
};

const saveStationLayout = (layout: StationLayout) => {
    const normalized = normalizeStationLayout(layout);
    saveLocalStationLayout(normalized);
    if (isUiStateRemoteEnabled()) {
        void writeRemoteUiState('station-layout', normalized);
    }
};

const clearStationLayout = () => {
    clearLocalStationLayout();
    if (isUiStateRemoteEnabled()) {
        void clearRemoteUiState('station-layout');
    }
};

const loadExternalGraphLinks = (): ExternalGraphLink[] => {
    hydrateExternalGraphLinksFromRemote();
    return loadLocalExternalGraphLinks();
};

const emitExternalLinksChanged = (links: ExternalGraphLink[]) => {
    eventBus.emit(EVENTS.EXTERNAL_GRAPH_LINKS_CHANGED, { links });
};

const saveExternalGraphLinks = (links: ExternalGraphLink[]) => {
    const normalized = normalizeExternalGraphLinks(links);
    saveLocalExternalGraphLinks(normalized);
    if (isUiStateRemoteEnabled()) {
        void writeRemoteUiStateKey(REMOTE_EXTERNAL_GRAPH_LINKS_KEY, normalized);
    }
    emitExternalLinksChanged(normalized);
    return normalized;
};

const clearExternalGraphLinks = () => {
    clearLocalExternalGraphLinks();
    if (isUiStateRemoteEnabled()) {
        void clearRemoteUiStateKey(REMOTE_EXTERNAL_GRAPH_LINKS_KEY);
    }
    emitExternalLinksChanged([]);
};

const upsertExternalGraphLink = (
    target: ExternalGraphRoute,
    options: { label?: string; visibility?: ExternalGraphLinkVisibility } = {}
): { link: ExternalGraphLink; created: boolean; links: ExternalGraphLink[] } => {
    const links = loadExternalGraphLinks();
    const now = Date.now();
    const key = routeKey(target);
    const existing = links.find(link => routeKey(link.target) === key);

    if (existing) {
        const updated: ExternalGraphLink = {
            ...existing,
            label: options.label?.trim() || existing.label,
            visibility: options.visibility ?? existing.visibility,
            updatedAt: now
        };
        const next = links.map(link => (link.id === existing.id ? updated : link));
        return { link: updated, created: false, links: saveExternalGraphLinks(next) };
    }

    const link: ExternalGraphLink = {
        id: crypto.randomUUID(),
        label: options.label?.trim() || buildDefaultLinkLabel(target),
        target,
        visibility: options.visibility ?? 'private',
        createdAt: now,
        updatedAt: now
    };
    const next = [link, ...links];
    return { link, created: true, links: saveExternalGraphLinks(next) };
};

const removeExternalGraphLink = (id: string): ExternalGraphLink[] => {
    const links = loadExternalGraphLinks();
    const next = links.filter(link => link.id !== id);
    return saveExternalGraphLinks(next);
};

const touchExternalGraphLink = (id: string): ExternalGraphLink | null => {
    const links = loadExternalGraphLinks();
    const current = links.find(link => link.id === id);
    if (!current) return null;
    const now = Date.now();
    const updated: ExternalGraphLink = {
        ...current,
        lastOpenedAt: now,
        updatedAt: now
    };
    const next = links.map(link => (link.id === id ? updated : link));
    saveExternalGraphLinks(next);
    return updated;
};

export const stationStorage = {
    loadStationLayout,
    saveStationLayout,
    clearStationLayout,
    loadExternalGraphLinks,
    saveExternalGraphLinks,
    clearExternalGraphLinks,
    upsertExternalGraphLink,
    removeExternalGraphLink,
    touchExternalGraphLink
};
