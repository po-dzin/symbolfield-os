import { asNodeId, type Edge, type NodeBase, type NodeId } from '../types';

type ClusterTreeOptions = {
    includeEdgeLinked?: boolean;
};

export type ClusterDescendant = {
    id: NodeId;
    node: NodeBase;
    depth: number;
    parentId: NodeId;
};

const toClusterId = (value: unknown): NodeId | null => {
    if (typeof value !== 'string' || value.length === 0) return null;
    return asNodeId(value);
};

const getParentClusterId = (node: NodeBase): NodeId | null => (
    toClusterId(node.meta?.parentClusterId)
);

const isCluster = (node: NodeBase | undefined): boolean => node?.type === 'cluster';

export const buildClusterChildrenIndex = (
    nodes: NodeBase[],
    edges: Edge[] = [],
    options: ClusterTreeOptions = {}
): Map<NodeId, Set<NodeId>> => {
    const includeEdgeLinked = options.includeEdgeLinked !== false;
    const nodeMap = new Map<NodeId, NodeBase>(nodes.map(node => [node.id, node]));
    const clusterIds = new Set<NodeId>(nodes.filter(isCluster).map(node => node.id));
    const childrenByCluster = new Map<NodeId, Set<NodeId>>();

    const addChild = (clusterId: NodeId, childId: NodeId) => {
        if (clusterId === childId) return;
        if (!childrenByCluster.has(clusterId)) {
            childrenByCluster.set(clusterId, new Set<NodeId>());
        }
        childrenByCluster.get(clusterId)?.add(childId);
    };

    nodes.forEach((node) => {
        if (node.type === 'core') return;
        const parentClusterId = getParentClusterId(node);
        if (!parentClusterId || !clusterIds.has(parentClusterId)) return;
        addChild(parentClusterId, node.id);
    });

    if (!includeEdgeLinked) return childrenByCluster;

    edges.forEach((edge) => {
        if (!clusterIds.has(edge.source)) return;
        const target = nodeMap.get(edge.target);
        if (!target || target.type === 'core') return;

        // Legacy compatibility: allow edge-linked membership only when target
        // does not have an explicit different parent.
        const parentClusterId = getParentClusterId(target);
        if (parentClusterId && parentClusterId !== edge.source) return;
        addChild(edge.source, target.id);
    });

    return childrenByCluster;
};

export const collectClusterDescendants = (
    rootClusterId: NodeId,
    nodes: NodeBase[],
    edges: Edge[] = [],
    options: ClusterTreeOptions & { maxDepth?: number } = {}
): ClusterDescendant[] => {
    const nodeMap = new Map<NodeId, NodeBase>(nodes.map(node => [node.id, node]));
    const childrenByCluster = buildClusterChildrenIndex(nodes, edges, options);
    const descendants: ClusterDescendant[] = [];
    const visited = new Set<NodeId>([rootClusterId]);
    const queue: Array<{ id: NodeId; depth: number; parentId: NodeId }> = [];

    (childrenByCluster.get(rootClusterId) ?? []).forEach((childId) => {
        queue.push({ id: childId, depth: 1, parentId: rootClusterId });
    });

    while (queue.length > 0) {
        const next = queue.shift();
        if (!next) break;
        if (visited.has(next.id)) continue;
        visited.add(next.id);

        if (typeof options.maxDepth === 'number' && next.depth > options.maxDepth) continue;

        const node = nodeMap.get(next.id);
        if (!node) continue;

        descendants.push({
            id: node.id,
            node,
            depth: next.depth,
            parentId: next.parentId
        });

        (childrenByCluster.get(next.id) ?? []).forEach((childId) => {
            queue.push({ id: childId, depth: next.depth + 1, parentId: next.id });
        });
    }

    return descendants;
};

export const collectClusterDescendantIds = (
    rootClusterId: NodeId,
    nodes: NodeBase[],
    edges: Edge[] = [],
    options: ClusterTreeOptions & { maxDepth?: number } = {}
): NodeId[] => (
    collectClusterDescendants(rootClusterId, nodes, edges, options).map(item => item.id)
);

export const getTopLevelClusterSelection = (
    selectedClusterIds: NodeId[],
    nodes: NodeBase[]
): NodeId[] => {
    const nodeMap = new Map<NodeId, NodeBase>(nodes.map(node => [node.id, node]));
    const selected = new Set<NodeId>(selectedClusterIds);

    return selectedClusterIds.filter((clusterId) => {
        let current = nodeMap.get(clusterId);
        const visited = new Set<NodeId>();
        while (current) {
            if (visited.has(current.id)) return true;
            visited.add(current.id);
            const parentClusterId = getParentClusterId(current);
            if (!parentClusterId) return true;
            if (selected.has(parentClusterId)) return false;
            current = nodeMap.get(parentClusterId);
        }
        return true;
    });
};

export const computeScopeVisibilitySets = (
    scopeId: NodeId,
    nodes: NodeBase[],
    edges: Edge[],
    subspaceLod: 1 | 2 | 3
) => {
    const focusIds = new Set<NodeId>([scopeId]);
    const ghostIds = new Set<NodeId>();
    const focusDepthLimit = Math.max(1, subspaceLod - 1);
    const ghostDepth = subspaceLod > 1 ? focusDepthLimit + 1 : null;
    const maxDepth = ghostDepth ?? focusDepthLimit;
    const descendants = collectClusterDescendants(scopeId, nodes, edges, {
        includeEdgeLinked: true,
        maxDepth
    });

    descendants.forEach((item) => {
        if (item.depth <= focusDepthLimit) {
            focusIds.add(item.id);
            return;
        }
        if (ghostDepth && item.depth === ghostDepth) {
            ghostIds.add(item.id);
        }
    });

    return { focusIds, ghostIds };
};

export const releaseClusterSubtree = (
    rootClusterId: NodeId,
    nodes: NodeBase[],
    edges: Edge[],
    updateNode: (id: NodeId, patch: Partial<Omit<NodeBase, 'id'>>) => void
) => {
    const descendants = collectClusterDescendants(rootClusterId, nodes, edges, {
        includeEdgeLinked: true
    });
    descendants.forEach((item) => {
        updateNode(item.id, {
            meta: {
                ...(item.node.meta ?? {}),
                parentClusterId: null,
                isHidden: false,
                focusHidden: false,
                focusGhost: false,
                focusGhostLevel: 0
            }
        });
    });
    return descendants;
};

export const deleteClusterSubtree = (
    rootClusterId: NodeId,
    nodes: NodeBase[],
    edges: Edge[],
    removeNode: (id: NodeId) => void
) => {
    const descendants = collectClusterDescendants(rootClusterId, nodes, edges, {
        includeEdgeLinked: true
    });
    descendants
        .slice()
        .sort((a, b) => b.depth - a.depth)
        .forEach((item) => {
            removeNode(item.id);
        });
    return descendants;
};
