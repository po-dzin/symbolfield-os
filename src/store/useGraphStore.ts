/**
 * useGraphStore.ts
 * React binding for GraphEngine.
 * Optimized to avoid full re-renders on every small change.
 */

import { create } from 'zustand';
import { graphEngine } from '../core/graph/GraphEngine';
import { eventBus, EVENTS } from '../core/events/EventBus';
import { asEdgeId, asNodeId } from '../core/types';
import type { NodeId, NodeBase, Edge, Position } from '../core/types';

// Input types for node creation (flexible)
interface CreateNodeInput {
    id?: string | undefined;
    type?: string;
    position: Position;
    data: Record<string, unknown>;
}

interface GraphStoreState {
    nodes: NodeBase[];
    edges: Edge[];
    version: number;
    addNode: (data: CreateNodeInput) => NodeBase;
    updateNode: (id: NodeId | string, patch: Partial<Omit<NodeBase, 'id'>>) => void;
    removeNode: (id: NodeId | string) => void;
    addEdge: (source: NodeId | string, target: NodeId | string) => Edge | undefined;
    removeEdge: (id: string) => void;
    clearGraph: () => void;
}

export const useGraphStore = create<GraphStoreState>((set) => {
    const toNodeId = (id: NodeId | string) => (typeof id === 'string' ? asNodeId(id) : id);

    // Internal sync helper
    const sync = () => {
        set({
            nodes: graphEngine.getNodes() as NodeBase[],
            edges: graphEngine.getEdges() as Edge[],
            version: Date.now() // Force re-render trigger
        });
    };

    // Listen to Domain Events
    eventBus.on(EVENTS.NODE_CREATED, sync);
    eventBus.on(EVENTS.NODE_UPDATED, sync); // Caution: High frequency?
    eventBus.on(EVENTS.NODE_DELETED, sync);
    eventBus.on(EVENTS.LINK_CREATED, sync);
    eventBus.on(EVENTS.LINK_DELETED, sync);
    eventBus.on(EVENTS.HUB_CREATED, sync);
    eventBus.on(EVENTS.GRAPH_CLEARED, sync);

    return {
        nodes: graphEngine.getNodes() as NodeBase[],
        edges: graphEngine.getEdges() as Edge[],
        version: 0,

        // Actions
        addNode: (data: CreateNodeInput): NodeBase => {
            if (data.id) {
                return graphEngine.addNode({ ...data, id: asNodeId(data.id) }) as NodeBase;
            }
            const { id: _id, ...rest } = data;
            return graphEngine.addNode(rest) as NodeBase;
        },
        updateNode: (id: NodeId | string, patch: Partial<Omit<NodeBase, 'id'>>) => {
            graphEngine.updateNode(toNodeId(id), patch);
        },
        removeNode: (id: NodeId | string) => {
            graphEngine.removeNode(toNodeId(id));
        },
        addEdge: (source: NodeId | string, target: NodeId | string): Edge | undefined => {
            return graphEngine.addEdge(toNodeId(source), toNodeId(target)) as Edge | undefined;
        },
        removeEdge: (id: string) => {
            graphEngine.removeEdge(asEdgeId(id));
        },
        clearGraph: () => {
            graphEngine.clear();
        }
    };
});
