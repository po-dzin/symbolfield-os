import React from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { spaceManager } from '../../../core/state/SpaceManager';
import { useSelectionStore } from '../../../store/useSelectionStore';
import { useGraphStore } from '../../../store/useGraphStore';

const MetricBar = ({ label, value, max }: { label: string; value: number; max: number }) => {
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-[var(--semantic-color-text-muted)]">
                <span>{label}</span>
                <span className="text-[var(--semantic-color-text-secondary)]">{value}</span>
            </div>
            <div className="h-1 rounded-[var(--primitive-radius-pill)] bg-[var(--semantic-color-text-primary)]/5 overflow-hidden">
                <div className="h-full rounded-[var(--primitive-radius-pill)] bg-[var(--semantic-color-text-primary)]/40" style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
};

const SignalsPanel = () => {
    const viewContext = useAppStore(state => state.viewContext);
    const currentSpaceId = useAppStore(state => state.currentSpaceId);
    const selectedNodeIds = useSelectionStore(state => state.selectedIds);
    const graphNodes = useGraphStore(state => state.nodes);
    const graphEdges = useGraphStore(state => state.edges);
    const spaces = spaceManager.getSpaces();
    const isStationSummary = viewContext === 'home';
    const isFieldSummary = viewContext === 'space' || viewContext === 'cluster';

    const aggregateMetrics = React.useMemo(() => {
        const totals = spaces.reduce((acc, space) => {
            const data = spaceManager.getSpaceData(space.id);
            const nodes = data?.nodes ?? [];
            const edges = data?.edges ?? [];
            const clusters = nodes.filter(node => node.type === 'cluster').length;
            return {
                nodes: acc.nodes + nodes.length,
                edges: acc.edges + edges.length,
                clusters: acc.clusters + clusters
            };
        }, { nodes: 0, edges: 0, clusters: 0 });
        return {
            label: 'Station Summary',
            sub: `${spaces.length} Spaces Active`,
            nodes: totals.nodes,
            edges: totals.edges,
            clusters: totals.clusters
        };
    }, [spaces]);

    const currentMeta = currentSpaceId ? spaceManager.getSpaceMeta(currentSpaceId) : undefined;
    const currentData = currentSpaceId ? spaceManager.getSpaceData(currentSpaceId) : null;
    const currentNodes = currentData?.nodes ?? [];
    const currentEdges = currentData?.edges ?? [];

    const localMetrics = {
        label: currentMeta?.name ?? 'Current Space',
        sub: 'Local Space Signal',
        nodes: currentNodes.length,
        edges: currentEdges.length,
        clusters: currentNodes.filter(node => node.type === 'cluster').length
    };

    const displayMetrics = isStationSummary ? aggregateMetrics : localMetrics;
    const metricMax = Math.max(
        displayMetrics.nodes,
        displayMetrics.edges,
        displayMetrics.clusters,
        1
    );
    const primarySelectedNodeId = selectedNodeIds[selectedNodeIds.length - 1] ?? null;

    const nodeWeightMetrics = React.useMemo(() => {
        if (!isFieldSummary) return null;
        if (!primarySelectedNodeId) return null;
        if (!graphNodes.length) return null;

        const computeNodeWeight = (nodeId: string) => {
            const node = graphNodes.find(item => item.id === nodeId);
            if (!node) return 0;
            const nodeType = typeof node.type === 'string' ? node.type : 'node';
            const base =
                nodeType === 'core'
                    ? 3
                    : nodeType === 'cluster'
                        ? 2
                        : nodeType === 'portal'
                            ? 1.5
                            : 1;
            const degree = graphEdges.filter(edge => edge.source === node.id || edge.target === node.id).length;
            return base + degree * 0.5;
        };

        const selectedNode = graphNodes.find(node => node.id === primarySelectedNodeId);
        if (!selectedNode) return null;

        const totalWeight = graphNodes.reduce((sum, node) => sum + computeNodeWeight(node.id), 0);
        const selectedWeight = computeNodeWeight(selectedNode.id);
        const sharePct = totalWeight > 0 ? (selectedWeight / totalWeight) * 100 : 0;
        const degree = graphEdges.filter(edge => edge.source === selectedNode.id || edge.target === selectedNode.id).length;
        const rawLabel = typeof selectedNode.data?.label === 'string' ? selectedNode.data.label : String(selectedNode.id);
        const label = rawLabel.trim() || String(selectedNode.id);

        return {
            label: label.length > 24 ? `${label.slice(0, 24)}...` : label,
            nodeType: selectedNode.type ?? 'node',
            selectedWeight,
            totalWeight,
            sharePct,
            degree
        };
    }, [isFieldSummary, primarySelectedNodeId, graphNodes, graphEdges]);

    return (
        <div className="h-full flex flex-col gap-6 p-[var(--component-panel-padding)] w-full relative">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-[0.3em] text-[var(--semantic-color-text-muted)] opacity-60">Signals</div>
                <div className="flex gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--semantic-color-utility-success)] animate-pulse" />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col gap-8">
                <div>
                    <div className="text-lg text-[var(--semantic-color-text-primary)] font-medium truncate">{displayMetrics.label}</div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--semantic-color-text-muted)]">{displayMetrics.sub}</div>
                </div>

                <div className="space-y-4">
                    <MetricBar label="Nodes" value={displayMetrics.nodes} max={metricMax} />
                    <MetricBar label="Edges" value={displayMetrics.edges} max={metricMax} />
                    <MetricBar label="Clusters" value={displayMetrics.clusters} max={metricMax} />
                </div>

                <div className="p-3 rounded-[var(--primitive-radius-sm)] bg-[var(--semantic-color-bg-surface-hover)] border border-[var(--semantic-color-border-subtle)]">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-[var(--semantic-color-text-primary)]">Node Weight</span>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--semantic-color-text-muted)]">
                            {isFieldSummary ? 'Space Level' : 'Station Level'}
                        </span>
                    </div>
                    {nodeWeightMetrics ? (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-[11px] text-[var(--semantic-color-text-secondary)]">
                                <span className="truncate pr-3">{nodeWeightMetrics.label}</span>
                                <span className="font-mono uppercase">{String(nodeWeightMetrics.nodeType)}</span>
                            </div>
                            <div className="h-1.5 rounded-[var(--primitive-radius-pill)] bg-[var(--semantic-color-text-primary)]/10 overflow-hidden">
                                <div
                                    className="h-full rounded-[var(--primitive-radius-pill)] bg-[var(--semantic-color-text-primary)]/45"
                                    style={{ width: `${Math.max(0, Math.min(100, nodeWeightMetrics.sharePct))}%` }}
                                />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-[var(--semantic-color-text-secondary)]">
                                <span>Weight {nodeWeightMetrics.selectedWeight.toFixed(2)}</span>
                                <span>Total {nodeWeightMetrics.totalWeight.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-[var(--semantic-color-text-secondary)]">
                                <span>Share {nodeWeightMetrics.sharePct.toFixed(1)}%</span>
                                <span>Degree {nodeWeightMetrics.degree}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-[10px] text-[var(--semantic-color-text-secondary)] leading-relaxed">
                            Select a node to see its weight share relative to the current level total.
                        </div>
                    )}
                </div>

                <div className="p-3 rounded-[var(--primitive-radius-sm)] bg-[var(--semantic-color-bg-surface-hover)] border border-[var(--semantic-color-border-subtle)]">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">⚡</span>
                        <span className="text-xs font-medium text-[var(--semantic-color-text-primary)]">Activity</span>
                    </div>
                    <div className="text-[10px] text-[var(--semantic-color-text-secondary)] leading-relaxed">
                        {isStationSummary
                            ? 'Global station pulse across all spaces. Use this tab for system-level summary.'
                            : 'Local space resonance. Use Inspector tab for selected space properties.'}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignalsPanel;
