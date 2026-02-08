import React from 'react';

export type SpaceMetrics = {
    id: string;
    name: string;
    nodeCount: number;
    edgeCount: number;
    clusterCount: number;
    updatedAt?: number;
    lastAccessedAt?: number;
    weight: number;
    maxNodeCount?: number;
    maxEdgeCount?: number;
    maxClusterCount?: number;
    maxWeight?: number;
};

const formatDate = (value?: number) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString();
};

const MetricBar = ({ label, value, max }: { label: string; value: number; max: number }) => {
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-[var(--semantic-color-text-muted)]">
                <span>{label}</span>
                <span className="text-[var(--semantic-color-text-secondary)]">{value}</span>
            </div>
            <div className="h-1.5 rounded-[var(--primitive-radius-pill)] bg-[var(--semantic-color-text-primary)]/5 overflow-hidden">
                <div className="h-full rounded-[var(--primitive-radius-pill)] bg-[var(--semantic-color-text-primary)]/40" style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
};

const RadialDiagram = ({ metrics }: { metrics: SpaceMetrics }) => {
    const size = 160;
    const center = size / 2;
    const maxNodes = metrics.maxNodeCount ?? Math.max(1, metrics.nodeCount);
    const maxEdges = metrics.maxEdgeCount ?? Math.max(1, metrics.edgeCount);
    const maxClusters = metrics.maxClusterCount ?? Math.max(1, metrics.clusterCount);
    const maxWeight = metrics.maxWeight ?? Math.max(1, metrics.weight);
    const rings = [
        { key: 'nodes', label: 'Nodes', value: metrics.nodeCount, max: maxNodes, radius: 52, color: 'var(--semantic-color-text-primary)' },
        { key: 'edges', label: 'Edges', value: metrics.edgeCount, max: maxEdges, radius: 42, color: 'var(--semantic-color-text-secondary)' },
        { key: 'clusters', label: 'Clusters', value: metrics.clusterCount, max: maxClusters, radius: 32, color: 'var(--semantic-color-text-muted)' },
        { key: 'weight', label: 'Weight', value: metrics.weight, max: maxWeight, radius: 22, color: 'var(--semantic-color-text-muted)' }
    ];

    return (
        <div className="flex items-center gap-4">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
                <g transform={`translate(${center} ${center}) rotate(-90)`}>
                    {rings.map(ring => {
                        const circ = 2 * Math.PI * ring.radius;
                        const ratio = ring.max > 0 ? Math.min(1, ring.value / ring.max) : 0;
                        const dash = circ * ratio;
                        const gap = Math.max(0, circ - dash);
                        return (
                            <circle
                                key={ring.key}
                                r={ring.radius}
                                cx={0}
                                cy={0}
                                fill="none"
                                stroke={ring.color}
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeDasharray={`${dash} ${gap}`}
                                strokeOpacity={0.5}
                            />
                        );
                    })}
                </g>
                <circle cx={center} cy={center} r={6} fill="var(--semantic-color-text-primary)" opacity={0.3} />
                <circle cx={center} cy={center} r={3} fill="var(--semantic-color-bg-app)" />
            </svg>
            <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--semantic-color-text-muted)] space-y-2">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--semantic-color-text-primary)]" style={{ opacity: 0.7 }} />
                    Nodes
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--semantic-color-text-secondary)]" style={{ opacity: 0.5 }} />
                    Edges
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--semantic-color-text-muted)]" style={{ opacity: 0.4 }} />
                    Clusters
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--semantic-color-text-muted)]" style={{ opacity: 0.3 }} />
                    Weight
                </div>
            </div>
        </div>
    );
};

const StationAnalyticsDrawer = ({ open, metrics, onClose }: { open: boolean; metrics: SpaceMetrics | null; onClose: () => void }) => {
    return (
        <div
            className={`absolute right-0 top-0 h-full w-[var(--panel-width-lg)] z-20 transition-transform duration-300 ease-out pointer-events-auto ${open ? 'translate-x-0' : 'translate-x-full'}`}
        >
            <div className="h-full glass-panel rounded-none rounded-l-[var(--panel-radius)] border-r-0 p-[var(--panel-padding)] flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div className="text-xs uppercase tracking-[0.3em] text-[var(--semantic-color-text-muted)]">Analytics</div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)] hover:bg-[var(--semantic-color-text-primary)]/10 transition-colors"
                        aria-label="Close analytics"
                    >
                        ×
                    </button>
                </div>

                {metrics ? (
                    <>
                        <div>
                            <div className="text-lg text-[var(--semantic-color-text-primary)] font-medium">{metrics.name}</div>
                            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--semantic-color-text-muted)]">{metrics.id}</div>
                        </div>

                        <div className="space-y-5">
                            <RadialDiagram metrics={metrics} />
                            <div className="space-y-3">
                                <MetricBar label="Nodes" value={metrics.nodeCount} max={metrics.maxNodeCount ?? Math.max(metrics.nodeCount, metrics.clusterCount, metrics.edgeCount)} />
                                <MetricBar label="Edges" value={metrics.edgeCount} max={metrics.maxEdgeCount ?? Math.max(metrics.nodeCount, metrics.clusterCount, metrics.edgeCount)} />
                                <MetricBar label="Clusters" value={metrics.clusterCount} max={metrics.maxClusterCount ?? Math.max(metrics.nodeCount, metrics.clusterCount, metrics.edgeCount)} />
                            </div>
                        </div>

                        <div className="space-y-2 text-xs text-[var(--semantic-color-text-secondary)]">
                            <div className="flex justify-between">
                                <span>Weight</span>
                                <span className="text-[var(--semantic-color-text-primary)]">{metrics.weight.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Last opened</span>
                                <span className="text-[var(--semantic-color-text-primary)]">{formatDate(metrics.lastAccessedAt)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Updated</span>
                                <span className="text-[var(--semantic-color-text-primary)]">{formatDate(metrics.updatedAt)}</span>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-[var(--semantic-color-border-default)] text-[11px] text-[var(--semantic-color-text-muted)] leading-relaxed">
                            Signals layer (v0.5): structure, activity, weight. Future r:agent will add meaning dynamics.
                        </div>
                    </>
                ) : (
                    <div className="text-sm text-[var(--semantic-color-text-muted)]">Select a space to see analytics.</div>
                )}
            </div>
        </div>
    );
};

export default StationAnalyticsDrawer;
