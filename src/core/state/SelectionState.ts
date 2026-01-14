/**
 * SelectionState.js
 * Manages which nodes/items are currently selected.
 * Separate from GraphEngine (data) and StateEngine (app mode).
 */

import { eventBus, EVENTS } from '../events/EventBus';
import { graphEngine } from '../graph/GraphEngine';
import type { NodeId } from '../types';

type SelectionMode = 'single' | 'multi' | 'box';

interface SelectionBounds {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

class SelectionState {
    private selectedIds: Set<NodeId>;
    private primaryId: NodeId | null;
    private mode: SelectionMode;
    private bounds: SelectionBounds | null;

    constructor() {
        this.selectedIds = new Set();
        this.primaryId = null; // Last selected, acts as anchor
        this.mode = 'single';
        this.bounds = null; // { x1, y1, x2, y2 }
    }

    calculateBounds() {
        if (this.selectedIds.size === 0) {
            this.bounds = null;
            return;
        }

        const nodes = Array.from(this.selectedIds)
            .map(id => graphEngine.getNode(id))
            .filter((node): node is NonNullable<ReturnType<typeof graphEngine.getNode>> => Boolean(node));

        if (nodes.length === 0) {
            this.bounds = null;
            return;
        }

        let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
        nodes.forEach(n => {
            x1 = Math.min(x1, n.position.x - 24);
            y1 = Math.min(y1, n.position.y - 24);
            x2 = Math.max(x2, n.position.x + 24);
            y2 = Math.max(y2, n.position.y + 24);
        });

        this.bounds = { x1, y1, x2, y2 };
    }

    select(id: NodeId, multi = false) {
        if (!id) {
            this.clear();
            return;
        }

        if (!multi) {
            this.selectedIds.clear();
            this.mode = 'single';
        } else {
            this.mode = 'multi';
        }

        this.selectedIds.add(id);
        this.primaryId = id;

        this.calculateBounds();
        this._emit();
    }

    toggle(id: NodeId) {
        if (this.selectedIds.has(id)) {
            this.selectedIds.delete(id);
            if (this.primaryId === id) {
                const iter = this.selectedIds.values();
                const next = iter.next();
                this.primaryId = next.done ? null : next.value;
            }
        } else {
            this.selectedIds.add(id);
            this.primaryId = id;
        }

        this.mode = this.selectedIds.size > 1 ? 'multi' : 'single';
        this.calculateBounds();
        this._emit();
    }

    clear() {
        if (this.selectedIds.size === 0) return;
        this.selectedIds.clear();
        this.primaryId = null;
        this.mode = 'single';
        this.bounds = null;
        this._emit();
    }

    setSelection(ids: Array<NodeId>, mode: SelectionMode = 'multi') {
        this.selectedIds = new Set(ids);
        this.primaryId = ids.length > 0 ? (ids[ids.length - 1] ?? null) : null;
        this.mode = mode;
        this.calculateBounds();
        this._emit();
    }

    // --- Queries ---

    isSelected(id: NodeId) {
        return this.selectedIds.has(id);
    }

    getSelection() {
        return Array.from(this.selectedIds);
    }

    isEmpty() {
        return this.selectedIds.size === 0;
    }

    count() {
        return this.selectedIds.size;
    }

    // --- Internal ---
    _emit() {
        eventBus.emit(EVENTS.SELECTION_CHANGED, {
            selection: Array.from(this.selectedIds),
            primary: this.primaryId,
            mode: this.mode,
            bounds: this.bounds
        });
    }
}

export const selectionState = new SelectionState();
