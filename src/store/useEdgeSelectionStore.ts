/**
 * useEdgeSelectionStore.js
 * Tracks selected edges for UI highlighting.
 */

import { create } from 'zustand';

interface EdgeSelectionState {
    selectedEdgeIds: string[];
    primaryEdgeId: string | null;
    hoverEdgeId: string | null;
    select: (id: string, multi?: boolean) => void;
    toggle: (id: string) => void;
    setHover: (id: string | null) => void;
    setSelection: (ids: string[]) => void;
    clear: () => void;
}

export const useEdgeSelectionStore = create<EdgeSelectionState>((set, get) => ({
    selectedEdgeIds: [],
    primaryEdgeId: null,
    hoverEdgeId: null,

    select: (id, multi = false) => {
        if (!id) return;
        if (!multi) {
            set({ selectedEdgeIds: [id], primaryEdgeId: id });
            return;
        }
        const current = new Set(get().selectedEdgeIds);
        current.add(id);
        set({ selectedEdgeIds: Array.from(current), primaryEdgeId: id });
    },

    toggle: (id) => {
        const current = new Set(get().selectedEdgeIds);
        if (current.has(id)) current.delete(id);
        else current.add(id);
        const next = Array.from(current);
        set({ selectedEdgeIds: next, primaryEdgeId: next.length ? (next[next.length - 1] ?? null) : null });
    },

    setHover: (id) => set({ hoverEdgeId: id }),

    setSelection: (ids) => set({ selectedEdgeIds: ids, primaryEdgeId: ids.length > 0 ? ids[ids.length - 1]! : null }),

    clear: () => set({ selectedEdgeIds: [], primaryEdgeId: null, hoverEdgeId: null })
}));
