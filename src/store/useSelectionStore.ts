/**
 * useSelectionStore.ts
 * React binding for SelectionState.
 */

import { create } from 'zustand';
import { selectionState } from '../core/state/SelectionState';
import { eventBus, EVENTS } from '../core/events/EventBus';
import type { NodeId } from '../core/types';

interface SelectionPayload {
    selection: NodeId[];
    primary: NodeId | null;
}

interface SelectionStoreState {
    selectedIds: NodeId[];
    primaryId: NodeId | null;
    select: (id: NodeId, multi?: boolean) => void;
    toggle: (id: NodeId) => void;
    clear: () => void;
}

export const useSelectionStore = create<SelectionStoreState>((set) => {

    const sync = (payload: SelectionPayload) => {
        set({
            selectedIds: payload.selection,
            primaryId: payload.primary
        });
    };

    eventBus.on(EVENTS.SELECTION_CHANGED, (e) => sync(e.payload));
    eventBus.on(EVENTS.SPACE_CHANGED, () => {
        selectionState.clear();
        set({ selectedIds: [], primaryId: null });
    });

    return {
        selectedIds: [],
        primaryId: null,

        // Actions
        select: (id: NodeId, multi?: boolean) => selectionState.select(id, multi),
        toggle: (id: NodeId) => selectionState.toggle(id),
        clear: () => selectionState.clear()
    };
});
