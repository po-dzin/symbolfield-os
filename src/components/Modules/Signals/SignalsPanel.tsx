import React from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { spaceManager } from '../../../core/state/SpaceManager';

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
    const currentSpaceId = useAppStore(state => state.currentSpaceId);

    // In Station view, currentSpaceId might be null or we might want to check selectedSpaceId if passed down.
    // However, DockedDrawer is global.
    // If we are in Station, we might want to see Global stats if no space selected.

    // Let's try to get current space meta
    const meta = currentSpaceId ? spaceManager.getSpaces().find(s => s.id === currentSpaceId) : null;

    // If no specific space, show Field Aggregate (mock for now or calc)
    const spaces = spaceManager.getSpaces();
    const totalNodes = 124; // Mock for aggregate
    const totalEdges = 342;

    const displayMetrics = meta ? {
        label: meta.name,
        sub: 'Local Space Signal',
        nodes: 24, // Mock until we have real node count in meta
        edges: 42,
        clusters: 5,
        max: 50
    } : {
        label: 'Field Aggregate',
        sub: `${spaces.length} Spaces Active`,
        nodes: totalNodes,
        edges: totalEdges,
        clusters: spaces.length,
        max: 500
    };

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
                    <MetricBar label="Nodes" value={displayMetrics.nodes} max={displayMetrics.max} />
                    <MetricBar label="Edges" value={displayMetrics.edges} max={displayMetrics.max} />
                    <MetricBar label="Clusters" value={displayMetrics.clusters} max={displayMetrics.max} />
                </div>

                <div className="p-3 rounded-[var(--primitive-radius-sm)] bg-[var(--semantic-color-bg-surface-hover)] border border-[var(--semantic-color-border-subtle)]">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">⚡</span>
                        <span className="text-xs font-medium text-[var(--semantic-color-text-primary)]">Activity</span>
                    </div>
                    <div className="text-[10px] text-[var(--semantic-color-text-secondary)] leading-relaxed">
                        Stable field resonance. No anomalies detected in the last cycle.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignalsPanel;
