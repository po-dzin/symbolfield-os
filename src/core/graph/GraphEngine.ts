/**
 * GraphEngine.js
 * The "Brain" of the graph.
 * 
 * Responsibilities:
 * - Manage Nodes and Edges in memory (Map<Id, Entity>)
 * - CRUD operations
 * - Spatial Indexing (QuadTree or similar, simplified for v0.5)
 * - Hit Testing
 */

import { eventBus, EVENTS } from '../events/EventBus';
import { asEdgeId, asNodeId } from '../types';
import { GRID_METRICS, NODE_SIZES } from '../../utils/layoutMetrics';
import type { Edge, EdgeId, NodeBase, NodeId, Position } from '../types';
import { PLAYGROUND_NODES, PLAYGROUND_EDGES, PLAYGROUND_SPACE_ID, PLAYGROUND_CORE_ID } from '../defaults/playgroundContent';
import { ARCHECORE_ID } from '../defaults/coreIds';

type GraphNode = NodeBase & {
    type: string;
    style: Record<string, unknown>;
    meta: Record<string, unknown>;
    created_at: number;
    updated_at: number;
};

type GraphEdge = Edge & {
    type: string;
};

type NodeInput = {
    id?: NodeId;
    type?: string;
    position?: Position;
    data?: Record<string, unknown>;
    style?: Record<string, unknown>;
    meta?: Record<string, unknown>;
    created_at?: number | undefined;
    updated_at?: number | undefined;
};

class GraphEngine {
    private nodes: Map<NodeId, GraphNode>;
    private edges: Map<EdgeId, GraphEdge>;

    constructor() {
        this.nodes = new Map();
        this.edges = new Map();

        // Spatial index placeholder (can be RBush or simple grid in v0.5)
        // For < 1000 nodes, simple iteration is often fast enough for "findAt"
    }

    // --- Node Operations ---

    private getNextLabelIndex(prefix: string) {
        const re = new RegExp(`^${prefix}\\s+(\\d+)$`, 'i');
        let max = 0;
        this.nodes.forEach(node => {
            const label = typeof node.data?.label === 'string' ? node.data.label.trim() : '';
            const match = label.match(re);
            if (match) max = Math.max(max, Number(match[1]));
        });
        return max + 1;
    }

    addNode(data: NodeInput) {
        const id = asNodeId(data.id || crypto.randomUUID());
        const guardRadius = (NODE_SIZES.base / 2) + (GRID_METRICS.cell / 2);
        if (data.position) {
            const hitNode = this.findNodeAt(data.position.x, data.position.y, guardRadius);
            if (hitNode) return hitNode;
        }
        const rawLabel = typeof data.data?.label === 'string' ? data.data.label.trim() : '';
        const label = (!rawLabel || rawLabel.toLowerCase() === 'empty')
            ? `Empty ${this.getNextLabelIndex('Empty')}`
            : rawLabel;
        const nodeData = { ...(data.data || {}) };
        if (label) nodeData.label = label;
        const node: GraphNode = {
            id,
            type: data.type || 'node',
            position: data.position || { x: 0, y: 0 },
            data: nodeData,
            style: data.style || {},
            meta: data.meta || {},
            created_at: Date.now(),
            updated_at: Date.now()
        };

        this.nodes.set(id, node);
        eventBus.emit(EVENTS.NODE_CREATED, node);
        return node;
    }

