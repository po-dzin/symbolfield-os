/**
 * UndoManager.js
 * Minimal undo/redo for graph mutations.
 */

import { eventBus, EVENTS, type AnyBusEvent } from '../events/EventBus';
import { graphEngine } from '../graph/GraphEngine';
import type { Edge, NodeBase } from '../types';

const cloneNode = (node: NodeBase) => ({
    id: node.id,
    type: node.type,
    position: { ...node.position },
    data: { ...node.data },
    style: { ...(node.style || {}) },
    meta: { ...(node.meta || {}) },
    created_at: node.created_at,
    updated_at: node.updated_at
});

interface UndoCommand {
    undo: () => void;
    redo: () => void;
}

export class UndoManager {
    private undoStack: UndoCommand[];
    private redoStack: UndoCommand[];
    private isApplying: boolean;

    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this.isApplying = false;
    }

    push(command: UndoCommand) {
        this.undoStack.push(command);
        this.redoStack = [];
    }

    undo() {
        const cmd = this.undoStack.pop();
        if (!cmd) return;
        this.isApplying = true;
        try {
            cmd.undo();
            this.redoStack.push(cmd);
        } finally {
            this.isApplying = false;
        }
    }

    redo() {
        const cmd = this.redoStack.pop();
        if (!cmd) return;
        this.isApplying = true;
        try {
            cmd.redo();
            this.undoStack.push(cmd);
        } finally {
            this.isApplying = false;
        }
    }

    handleEvent(e: AnyBusEvent) {
        if (this.isApplying) return;

        switch (e.type) {
            case EVENTS.NODE_CREATED: {
                const node = cloneNode(e.payload);
                this.push({
                    undo: () => graphEngine.removeNode(node.id),
                    redo: () => graphEngine.addNode({ ...node, type: node.type ?? 'node' })
                });
                break;
            }
            case EVENTS.NODE_DELETED: {
                if (!e.payload.node) return;
                const node = cloneNode(e.payload.node);
                const edges = e.payload.edges || [];
                this.push({
                    undo: () => {
                        graphEngine.addNode({ ...node, type: node.type ?? 'node' });
                        edges.forEach(edge => {
                            graphEngine.addEdge(edge.source, edge.target, edge.type, edge.id);
                        });
                    },
                    redo: () => graphEngine.removeNode(node.id)
                });
                break;
            }
            case EVENTS.NODE_UPDATED: {
                const before = cloneNode(e.payload.before);
                const after = cloneNode(e.payload.after);
                this.push({
                    undo: () => graphEngine.updateNode(before.id, {
                        position: before.position,
                        data: before.data,
                        style: before.style,
                        meta: before.meta
                    }),
                    redo: () => graphEngine.updateNode(after.id, {
                        position: after.position,
                        data: after.data,
                        style: after.style,
                        meta: after.meta
                    })
                });
                break;
            }
            case EVENTS.LINK_CREATED: {
                const edge = { ...e.payload };
                this.push({
                    undo: () => graphEngine.removeEdge(edge.id),
                    redo: () => graphEngine.addEdge(edge.source, edge.target, edge.type, edge.id)
                });
                break;
            }
            case EVENTS.LINK_DELETED: {
                if (!e.payload.edge) return;
                const edge = { ...e.payload.edge };
                this.push({
                    undo: () => graphEngine.addEdge(edge.source, edge.target, edge.type, edge.id),
                    redo: () => graphEngine.removeEdge(edge.id)
                });
                break;
            }
        }
    }
}

export const initUndoManager = () => {
    const manager = new UndoManager();
    const unsubAll = [
        eventBus.on(EVENTS.NODE_CREATED, (e) => manager.handleEvent(e)),
        eventBus.on(EVENTS.NODE_DELETED, (e) => manager.handleEvent(e)),
        eventBus.on(EVENTS.NODE_UPDATED, (e) => manager.handleEvent(e)),
        eventBus.on(EVENTS.LINK_CREATED, (e) => manager.handleEvent(e)),
        eventBus.on(EVENTS.LINK_DELETED, (e) => manager.handleEvent(e)),
        eventBus.on('GRAPH_UNDO', () => manager.undo()),
        eventBus.on('GRAPH_REDO', () => manager.redo())
    ];

    return () => {
        unsubAll.forEach(unsub => unsub());
    };
};
