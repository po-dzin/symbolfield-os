import { graphEngine } from '../graph/GraphEngine';
import { stateEngine } from './StateEngine';
import { eventBus, EVENTS } from '../events/EventBus';
import { PLAYGROUND_EDGES, PLAYGROUND_NODES, PLAYGROUND_SPACE_ID } from '../defaults/playgroundContent';
import { asNodeId, type Edge, type NodeBase } from '../types';
import { useCameraStore } from '../../store/useCameraStore';
import { ARCHECORE_ID, getCoreId, getCoreLabel } from '../defaults/coreIds';
import {
    clearRemoteUiStateKey,
    isUiStateRemoteEnabled,
    readRemoteUiStateKey,
    writeRemoteUiStateKey
} from '../data/uiStateRemote';

export interface SpaceMeta {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    lastAccessedAt: number;
    coreNodeId?: string;
    gridSnapEnabled?: boolean;
    parentSpaceId?: string;
    kind?: 'user' | 'playground';
    favorite?: boolean;
    trashed?: boolean;
    deletedAt?: number | null;
    description?: string;
}

export interface SpaceData {
    spaceId?: string; // Optional for legacy
    nodes: NodeBase[];
    edges: Edge[];
    clusters?: Record<string, any>; // Future proofing
    version?: number;
}

const STORAGE_KEYS = {
    SPACES_INDEX: 'sf_spaces_index',
    ACTIVE_SPACE: 'sf_active_space',
    SPACE_PREFIX: 'sf_space_'
};

const REMOTE_KEYS = {
    SPACES_INDEX: 'spaces-index',
    ACTIVE_SPACE: 'active-space',
    SPACE_DATA_PREFIX: 'space-data:'
} as const;

const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const getRemoteSpaceDataKey = (spaceId: string): string => `${REMOTE_KEYS.SPACE_DATA_PREFIX}${spaceId}`;