    updateNode(id: NodeId, patch: Partial<Omit<GraphNode, 'id'>>) {
        const node = this.nodes.get(id);
        if (!node) return;

        const before = {
            ...node,
            position: { ...node.position },
            data: { ...node.data },
            style: { ...node.style },
            meta: { ...node.meta }
        };

        // Merge changes
        if (patch.position) {
            const next = { ...node.position, ...patch.position };
            const getRadius = (n: GraphNode) => {
                if (n.type === 'core') return NODE_SIZES.root / 2;
                if (n.type === 'cluster') return NODE_SIZES.cluster / 2;
                return NODE_SIZES.base / 2;
            };
            const radius = getRadius(node);
            let adjusted = { ...next };
            for (const other of this.nodes.values()) {
                if (other.id === node.id) continue;
                const otherRadius = getRadius(other);
                const dx = adjusted.x - other.position.x;
                const dy = adjusted.y - other.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const minDist = radius + otherRadius;
                if (dist < (minDist - 0.5)) {
                    const ux = dist > 0.001 ? dx / dist : 1;
                    const uy = dist > 0.001 ? dy / dist : 0;
                    adjusted = {
                        x: other.position.x + ux * minDist,
                        y: other.position.y + uy * minDist
                    };
                }
            }
            node.position = adjusted;
        }
        if (patch.data) node.data = { ...node.data, ...patch.data };
        if (patch.style) node.style = { ...node.style, ...patch.style };
        if (patch.meta) node.meta = { ...node.meta, ...patch.meta };

        node.updated_at = Date.now();

        const after = {
            ...node,
            position: { ...node.position },
            data: { ...node.data },
            style: { ...node.style },
            meta: { ...node.meta }
        };
        eventBus.emit(EVENTS.NODE_UPDATED, { id, patch, before, after });
    }

    removeNode(id: NodeId) {
        if (!this.nodes.has(id)) return;

        const node = this.nodes.get(id);
        const edges: GraphEdge[] = [];
        // Cascade delete edges
        this.edges.forEach((edge, edgeId) => {
            if (edge.source === id || edge.target === id) {
                edges.push(edge);
                this.removeEdge(edgeId);
            }
        });

        this.nodes.delete(id);
        eventBus.emit(EVENTS.NODE_DELETED, { id, node, edges });
    }

    clear() {
        this.nodes.clear();
        this.edges.clear();
        // Notify
        eventBus.emit(EVENTS.GRAPH_CLEARED);
    }

    // --- Edge Operations ---

    addEdge(sourceId: NodeId, targetId: NodeId, type = 'default', id: EdgeId | null = null): GraphEdge | undefined {
        if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
            console.warn('Cannot link non-existent nodes');
            return;
        }

        const existing = Array.from(this.edges.values()).find(edge => (
            edge.type === type
            && ((edge.source === sourceId && edge.target === targetId)
                || (edge.source === targetId && edge.target === sourceId))
        ));
        if (existing) return existing;

        const edgeId = id ?? asEdgeId(crypto.randomUUID());
        const edge: GraphEdge = {
            id: edgeId,
            source: sourceId,
            target: targetId,
            type
        };

