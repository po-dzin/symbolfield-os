import { asNodeId, type Edge, type NodeBase } from '../core/types';
import { collectClusterDescendants } from '../core/graph/clusterHierarchy';

type UpdateNode = (id: string, patch: Partial<Omit<NodeBase, 'id'>>) => void;

// Cluster folding helpers (membership via parentClusterId + legacy edge-linked fallback).
export const getClusterChildren = (clusterId: string, nodes: NodeBase[], edges: Edge[]) => (
    collectClusterDescendants(asNodeId(clusterId), nodes, edges, {
        includeEdgeLinked: true,
        maxDepth: 1
    }).map(item => item.node)
);

const hideClusterChildren = (clusterId: string, nodes: NodeBase[], edges: Edge[], updateNode: UpdateNode) => {
    const descendants = collectClusterDescendants(asNodeId(clusterId), nodes, edges, {
        includeEdgeLinked: true
    });
    descendants.forEach((item) => {
        updateNode(item.id, { meta: { isHidden: true } });
    });
};

export const foldCluster = (clusterId: string, nodes: NodeBase[], edges: Edge[], updateNode: UpdateNode) => {
    updateNode(clusterId, { meta: { isFolded: true } });
    hideClusterChildren(clusterId, nodes, edges, updateNode);
};

export const unfoldCluster = (clusterId: string, nodes: NodeBase[], edges: Edge[], updateNode: UpdateNode) => {
    updateNode(clusterId, { meta: { isFolded: false } });

    const descendants = collectClusterDescendants(asNodeId(clusterId), nodes, edges, {
        includeEdgeLinked: true
    });

    descendants.forEach((item) => {
        updateNode(item.id, { meta: { isHidden: false } });
    });

    descendants
        .filter(item => item.node.type === 'cluster' && item.node.meta?.isFolded !== false)
        .forEach((item) => {
            updateNode(item.id, { meta: { isFolded: true } });
            hideClusterChildren(item.id, nodes, edges, updateNode);
        });
};