const toFiniteNumber = (value: unknown, fallback: number): number => (
    typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

const normalizeSpaceMetaList = (input: unknown): SpaceMeta[] => {
    if (!Array.isArray(input)) return [];
    const now = Date.now();
    const next: SpaceMeta[] = [];
    input.forEach((item) => {
        if (!item || typeof item !== 'object') return;
        const raw = item as Record<string, unknown>;
        const id = typeof raw.id === 'string' ? raw.id.trim() : '';
        if (!id) return;
        const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Untitled Space';
        const meta: SpaceMeta = {
            id,
            name,
            createdAt: toFiniteNumber(raw.createdAt, now),
            updatedAt: toFiniteNumber(raw.updatedAt, now),
            lastAccessedAt: toFiniteNumber(raw.lastAccessedAt, now)
        };
        if (typeof raw.coreNodeId === 'string' && raw.coreNodeId.trim()) meta.coreNodeId = raw.coreNodeId;
        if (typeof raw.gridSnapEnabled === 'boolean') meta.gridSnapEnabled = raw.gridSnapEnabled;
        if (typeof raw.parentSpaceId === 'string' && raw.parentSpaceId.trim()) meta.parentSpaceId = raw.parentSpaceId;
        if (raw.kind === 'user' || raw.kind === 'playground') meta.kind = raw.kind;
        if (typeof raw.favorite === 'boolean') meta.favorite = raw.favorite;
        if (typeof raw.trashed === 'boolean') meta.trashed = raw.trashed;
        const deletedAt = raw.deletedAt;
        if (deletedAt === null || (typeof deletedAt === 'number' && Number.isFinite(deletedAt))) {
            meta.deletedAt = deletedAt;
        }
        if (typeof raw.description === 'string') meta.description = raw.description;
        next.push(meta);
    });
    return next;
};

const normalizeSpaceDataPayload = (
    input: unknown,
    fallbackId: string
): { spaceId: string; nodes: NodeBase[]; edges: Edge[] } | null => {
    if (!input || typeof input !== 'object') return null;
    const raw = input as Record<string, unknown>;
    const nodes = Array.isArray(raw.nodes) ? (raw.nodes as NodeBase[]) : [];
    const edges = Array.isArray(raw.edges) ? (raw.edges as Edge[]) : [];
    const spaceId = typeof raw.spaceId === 'string' && raw.spaceId.trim() ? raw.spaceId : fallbackId;
    return { spaceId, nodes, edges };
};

class SpaceManager {
    private spaces: Map<string, SpaceMeta>;
    private saveTimer: number | null;
    private interactionDepth: number;
    private remoteWriteTimers: Map<string, number>;

    constructor() {
        this.spaces = new Map();
        this.saveTimer = null;
        this.interactionDepth = 0;
        this.remoteWriteTimers = new Map();
        this.loadIndex(); // Load metadata
        this.hydrateIndexFromRemote();
        this.purgeTrashedSpaces();

        // Subscribe to changes for auto-persistence
        eventBus.on(EVENTS.NODE_CREATED, () => this.scheduleSave());
        eventBus.on(EVENTS.NODE_UPDATED, () => this.scheduleSave()); // NB: UpdateNode might be frequent during drag
        eventBus.on(EVENTS.NODE_DELETED, () => this.scheduleSave());
        eventBus.on(EVENTS.LINK_CREATED, () => this.scheduleSave());
        eventBus.on(EVENTS.LINK_DELETED, () => this.scheduleSave());
        eventBus.on(EVENTS.CLUSTER_CREATED, () => this.scheduleSave());
        eventBus.on(EVENTS.GRAPH_CLEARED, () => this.scheduleSave());
        eventBus.on('UI_INTERACTION_START', (e) => {
            if (e.payload?.type === 'LINK_DRAG') {
                this.interactionDepth += 1;
            }
        });
        eventBus.on('UI_INTERACTION_END', (e) => {
            if (e.payload?.type === 'LINK_DRAG') {
                this.interactionDepth = Math.max(0, this.interactionDepth - 1);
                this.scheduleSave(200);
            }
        });
    }

    private loadIndex() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.SPACES_INDEX);
            if (raw) {
                const list = JSON.parse(raw) as SpaceMeta[];
                list.forEach(s => {
                    if ((s as any).kind === 'sandbox') s.kind = 'playground';
                    this.spaces.set(s.id, s);
                });
            }
        } catch (e) {
            console.error('Failed to load space index', e);
        }
    }

    private hydrateIndexFromRemote() {
        if (!isUiStateRemoteEnabled()) return;
        if (this.spaces.size > 0) return;
        void (async () => {
            const payload = await readRemoteUiStateKey(REMOTE_KEYS.SPACES_INDEX);
            const list = normalizeSpaceMetaList(payload);
            if (!list.length) return;
            list.forEach((space) => {
                this.spaces.set(space.id, space);
            });
            this.saveIndex();

            const activePayload = await readRemoteUiStateKey(REMOTE_KEYS.ACTIVE_SPACE);
            const activeSpaceId = typeof activePayload === 'string' ? activePayload.trim() : '';
            if (activeSpaceId && this.spaces.has(activeSpaceId)) {
                localStorage.setItem(STORAGE_KEYS.ACTIVE_SPACE, activeSpaceId);
            }
        })();
    }

    private scheduleRemoteWrite(key: string, payload: unknown, delayMs = 320) {
        if (!isUiStateRemoteEnabled()) return;
        const existingTimer = this.remoteWriteTimers.get(key);
        if (existingTimer) window.clearTimeout(existingTimer);
        const timer = window.setTimeout(() => {
            this.remoteWriteTimers.delete(key);
            void writeRemoteUiStateKey(key, payload);
        }, delayMs);
        this.remoteWriteTimers.set(key, timer);
    }

    private scheduleRemoteClear(key: string, delayMs = 80) {
        if (!isUiStateRemoteEnabled()) return;
        const existingTimer = this.remoteWriteTimers.get(key);
        if (existingTimer) window.clearTimeout(existingTimer);
        const timer = window.setTimeout(() => {
            this.remoteWriteTimers.delete(key);
            void clearRemoteUiStateKey(key);
        }, delayMs);
        this.remoteWriteTimers.set(key, timer);
    }

    private saveIndex() {
        try {
            const list = Array.from(this.spaces.values());
            localStorage.setItem(STORAGE_KEYS.SPACES_INDEX, JSON.stringify(list));
            this.scheduleRemoteWrite(REMOTE_KEYS.SPACES_INDEX, list, 120);
        } catch (e) {
            console.error('Failed to save space index', e);
        }
    }

    getSpaces(): SpaceMeta[] {
        return Array.from(this.spaces.values())
            .filter(space => !space.trashed)
            .sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
    }

    getSpaceMeta(id: string) {
        return this.spaces.get(id);
    }

    getSpacesWithOptions(options: { includeTrashed?: boolean; includePlayground?: boolean } = {}): SpaceMeta[] {
        const { includeTrashed = false, includePlayground = true } = options;
        return Array.from(this.spaces.values())
            .filter(space => (includeTrashed || !space.trashed))
            .filter(space => (includePlayground || space.kind !== 'playground'))
            .sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
    }

    getPlaygroundSpace() {
        return this.spaces.get(PLAYGROUND_SPACE_ID);
    }

    private generateUniqueName(baseName: string, excludeId?: string): string {
        const names = new Set(
            Array.from(this.spaces.values())
                .filter(s => s.id !== excludeId)
                .map(s => s.name.toLowerCase())
        );

        let candidate = baseName;
        let counter = 1;
        while (names.has(candidate.toLowerCase())) {
            candidate = `${baseName} ${counter}`;
            counter++;
        }
        return candidate;
    }

    private buildCoreNode(spaceId: string, spaceName: string, coreNodeId = getCoreId(spaceId)): NodeBase {
        const now = Date.now();
        return {
            id: asNodeId(coreNodeId),
            type: 'core',
            position: { x: 0, y: 0 },
            data: { label: getCoreLabel(spaceName) },
            style: {},
            meta: { spaceId, role: 'core' },
            created_at: now,
            updated_at: now
        };
    }

    createSpace(name = 'New Space', parentId = ARCHECORE_ID, options: { id?: string; kind?: 'user' | 'playground' } = {}): string {
        const id = options.id ?? crypto.randomUUID();
        const existing = this.spaces.get(id);
        if (existing) return existing.id;
        const uniqueName = options.kind === 'playground' ? name : this.generateUniqueName(name);
        const now = Date.now();
        const coreNodeId = getCoreId(id);
        const space: SpaceMeta = {
            id,
            name: uniqueName,
            createdAt: now,
            updatedAt: now,
            lastAccessedAt: now,
            coreNodeId,
            gridSnapEnabled: true,
            parentSpaceId: parentId,
            kind: options.kind ?? 'user',
            trashed: false,
            deletedAt: null
        };
        this.spaces.set(id, space);
        this.saveIndex();

        // Initialize empty storage for this space; core is created from Source.
        localStorage.setItem(
            STORAGE_KEYS.SPACE_PREFIX + id,
            JSON.stringify({ spaceId: id, nodes: [], edges: [] })
        );
        this.scheduleRemoteWrite(getRemoteSpaceDataKey(id), { spaceId: id, nodes: [], edges: [] }, 120);
        eventBus.emit(EVENTS.SPACE_CREATED, { spaceId: id, name: uniqueName, kind: space.kind || 'user' });

        return id;
    }

    forkSpace(data: SpaceData, baseName: string): string {
        const id = crypto.randomUUID();
        const uniqueName = this.generateUniqueName(baseName);
        const now = Date.now();
        const expectedCoreId = getCoreId(id);

        const space: SpaceMeta = {
            id,
            name: uniqueName,
            createdAt: now,
            updatedAt: now,
            lastAccessedAt: now,
            coreNodeId: expectedCoreId,
            gridSnapEnabled: true,
            parentSpaceId: ARCHECORE_ID,
            kind: 'user',
            trashed: false,
            deletedAt: null,
            description: `Forked from Vitrine`
        };

        this.spaces.set(id, space);
        this.saveIndex();

        // Prepare data
        // We need to ensure the core node exists and has the correct ID for this new space
        let nodes = data.nodes || [];
        let edges = data.edges || [];

        // If the snapshot has its own core node, we might need to adapt it
        // For simplicity in v0.5, we just dump the data as is, but we update the spaceId in meta
        nodes = nodes.map(n => ({
            ...n,
            meta: { ...n.meta, spaceId: id }
        }));

        localStorage.setItem(
            STORAGE_KEYS.SPACE_PREFIX + id,
            JSON.stringify({ spaceId: id, nodes, edges })
        );
        this.scheduleRemoteWrite(getRemoteSpaceDataKey(id), { spaceId: id, nodes, edges }, 120);

        eventBus.emit(EVENTS.SPACE_CREATED, { spaceId: id, name: uniqueName, kind: 'user' });
        return id;
    }

    renameSpace(id: string, name: string): string {
        const meta = this.spaces.get(id);
        if (meta) {
            const uniqueName = this.generateUniqueName(name, id);
            meta.name = uniqueName;
            meta.updatedAt = Date.now();
            this.saveIndex();
            // Emit update
            eventBus.emit('UI_SIGNAL', { type: 'SPACE_RENAMED', id, x: 0, y: 0 });
            eventBus.emit(EVENTS.SPACE_RENAMED, { spaceId: id, name: uniqueName });
            return uniqueName;
        }
        return name;
    }

    toggleFavorite(id: string) {
        const meta = this.spaces.get(id);
        if (!meta) return;
        meta.favorite = !meta.favorite;
        meta.updatedAt = Date.now();
        this.saveIndex();
    }

    softDeleteSpace(id: string) {
        const meta = this.spaces.get(id);
        if (!meta || meta.trashed) return;
        meta.trashed = true;
        meta.deletedAt = Date.now();
        meta.updatedAt = Date.now();
        this.saveIndex();
        if (stateEngine.getState().currentSpaceId === id) {
            stateEngine.setViewContext('home');
        }
        eventBus.emit('UI_SIGNAL', { type: 'SPACE_DELETED', id, x: 0, y: 0 });
        eventBus.emit(EVENTS.SPACE_DELETED, { spaceId: id, deletedAt: meta.deletedAt });
    }

    deleteSpace(id: string) {
        this.hardDeleteSpace(id);
    }

    setGridSnapEnabled(id: string, enabled: boolean) {
        const meta = this.spaces.get(id);
        if (!meta) {
            stateEngine.setGridSnapEnabled(enabled);
            return;
        }
        if (meta.gridSnapEnabled === enabled) {
            if (stateEngine.getState().currentSpaceId === id) {
                stateEngine.setGridSnapEnabled(enabled);
            }
            return;
        }
        meta.gridSnapEnabled = enabled;
        meta.updatedAt = Date.now();
        this.saveIndex();
        if (stateEngine.getState().currentSpaceId === id) {
            stateEngine.setGridSnapEnabled(enabled);
        }
    }

    restoreSpace(id: string) {
        const meta = this.spaces.get(id);
        if (!meta || !meta.trashed) return;
        meta.trashed = false;
        meta.deletedAt = null;
        meta.updatedAt = Date.now();
        this.saveIndex();
    }

    private hardDeleteSpace(id: string) {
        if (this.spaces.has(id)) {
            this.spaces.delete(id);
            this.saveIndex();
            localStorage.removeItem(STORAGE_KEYS.SPACE_PREFIX + id);
            this.scheduleRemoteClear(getRemoteSpaceDataKey(id));
        }
    }

    /**
     * loadSpace(id): Saves current graph first, then loads new space.
     */
    async loadSpace(id: string) {
        const currentId = stateEngine.getState().currentSpaceId;
        const meta = this.spaces.get(id);
        if (meta?.trashed) return;
        if (meta && meta.gridSnapEnabled === undefined) {
            meta.gridSnapEnabled = true;
            this.saveIndex();
        }
        stateEngine.setGridSnapEnabled(meta?.gridSnapEnabled ?? true);

        // 1. Save current if exists
        if (currentId && this.spaces.has(currentId)) {
            this.saveSpaceInternal(currentId);
        }

        // 2. Load new
        // Reset camera per-space to baseline; CanvasView will center using its own rect.
        useCameraStore.getState().reset();

        stateEngine.setSpace(id);
        localStorage.setItem(STORAGE_KEYS.ACTIVE_SPACE, id);
        this.scheduleRemoteWrite(REMOTE_KEYS.ACTIVE_SPACE, id, 80);

        let data: { spaceId?: string; nodes: NodeBase[]; edges: Edge[] } = { spaceId: id, nodes: [], edges: [] };
        let raw = localStorage.getItem(STORAGE_KEYS.SPACE_PREFIX + id);
        if (!raw && isUiStateRemoteEnabled()) {
            const remote = await readRemoteUiStateKey(getRemoteSpaceDataKey(id));
            const normalizedRemote = normalizeSpaceDataPayload(remote, id);
            if (normalizedRemote) {
                data = normalizedRemote;
                localStorage.setItem(STORAGE_KEYS.SPACE_PREFIX + id, JSON.stringify(normalizedRemote));
                raw = JSON.stringify(normalizedRemote);
            }
        }
        if (raw) {
            try {
                data = JSON.parse(raw);
            } catch (e) {
                console.error(`Failed to load space ${id}`, e);
                localStorage.setItem(STORAGE_KEYS.SPACE_PREFIX + id, JSON.stringify(data));
            }
        }

        if (data.spaceId && data.spaceId !== id) {
            data = { spaceId: id, nodes: [], edges: [] };
            localStorage.setItem(STORAGE_KEYS.SPACE_PREFIX + id, JSON.stringify(data));
        }

        const isPlaygroundContaminated = meta?.kind !== 'playground'
            && Array.isArray(data?.nodes)
            && data.nodes.some((node: NodeBase) => String(node.id).startsWith('playground'));
        if (isPlaygroundContaminated) {
            data = { spaceId: id, nodes: [], edges: [] };
            localStorage.setItem(STORAGE_KEYS.SPACE_PREFIX + id, JSON.stringify(data));
        }

        const expectedCoreId = getCoreId(id);
        let nodes = data.nodes ?? [];
        let edges = data.edges ?? [];
        const coreNodes = nodes.filter(node => node.type === 'core');
        const coreCandidate = coreNodes.find(node => String(node.id) !== ARCHECORE_ID) ?? coreNodes[0];
        let storageChanged = false;

        // Migrate legacy core ids to the space-tied `${spaceId}-core` scheme.
        if (coreCandidate && String(coreCandidate.id) !== expectedCoreId) {
            const oldCoreId = String(coreCandidate.id);
            const migratedCore: NodeBase = {
                ...coreCandidate,
                id: asNodeId(expectedCoreId),
                type: 'core',
                data: {
                    ...coreCandidate.data,
                    label: coreCandidate.data?.label ?? getCoreLabel(meta?.name ?? 'Space')
                },
                meta: {
                    ...coreCandidate.meta,
                    spaceId: id,
                    role: 'core'
                },
                updated_at: Date.now()
            };
            nodes = nodes.map(node => (String(node.id) === oldCoreId ? migratedCore : node));
            edges = edges.map(edge => ({
                ...edge,
                source: String(edge.source) === oldCoreId ? asNodeId(expectedCoreId) : edge.source,
                target: String(edge.target) === oldCoreId ? asNodeId(expectedCoreId) : edge.target
            }));
            storageChanged = true;
        }

        const hasExpectedCore = nodes.some(node => node.type === 'core' && String(node.id) === expectedCoreId);
        let indexChanged = false;

        if (!hasExpectedCore && nodes.length > 0) {
            const coreNode = this.buildCoreNode(id, meta?.name ?? 'Space', expectedCoreId);
            nodes = [...nodes, coreNode];
            storageChanged = true;
        }

        if (meta && meta.coreNodeId !== expectedCoreId) {
            meta.coreNodeId = expectedCoreId;
            indexChanged = true;
        }

        if (storageChanged) {
            data = { ...data, nodes, edges };
            localStorage.setItem(STORAGE_KEYS.SPACE_PREFIX + id, JSON.stringify(data));
            this.scheduleRemoteWrite(getRemoteSpaceDataKey(id), data, 120);
        }

        if (indexChanged) {
            this.saveIndex();
        }

        graphEngine.importData({ nodes: (data.nodes ?? []) as any, edges: (data.edges ?? []) as any });

        // Update access time
        if (meta) {
            meta.lastAccessedAt = Date.now();
            this.saveIndex();
        }
    }

    /**
     * Saves the current in-memory graph to the specified space ID storage
     */
    saveCurrentSpace() {
        const currentId = stateEngine.getState().currentSpaceId;
        if (currentId) {
            this.saveSpaceInternal(currentId);
        }
    }

    private scheduleSave(delayMs = 120) {
        if (this.interactionDepth > 0) return;
        if (this.saveTimer) {
            window.clearTimeout(this.saveTimer);
        }
        this.saveTimer = window.setTimeout(() => {
            this.saveTimer = null;
            this.saveCurrentSpace();
        }, delayMs);
    }

    private saveSpaceInternal(id: string) {
        const data = graphEngine.exportData();
        const payload = { spaceId: id, ...data };
        localStorage.setItem(STORAGE_KEYS.SPACE_PREFIX + id, JSON.stringify(payload));
        this.scheduleRemoteWrite(getRemoteSpaceDataKey(id), payload);

        const meta = this.spaces.get(id);
        if (meta) {
            meta.updatedAt = Date.now();
            this.saveIndex(); // Debounce this?
        }
    }

    getSpaceData(id: string) {
        const raw = localStorage.getItem(STORAGE_KEYS.SPACE_PREFIX + id);
        if (!raw) return null;
        try {
            const parsed = JSON.parse(raw) as { spaceId?: string; nodes: NodeBase[]; edges: Edge[] };
            return { nodes: parsed.nodes ?? [], edges: parsed.edges ?? [] };
        } catch {
            return null;
        }
    }

    ensureOnboardingSpaces() {
        const legacySandbox = this.spaces.get('sandbox');
        const playgroundMeta = this.getPlaygroundSpace();
        if (legacySandbox && !playgroundMeta) {
            const legacyData = this.getSpaceData(legacySandbox.id);
            this.createSpace('Playground', ARCHECORE_ID, { id: PLAYGROUND_SPACE_ID, kind: 'playground' });
            if (legacyData) {
                localStorage.setItem(STORAGE_KEYS.SPACE_PREFIX + PLAYGROUND_SPACE_ID, JSON.stringify(legacyData));
            } else {
                this.seedPlaygroundSpace();
            }
            this.hardDeleteSpace(legacySandbox.id);
            return;
        }
        if (!playgroundMeta) {
            this.createSpace('Playground', ARCHECORE_ID, { id: PLAYGROUND_SPACE_ID, kind: 'playground' });
            this.seedPlaygroundSpace();
            return;
        }
        if (playgroundMeta.trashed) {
            playgroundMeta.trashed = false;
            this.saveIndex();
        }
        if (!playgroundMeta.kind) {
            playgroundMeta.kind = 'playground';
            this.saveIndex();
        }
        const data = this.getSpaceData(playgroundMeta.id);
        if (!data || !data.nodes?.length) {
            this.seedPlaygroundSpace();
        }
    }

    seedPlaygroundSpace() {
        const now = Date.now();
        const nodes = PLAYGROUND_NODES.map(nodeDef => ({
            id: nodeDef.id,
            type: nodeDef.type,
            position: nodeDef.position,
            data: {
                label: nodeDef.label,
                icon_value: nodeDef.icon_value,
                icon_source: nodeDef.icon_source,
                content: nodeDef.content
            },
            style: {},
            meta: {},
            created_at: now,
            updated_at: now
        }));
        const edges = PLAYGROUND_EDGES.map(edgeDef => ({
            id: crypto.randomUUID(),
            source: edgeDef.from,
            target: edgeDef.to,
            type: 'default'
        }));
        localStorage.setItem(
            STORAGE_KEYS.SPACE_PREFIX + PLAYGROUND_SPACE_ID,
            JSON.stringify({ spaceId: PLAYGROUND_SPACE_ID, nodes, edges })
        );
        this.scheduleRemoteWrite(
            getRemoteSpaceDataKey(PLAYGROUND_SPACE_ID),
            { spaceId: PLAYGROUND_SPACE_ID, nodes, edges },
            120
        );
    }

    purgeTrashedSpaces() {
        const now = Date.now();
        Array.from(this.spaces.values()).forEach(space => {
            if (!space.trashed || !space.deletedAt) return;
            if ((now - space.deletedAt) > TRASH_RETENTION_MS) {
                this.hardDeleteSpace(space.id);
            }
        });
    }
}

export const spaceManager = new SpaceManager();
