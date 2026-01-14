/**
 * ContextToolbar.jsx
 * Floating toolbar that appears when a selection exists.
 * Anchor: Near the primary selected node (or bottom-center default for v0.5).
 */

import React, { useEffect, useState } from 'react';
import { useSelectionStore } from '../../store/useSelectionStore';
import { useAppStore } from '../../store/useAppStore';
import { useGraphStore } from '../../store/useGraphStore';
import { foldCluster, unfoldCluster } from '../../utils/clusterFold';
import { useEdgeSelectionStore } from '../../store/useEdgeSelectionStore';
import { eventBus } from '../../core/events/EventBus';
import { graphEngine } from '../../core/graph/GraphEngine';
import { asNodeId, type Edge, type NodeBase, type NodeId } from '../../core/types';

const ContextToolbar = () => {
    const selectedIds = useSelectionStore(state => state.selectedIds);
    const clearSelection = useSelectionStore(state => state.clear);
    const enterNow = useAppStore(state => state.enterNow);
    const setTool = useAppStore(state => state.setTool);
    const nodes = useGraphStore(state => state.nodes) as NodeBase[];
    const updateNode = useGraphStore(state => state.updateNode);
    const edges = useGraphStore(state => state.edges) as Edge[];
    const removeEdge = useGraphStore(state => state.removeEdge);
    const removeNode = useGraphStore(state => state.removeNode);
    const [showLinks, setShowLinks] = useState(false);
    const primaryId = selectedIds[selectedIds.length - 1] ?? null;

    useEffect(() => {
        setShowLinks(false);
    }, [primaryId, selectedIds.length]);

    if (selectedIds.length === 0 || !primaryId) return null;

    const count = selectedIds.length;
    const primaryNode = nodes.find(n => n.id === primaryId);
    const connectedEdges = edges.filter(edge => edge.source === primaryId || edge.target === primaryId);

    const isCluster = primaryNode?.type === 'cluster';
    const isFolded = !!primaryNode?.meta?.isFolded;
    const primaryLabel = typeof primaryNode?.data?.label === 'string' ? primaryNode.data.label : 'Empty';
    const handleFoldToggle = () => {
        if (!primaryNode) return;
        if (isFolded) {
            unfoldCluster(primaryNode.id, nodes, edges, updateNode);
        } else {
            foldCluster(primaryNode.id, nodes, edges, updateNode);
        }
    };
    const handleGroup = () => {
        if (selectedIds.length < 2) return;
        const groupNodes = selectedIds
            .map(id => graphEngine.getNode(id))
            .filter((n): n is NonNullable<ReturnType<typeof graphEngine.getNode>> => Boolean(n && n.type !== 'root'));
        if (groupNodes.length < 2) return;

        const xs = groupNodes.map(n => n.position.x);
        const ys = groupNodes.map(n => n.position.y);
        const clusterX = (Math.min(...xs) + Math.max(...xs)) / 2;
        const clusterY = (Math.min(...ys) + Math.max(...ys)) / 2;

        const cluster = graphEngine.addNode({
            id: asNodeId(`cluster-${Date.now()}`),
            type: 'cluster',
            position: { x: clusterX, y: clusterY },
            data: { label: 'Cluster' },
            meta: { isFolded: true }
        });
        groupNodes.forEach(n => {
            graphEngine.updateNode(n.id, { meta: { parentClusterId: cluster.id, isHidden: true } });
            graphEngine.addEdge(cluster.id, n.id, 'default');
            if (n.type === 'cluster' && n.meta?.isFolded !== true) {
                graphEngine.updateNode(n.id, { meta: { isFolded: true } });
            }
        });
        useEdgeSelectionStore.getState().clear();
        eventBus.emit('UI_SIGNAL', { x: clusterX, y: clusterY, type: 'GROUP_CREATED' });
        useSelectionStore.getState().select(cluster.id);
    };
    const handleDelete = () => {
        selectedIds.forEach((id: NodeId) => removeNode(id));
        clearSelection();
    };

    return (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[var(--z-ui)] animate-materialize">
            <div className="glass-panel py-1.5 px-3 flex items-center gap-4">

                {/* Info Section */}
                <div className="flex items-center gap-2 pr-4 border-r border-white/10 overflow-hidden max-w-[300px]">
                    {count === 1 ? (
                        <>
                            <span className="text-sm font-bold text-white tracking-tight truncate">
                                {primaryLabel}
                            </span>
                        </>
                    ) : (
                        <span className="text-[10px] text-white/80 uppercase tracking-[0.2em] font-medium">
                            {count} selected
                        </span>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-1">
                    {count === 1 && (
                        <>
                            <button
                                onClick={() => enterNow(primaryId)}
                                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs uppercase tracking-wide transition-colors"
                            >
                                Enter Now
                            </button>
                            <button
                                onClick={() => setTool('link')}
                                className="px-3 py-1.5 hover:bg-white/10 rounded-xl text-xs uppercase tracking-wide text-text-secondary transition-colors"
                            >
                                Link
                            </button>
                            {connectedEdges.length > 0 && (
                                <button
                                    onClick={() => setShowLinks(prev => !prev)}
                                    className="px-3 py-1.5 hover:bg-white/10 rounded-xl text-xs uppercase tracking-wide text-text-secondary transition-colors"
                                >
                                    Links…
                                </button>
                            )}
                            {isCluster && (
                                <button
                                    onClick={handleFoldToggle}
                                    className="px-3 py-1.5 hover:bg-white/10 rounded-xl text-xs uppercase tracking-wide text-text-secondary transition-colors"
                                >
                                    {isFolded ? 'Unfold' : 'Fold'}
                                </button>
                            )}
                            <button
                                onClick={handleDelete}
                                className="px-3 py-1.5 hover:bg-red-500/20 rounded-xl text-xs uppercase tracking-wide text-red-300 transition-colors"
                            >
                                Delete
                            </button>
                        </>
                    )}
                    {count > 1 && (
                        <>
                            <button
                                onClick={handleGroup}
                                className="px-3 py-1.5 hover:bg-white/10 rounded-xl text-xs uppercase tracking-wide text-text-secondary transition-colors"
                            >
                                Group
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-3 py-1.5 hover:bg-red-500/20 rounded-xl text-xs uppercase tracking-wide text-red-300 transition-colors"
                            >
                                Delete
                            </button>
                        </>
                    )}
                </div>

                {/* Close */}
                <button
                    onClick={() => clearSelection()}
                    className="w-6 h-6 rounded-full hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center text-text-meta ml-2"
                >
                    ✕
                </button>
            </div>

            {showLinks && connectedEdges.length > 0 && (
                <div className="absolute bottom-14 left-1/2 -translate-x-1/2 glass-panel p-3 min-w-[220px] border border-white/10">
                    <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2">
                        Links
                    </div>
                    <div className="flex flex-col gap-2 max-h-52 overflow-auto">
                        {connectedEdges.map(edge => {
                            const otherId = edge.source === primaryId ? edge.target : edge.source;
                            const otherNode = nodes.find(n => n.id === otherId);
                            const label = typeof otherNode?.data?.label === 'string' ? otherNode.data.label : otherId;
                            return (
                                <div key={edge.id} className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-white/80 truncate">
                                        {label}
                                    </span>
                                    <button
                                        onClick={() => removeEdge(edge.id)}
                                        className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-red-500/20 hover:text-red-200 transition-colors"
                                    >
                                        Unlink
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContextToolbar;