        this.edges.set(edgeId, edge);
        eventBus.emit(EVENTS.LINK_CREATED, edge);
        const sourceNode = this.nodes.get(sourceId);
        const targetNode = this.nodes.get(targetId);
        if (sourceNode?.type === 'cluster' && targetNode && targetNode.type !== 'core') {
            const currentParent = targetNode.meta?.parentClusterId;
            if (!currentParent || currentParent === sourceNode.id) {
                this.updateNode(targetNode.id, { meta: { parentClusterId: sourceNode.id, isHidden: !!sourceNode.meta?.isFolded } });
            }
        }
        return edge;
    }

    removeEdge(id: EdgeId) {
        if (!this.edges.has(id)) return;
        const edge = this.edges.get(id);
        this.edges.delete(id);
        eventBus.emit(EVENTS.LINK_DELETED, { id, edge });
    }

    // --- Queries ---

    getNode(id: NodeId) {
        return this.nodes.get(id);
    }

    getNodes() {
        return Array.from(this.nodes.values());
    }

    getEdges() {
        return Array.from(this.edges.values());
    }

    /**
     * Simple Hit Test (Box)
     * @param {number} x 
     * @param {number} y 
     * @param {number} buffer (radius)
     */
    findNodeAt(x: number, y: number, buffer = 20) {
        // Optimization: This is O(N). For v0.5 with <500 nodes, it's fine.
        // Later replace with QuadTree.
        for (const node of this.nodes.values()) {
            const dx = node.position.x - x;
            const dy = node.position.y - y;
            // Simple circle check
            if ((dx * dx + dy * dy) < buffer * buffer) {
                return node;
            }
        }
        return null;
    }

    /**
     * Initialize Cosmogenesis (First Run)
     * Creates ArcheCore (The System Root) and links Playground cluster.
     */
    initializeCosmogenesis() {
        this.clear();

        // 1. Create ArcheCore (The System Root)
        const rootId = asNodeId(ARCHECORE_ID);
        this.addNode({
            id: rootId,
            type: 'core',
            position: { x: 0, y: 0 },
            data: { label: 'ArcheCore' }
        });

        // 2. Create Playground content
        this.createPlaygroundSpace();

        // 3. Link ArcheCore -> Playground Core
        this.addEdge(rootId, PLAYGROUND_CORE_ID);

        // Notify specifically for UI sync
        eventBus.emit(EVENTS.GRAPH_CLEARED);
        return rootId;
    }

    /**
     * Initialize a generic new Space (post-onboarding)
     * Creates a local "Core" node from the Source.
     */
    initializeNewSpace() {
        // Create generic Core node at 0,0
        const id = asNodeId(crypto.randomUUID());
        this.addNode({
            id,
            type: 'core',
            position: { x: 0, y: 0 },
            data: { label: 'Core' }
        });

        return id;
    }

    /**
     * Create the default Playground Space with tutorial content
     * Based on UI_ONBOARDING_SANDBOX_SoT_v0.5 spec
     */
    createPlaygroundSpace() {
        // Create all nodes
        PLAYGROUND_NODES.forEach((nodeDef: any) => {
            this.addNode({
                id: nodeDef.id,
                type: nodeDef.type,
                position: { x: nodeDef.position.x, y: nodeDef.position.y },
                data: {
                    label: nodeDef.label,
                    icon_value: nodeDef.icon_value,
                    icon_source: nodeDef.icon_source,
                    content: nodeDef.content
                }
            });
        });

        // Create all edges
        PLAYGROUND_EDGES.forEach((edgeDef: any) => {
            this.addEdge(edgeDef.from, edgeDef.to);
        });

        eventBus.emit(EVENTS.PLAYGROUND_CREATED, { spaceId: PLAYGROUND_SPACE_ID });
        return PLAYGROUND_SPACE_ID;
    }

    /**
     * Reset Playground Space to default state
     * Archives current nodes and recreates fresh tutorial content
     */
    resetPlaygroundSpace() {
        const playgroundNodes = this.getNodes().filter(node =>
            node.id.startsWith('playground')
        );

        playgroundNodes.forEach(node => {
            this.updateNode(node.id, {
                meta: { ...node.meta, archived: true, archivedAt: Date.now() }
            });
        });

        const newSpaceId = this.createPlaygroundSpace();

        eventBus.emit(EVENTS.PLAYGROUND_RESET, {
            archivedCount: playgroundNodes.length,
            newSpaceId
        });

        return newSpaceId;
    }

    /**
     * Export current graph state
     */
    exportData() {
        return {
            nodes: Array.from(this.nodes.values()),
            edges: Array.from(this.edges.values())
        };
    }

    /**
     * Import graph state (clears existing)
     */
    importData(data: { nodes: GraphNode[], edges: GraphEdge[] }) {
        this.clear();
        data.nodes.forEach(node => {
            this.nodes.set(node.id, node);
            eventBus.emit(EVENTS.NODE_CREATED, node);
        });
        data.edges.forEach(edge => {
            this.edges.set(edge.id, edge);
            eventBus.emit(EVENTS.LINK_CREATED, edge);
        });
    }

}

export const graphEngine = new GraphEngine();
