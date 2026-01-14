import type { Edge, NodeBase } from '../core/types';

type UpdateNode = (id: string, patch: Partial<Omit<NodeBase, 'id'>>) => void;

// Cluster folding helpers (membership via parentClusterId or cluster links).
export const getClusterChildren = (clusterId: string, nodes: NodeBase[], edges: Edge[]) => {
    const linkedIds = new Set();
    edges.forEach(edge => {
        if (edge.source === clusterId) linkedIds.add(edge.target);
    });
    return nodes.filter(n => n.id !== clusterId && n.type !== 'root' && (n.meta?.parentClusterId === clusterId || linkedIds.has(n.id)));
};

const hideClusterChildren = (clusterId: string, nodes: NodeBase[], edges: Edge[], updateNode: UpdateNode) => {
    const children = getClusterChildren(clusterId, nodes, edges);
    children.forEach(child => {
        updateNode(child.id, { meta: { isHidden: true } });
        if (child.type === 'cluster') {
            hideClusterChildren(child.id, nodes, edges, updateNode);
        }
    });
};

export const foldCluster = (clusterId: string, nodes: NodeBase[], edges: Edge[], updateNode: UpdateNode) => {
    updateNode(clusterId, { meta: { isFolded: true } });
    hideClusterChildren(clusterId, nodes, edges, updateNode);
};

export const unfoldCluster = (clusterId: string, nodes: NodeBase[], edges: Edge[], updateNode: UpdateNode) => {
    updateNode(clusterId, { meta: { isFolded: false } });
    const children = getClusterChildren(clusterId, nodes, edges);
    children.forEach(child => {
        updateNode(child.id, { meta: { isHidden: false } });
        if (child.type === 'cluster') {
            const shouldFold = child.meta?.isFolded !== false;
            if (shouldFold) {
                updateNode(child.id, { meta: { isFolded: true } });
                hideClusterChildren(child.id, nodes, edges, updateNode);
            }
        }
    });
};
