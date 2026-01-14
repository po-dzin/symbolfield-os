import { graphEngine } from '../graph/GraphEngine';
import { stateEngine } from './StateEngine';
import { eventBus, EVENTS } from '../events/EventBus';
import { PLAYGROUND_EDGES, PLAYGROUND_NODES, PLAYGROUND_SPACE_ID } from '../defaults/playgroundContent';
import type { Edge, NodeBase } from '../types';
import { useCameraStore } from '../../store/useCameraStore';

export interface SpaceMeta {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    lastAccessedAt: number;
    parentSpaceId?: string;
    kind?: 'user' | 'playground';
    trashed?: boolean;
    deletedAt?: number | null;
}

const STORAGE_KEYS = {
    SPACES_INDEX: 'sf_spaces_index',
    ACTIVE_SPACE: 'sf_active_space',
    SPACE_PREFIX: 'sf_space_'
};

const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

class SpaceManager {
    private spaces: Map<string, SpaceMeta>;

    constructor() {
        this.spaces = new Map();
        this.loadIndex(); // Load metadata
        this.purgeTrashedSpaces();

        // Subscribe to changes for auto-persistence
        eventBus.on(EVENTS.NODE_CREATED, () => this.saveCurrentSpace());
        eventBus.on(EVENTS.NODE_UPDATED, () => this.saveCurrentSpace()); // Note: UpdateNode might be frequent during drag
        eventBus.on(EVENTS.NODE_DELETED, () => this.saveCurrentSpace());
        eventBus.on(EVENTS.LINK_CREATED, () => this.saveCurrentSpace());
        eventBus.on(EVENTS.LINK_DELETED, () => this.saveCurrentSpace());
        eventBus.on(EVENTS.HUB_CREATED, () => this.saveCurrentSpace());
        eventBus.on(EVENTS.GRAPH_CLEARED, () => this.saveCurrentSpace());
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

    private saveIndex() {
        try {
            const list = Array.from(this.spaces.values());
            localStorage.setItem(STORAGE_KEYS.SPACES_INDEX, JSON.stringify(list));
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

    createSpace(name = 'New Space', parentId = 'archecore', options: { id?: string; kind?: 'user' | 'playground' } = {}): string {
        const id = options.id ?? crypto.randomUUID();
        const existing = this.spaces.get(id);
        if (existing) return existing.id;
        const uniqueName = options.kind === 'playground' ? name : this.generateUniqueName(name);
        const now = Date.now();
        const space: SpaceMeta = {
            id,
            name: uniqueName,
            createdAt: now,
            updatedAt: now,
            lastAccessedAt: now,
            parentSpaceId: parentId,
            kind: options.kind ?? 'user',
            trashed: false,
            deletedAt: null
        };
        this.spaces.set(id, space);
        this.saveIndex();

        // Initialize empty storage for this space
        localStorage.setItem(
            STORAGE_KEYS.SPACE_PREFIX + id,
            JSON.stringify({ spaceId: id, nodes: [], edges: [] })
        );
        eventBus.emit(EVENTS.SPACE_CREATED, { spaceId: id, name: uniqueName, kind: space.kind || 'user' });

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
        }
    }

    /**
     * loadSpace(id): Saves current graph first, then loads new space.
     */
    async loadSpace(id: string) {
        const currentId = stateEngine.getState().currentSpaceId;
        const meta = this.spaces.get(id);
        if (meta?.trashed) return;

        // 1. Save current if exists
        if (currentId && this.spaces.has(currentId)) {
            this.saveSpaceInternal(currentId);
        }

        // 2. Load new
        // Reset camera per-space to baseline before centering on origin
        const camera = useCameraStore.getState();
        camera.reset();
        camera.centerOn(0, 0, window.innerWidth, window.innerHeight);

        stateEngine.setSpace(id);
        localStorage.setItem(STORAGE_KEYS.ACTIVE_SPACE, id);

        let data: { spaceId?: string; nodes: NodeBase[]; edges: Edge[] } = { spaceId: id, nodes: [], edges: [] };
        const raw = localStorage.getItem(STORAGE_KEYS.SPACE_PREFIX + id);
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

    private saveSpaceInternal(id: string) {
        const data = graphEngine.exportData();
        localStorage.setItem(STORAGE_KEYS.SPACE_PREFIX + id, JSON.stringify({ spaceId: id, ...data }));

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
            this.createSpace('Playground', 'archecore', { id: PLAYGROUND_SPACE_ID, kind: 'playground' });
            if (legacyData) {
                localStorage.setItem(STORAGE_KEYS.SPACE_PREFIX + PLAYGROUND_SPACE_ID, JSON.stringify(legacyData));
            } else {
                this.seedPlaygroundSpace();
            }
            this.hardDeleteSpace(legacySandbox.id);
            return;
        }
        if (!playgroundMeta) {
            this.createSpace('Playground', 'archecore', { id: PLAYGROUND_SPACE_ID, kind: 'playground' });
            this.seedPlaygroundSpace();
            return;
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
