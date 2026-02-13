/**
 * useAreaStore.ts
 * Lightweight area overlays per space.
 */

import { create } from 'zustand';
import { eventBus, EVENTS } from '../core/events/EventBus';
import { stateEngine } from '../core/state/StateEngine';
import type { Area, AreaRect } from '../core/types';
import { adaptLegacyGraphColor } from '../core/ui/graphColorAdapt';

const STORAGE_PREFIX = 'sf_areas_';

const normalizeArea = (area: Area & { bounds?: { x: number; y: number; width: number; height: number }; name?: string }) => {
    let next = area as Area;
    if (!next.title && area.name) {
        next = { ...next, title: area.name };
    }
    if (!next.rect && area.bounds) {
        next = {
            ...next,
            rect: {
                x: area.bounds.x,
                y: area.bounds.y,
                w: area.bounds.width,
                h: area.bounds.height
            }
        } as Area;
    }
    if (!next.border) {
        next = { ...next, border: { width: 1.5, style: 'solid' } };
    }
    if (!next.anchor) {
        next = { ...next, anchor: { type: 'canvas' } };
    }
    if (!next.shape) {
        next = { ...next, shape: 'rect' };
    }
    if (next.shape === 'rect' && !next.rect && next.circle) {
        next = { ...next, shape: 'circle' };
    }
    next = {
        ...next,
        color: adaptLegacyGraphColor(next.color, 'var(--semantic-color-graph-node-fill)', true),
        borderColor: adaptLegacyGraphColor(next.borderColor, 'var(--semantic-color-graph-node-stroke)', true)
    };
    return next as Area;
};

const loadAreas = (spaceId: string | null) => {
    if (!spaceId) return [];
    const raw = localStorage.getItem(STORAGE_PREFIX + spaceId);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw) as Area[];
        return Array.isArray(parsed) ? parsed.map(normalizeArea) : [];
    } catch {
        return [];
    }
};

const saveAreas = (spaceId: string | null, areas: Area[]) => {
    if (!spaceId) return;
    localStorage.setItem(STORAGE_PREFIX + spaceId, JSON.stringify(areas));
};

const getNextAreaIndex = (areas: Area[]) => {
    const re = /^Area\s+(\d+)$/i;
    let max = 0;
    areas.forEach(area => {
        const title = typeof area.title === 'string' ? area.title.trim() : '';
        const match = title.match(re);
        if (match) max = Math.max(max, Number(match[1]));
    });
    return max + 1;
};

interface AreaStoreState {
    areas: Area[];
    selectedAreaId: string | null;
    selectedAreaIds: string[];
    focusedAreaId: string | null;
    setAreas: (areas: Area[]) => void;
    setSelectedAreaId: (id: string | null) => void;
    setSelectedAreaIds: (ids: string[]) => void;
    toggleSelectedArea: (id: string) => void;
    clearSelectedAreas: () => void;
    setFocusedAreaId: (id: string | null) => void;
    clearFocusedArea: () => void;
    addAreaRect: (rect: AreaRect, options?: { zIndex?: number }) => void;
    addAreaCircle: (circle: { cx: number; cy: number; r: number }) => void;
    addAreaFromHistory: (area: Area) => void;
    updateArea: (id: string, patch: Partial<Area>) => void;
    removeArea: (id: string) => void;
    clearRegions: () => void;
}

export const useAreaStore = create<AreaStoreState>((set, get) => {
    const syncToStorage = (areas: Area[]) => {
        saveAreas(stateEngine.getState().currentSpaceId, areas);
    };

    eventBus.on(EVENTS.SPACE_CHANGED, ({ payload }) => {
        const areas = loadAreas(payload.spaceId);
        set({ areas, selectedAreaId: null, selectedAreaIds: [] });
    });

    return {
        areas: loadAreas(stateEngine.getState().currentSpaceId),
        selectedAreaId: null,
        selectedAreaIds: [],
        focusedAreaId: null,

        setAreas: (areas) => {
            set({ areas });
            syncToStorage(areas);
        },
        setSelectedAreaId: (id) => set({ selectedAreaId: id, selectedAreaIds: id ? [id] : [] }),
        setSelectedAreaIds: (ids) => set({ selectedAreaIds: ids, selectedAreaId: ids[0] ?? null }),
        toggleSelectedArea: (id) => {
            const current = get().selectedAreaIds;
            const exists = current.includes(id);
            const next = exists ? current.filter(item => item !== id) : [...current, id];
            set({ selectedAreaIds: next, selectedAreaId: next[0] ?? null });
        },
        clearSelectedAreas: () => set({ selectedAreaId: null, selectedAreaIds: [] }),
        setFocusedAreaId: (id) => set({ focusedAreaId: id }),
        clearFocusedArea: () => set({ focusedAreaId: null }),

        addAreaRect: (rect, options) => {
            const now = Date.now();
            const nextIndex = getNextAreaIndex(get().areas);
            const zIndex = options?.zIndex ?? 0;
            const area: Area = {
                id: crypto.randomUUID(),
                title: `Area ${nextIndex}`,
                shape: 'rect',
                rect,
                anchor: { type: 'canvas' },
                color: 'var(--semantic-color-graph-node-fill)',
                borderColor: 'var(--semantic-color-graph-node-stroke)',
                opacity: 0.5,
                border: { width: 1.5, style: 'solid' },
                zIndex,
                locked: false,
                hitbox: 'border',
                created_at: now,
                updated_at: now
            };
            const next = [...get().areas, area];
            set({ areas: next, selectedAreaId: area.id, selectedAreaIds: [area.id] });
            syncToStorage(next);
            eventBus.emit(EVENTS.REGION_CREATED, { region: area });
        },
        addAreaCircle: (circle) => {
            const now = Date.now();
            const nextIndex = getNextAreaIndex(get().areas);
            const area: Area = {
                id: crypto.randomUUID(),
                title: `Area ${nextIndex}`,
                shape: 'circle',
                circle,
                anchor: { type: 'canvas' },
                color: 'var(--semantic-color-graph-node-fill)',
                borderColor: 'var(--semantic-color-graph-node-stroke)',
                opacity: 0.5,
                border: { width: 1.5, style: 'solid' },
                zIndex: 0,
                locked: false,
                hitbox: 'border',
                created_at: now,
                updated_at: now
            };
            const next = [...get().areas, area];
            set({ areas: next, selectedAreaId: area.id, selectedAreaIds: [area.id] });
            syncToStorage(next);
            eventBus.emit(EVENTS.REGION_CREATED, { region: area });
        },
        addAreaFromHistory: (area) => {
            const next = [...get().areas, area];
            set({ areas: next });
            syncToStorage(next);
        },

        updateArea: (id, patch) => {
            const before = get().areas.find(area => area.id === id);
            if (!before) return;
            const after = { ...before, ...patch, updated_at: Date.now() };
            const next = get().areas.map(area => (
                area.id === id ? after : area
            ));
            set({ areas: next });
            syncToStorage(next);
            eventBus.emit(EVENTS.REGION_UPDATED, { regionId: id, before, after });
        },

        removeArea: (id) => {
            const before = get().areas.find(area => area.id === id);
            if (!before) return;
            const next = get().areas.filter(area => area.id !== id);
            set({ areas: next, selectedAreaId: null, selectedAreaIds: [] });
            syncToStorage(next);
            eventBus.emit(EVENTS.REGION_DELETED, { region: before });
        },

        clearRegions: () => {
            set({ areas: [] });
            syncToStorage([]);
        }
    };
});
