import React from 'react';
import { spaceManager } from '../../core/state/SpaceManager';
import { eventBus, EVENTS } from '../../core/events/EventBus';
import type { NodeBase } from '../../core/types';

type DetailLevel = 0 | 1 | 2;

type SpaceCluster = {
    id: string;
    name: string;
    center: { x: number; y: number };
    radius: number;
    hasCore: boolean;
    clusters: Array<{ id: string; x: number; y: number; parentClusterId?: string | undefined }>;
    nodes: Array<{ id: string; x: number; y: number; parentClusterId?: string | undefined }>;
};

const VIEWBOX = '-700 -700 1400 1400';
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const renderLink = (cx1: number, cy1: number, cx2: number, cy2: number, r1: number, r2: number, key: string, isInternal = false) => {
    const dx = cx2 - cx1;
    const dy = cy2 - cy1;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= r1 + r2) return null;

    const ratio1 = r1 / distance;
    const ratio2 = r2 / distance;

    const x1 = cx1 + dx * ratio1;
    const y1 = cy1 + dy * ratio1;
    const x2 = cx2 - dx * ratio2;
    const y2 = cy2 - dy * ratio2;

    return (
        <g key={key} className="pointer-events-none">
            {/* Glow */}
            <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={isInternal ? 2 : 4}
                strokeLinecap="round"
                style={{ filter: 'blur(2px)' }}
            />
            {/* Core */}
            <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgba(255,255,255,0.25)"
                strokeWidth={isInternal ? 0.5 : 1}
                strokeLinecap="round"
            />
        </g>
    );
};

const buildClusters = (): SpaceCluster[] => {
    const spaces = spaceManager
        .getSpacesWithOptions({ includePlayground: true })
        .slice()
        .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
    const placed: SpaceCluster[] = [];

    // ... placement logic ...

    return spaces.map((space, index) => {
        const data = spaceManager.getSpaceData(space.id);
        const coreNodes = (data?.nodes ?? []).filter(n => n.type === 'core');
        const nodes = (data?.nodes ?? []).filter(n => n.type !== 'core' && n.type !== 'root');

        // Calculate bounds for ALL nodes including core to preserve relative structure
        const allNodes = [...coreNodes, ...nodes];

        const nodeCount = nodes.length + coreNodes.length;
        const clusterRadius = 60 + Math.sqrt(nodeCount) * 10;
        const baseOrbit = 210;
        const orbitStep = 110;

        const center = (() => {
            let t = index;
            for (let attempt = 0; attempt < 140; attempt += 1) {
                const angle = t * GOLDEN_ANGLE;
                const orbit = baseOrbit + orbitStep * Math.sqrt(t + 1);
                const candidate = { x: Math.cos(angle) * orbit, y: Math.sin(angle) * orbit };
                const hasCollision = placed.some(other => {
                    const dx = candidate.x - other.center.x;
                    const dy = candidate.y - other.center.y;
                    const dist = Math.hypot(dx, dy);
                    return dist < (clusterRadius + other.radius + 60);
                });
                if (!hasCollision) return candidate;
                t += 1;
            }
            return { x: Math.cos(index * GOLDEN_ANGLE) * (baseOrbit + orbitStep * Math.sqrt(index + 1)), y: Math.sin(index * GOLDEN_ANGLE) * (baseOrbit + orbitStep * Math.sqrt(index + 1)) };
        })();

        // Normalize points relative to their collective bounding box
        // If hasCore, we want the Core to be at (0,0) in the local normalized space, 
        // effectively pinning it to the visual center.
        const normalize = (targetNodes: NodeBase[]) => {
            if (targetNodes.length === 0 || allNodes.length === 0) return [];

            const xs = allNodes.map(n => n.position.x);
            const ys = allNodes.map(n => n.position.y);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);

            // If we have a core, align the core to the center
            // Otherwise align the bounding box center to the center
            const core = coreNodes[0];
            const originX = core ? core.position.x : (minX + maxX) / 2;
            const originY = core ? core.position.y : (minY + maxY) / 2;

            const spanX = Math.max(1, maxX - minX);
            const spanY = Math.max(1, maxY - minY);
            // Scale based on the full span of the content
            const scale = (clusterRadius * 0.7) / Math.max(spanX, spanY, 1);

            return targetNodes.map(node => ({
                id: node.id,
                x: center.x + ((node.position.x - originX) * scale),
                y: center.y + ((node.position.y - originY) * scale),
                parentClusterId: node.meta?.parentClusterId as string | undefined
            }));
        };

        const subClusters = nodes.filter(n => n.type === 'cluster');
        const leafNodes = nodes.filter(n => n.type !== 'cluster');

        const cluster = {
            id: space.id,
            name: space.name,
            center,
            radius: clusterRadius,
            hasCore: coreNodes.length > 0,
            clusters: normalize(subClusters),
            nodes: normalize(leafNodes)
        };
        placed.push(cluster);
        return cluster;
    });
};

const GlobalGraphOverview = ({ className }: { className?: string }) => {
    const [detailLevel, setDetailLevel] = React.useState<DetailLevel>(1);
    const [clusters, setClusters] = React.useState<SpaceCluster[]>(() => buildClusters());
    const [highlightSpaceId, setHighlightSpaceId] = React.useState<string | null>(null);

    React.useEffect(() => {
        const refresh = () => setClusters(buildClusters());
        const unsub = [
            eventBus.on(EVENTS.SPACE_CREATED, refresh),
            eventBus.on(EVENTS.SPACE_RENAMED, refresh),
            eventBus.on(EVENTS.SPACE_DELETED, refresh)
        ];
        const unsubHover = eventBus.on(EVENTS.PORTAL_HOVERED, (e) => {
            setHighlightSpaceId(e.payload?.spaceId ?? null);
        });
        return () => {
            unsub.forEach(fn => fn());
            unsubHover();
        };
    }, []);

    return (
        <div
            className={className ?? 'relative w-full h-full'}
            style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
                backgroundSize: '32px 32px'
            }}
        >
            <svg
                viewBox={VIEWBOX}
                className="w-full h-full"
                role="img"
                aria-label="Global graph overview"
                preserveAspectRatio="xMidYMid meet"
            >
                <defs>
                    <radialGradient id="gg-core" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
                    </radialGradient>
                </defs>

                {/* Level 0: ArcheNode -> Space Links */}
                {clusters.map(cluster => (
                    renderLink(0, 0, cluster.center.x, cluster.center.y, 40, cluster.hasCore ? 10 : 0, `link-root-${cluster.id}`)
                ))}

                <circle cx="0" cy="0" r="90" fill="url(#gg-core)" stroke="rgba(255,255,255,0.08)" />
                <circle cx="0" cy="0" r="45" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={3} />
                <circle cx="0" cy="0" r="40" fill="none" stroke="rgba(255,255,255,0.78)" strokeWidth={3} />
                <circle cx="0" cy="0" r="28" fill="rgba(255,255,255,0.9)" />
                <text
                    x="0"
                    y="106"
                    fill="rgba(255,255,255,0.85)"
                    fontSize="10"
                    textAnchor="middle"
                    className="font-mono uppercase tracking-[0.3em]"
                >
                    ArcheCore
                </text>

                {clusters.map(cluster => {
                    const isHighlight = highlightSpaceId === cluster.id;
                    const clusterMap = new Map(cluster.clusters.map(h => [h.id, h]));

                    return (
                        <g
                            key={cluster.id}
                            className="cursor-pointer"
                            onClick={() => spaceManager.loadSpace(cluster.id)}
                            onMouseEnter={() => setHighlightSpaceId(cluster.id)}
                            onMouseLeave={() => setHighlightSpaceId(null)}
                        >
                            <circle
                                cx={cluster.center.x}
                                cy={cluster.center.y}
                                r={cluster.radius}
                                fill="rgba(255,255,255,0.02)"
                                stroke={isHighlight ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.08)'}
                                strokeWidth={isHighlight ? 1.5 : 1}
                            />

                            {/* Internal Links: Space Core -> Clusters/Independent Nodes */}
                            {detailLevel >= 1 && (
                                <>
                                    {/* Core -> Clusters (L1 Link) */}
                                    {cluster.clusters.map(sub =>
                                        renderLink(cluster.center.x, cluster.center.y, sub.x, sub.y, 10, 6, `link-${cluster.id}-c-${sub.id}`, true)
                                    )}

                                    {/* Links to Leaf Nodes (L2) - Only show if Detail Level is >= 2 */}
                                    {detailLevel >= 2 && (
                                        <>
                                            {/* Core -> Independent Nodes */}
                                            {cluster.hasCore && cluster.nodes
                                                .filter(n => !n.parentClusterId)
                                                .map(node =>
                                                    renderLink(cluster.center.x, cluster.center.y, node.x, node.y, 10, 2, `link-${cluster.id}-n-${node.id}`, true)
                                                )
                                            }

                                            {/* Cluster -> Child Nodes */}
                                            {cluster.nodes
                                                .filter(n => n.parentClusterId && clusterMap.has(n.parentClusterId))
                                                .map(node => {
                                                    const parent = clusterMap.get(node.parentClusterId!)!;
                                                    return renderLink(parent.x, parent.y, node.x, node.y, 5, 2, `link-${cluster.id}-cn-${node.id}`, true);
                                                })
                                            }
                                        </>
                                    )}
                                </>
                            )}

                            {cluster.hasCore && (
                                <>
                                    <circle
                                        cx={cluster.center.x}
                                        cy={cluster.center.y}
                                        r={10}
                                        fill="rgba(255,255,255,0.12)"
                                        stroke="rgba(255,255,255,0.35)"
                                        strokeWidth={1}
                                    />
                                    <circle
                                        cx={cluster.center.x}
                                        cy={cluster.center.y}
                                        r={3}
                                        fill="rgba(255,255,255,0.8)"
                                    />
                                </>
                            )}
                            <text
                                x={cluster.center.x}
                                y={cluster.center.y + cluster.radius + 16}
                                fill={isHighlight ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)'}
                                fontSize="10"
                                textAnchor="middle"
                                className="font-mono uppercase tracking-[0.3em]"
                            >
                                {cluster.name}
                            </text>

                            {detailLevel >= 1 && cluster.clusters.map(sub => (
                                <g key={sub.id} transform={`translate(${sub.x}, ${sub.y})`}>
                                    <circle
                                        r={5}
                                        fill="none"
                                        stroke="rgba(125,211,252,0.8)"
                                        strokeWidth={1.5}
                                    />
                                    <circle
                                        r={2}
                                        fill="rgba(125,211,252,0.6)"
                                    />
                                </g>
                            ))}
                            {detailLevel >= 2 && cluster.nodes.map(node => (
                                <circle
                                    key={node.id}
                                    cx={node.x}
                                    cy={node.y}
                                    r={2}
                                    fill="rgba(255,255,255,0.45)"
                                />
                            ))}
                        </g>
                    );
                })}
            </svg>

            <div className="absolute top-20 right-8 flex items-center gap-1 rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[10px] uppercase tracking-[0.3em] text-white/50">
                <button
                    onClick={() => setDetailLevel(0)}
                    className={`px-2 py-1 rounded-full transition-colors ${detailLevel === 0 ? 'bg-white/20 text-white' : 'hover:text-white/80'}`}
                >
                    L1
                </button>
                <button
                    onClick={() => setDetailLevel(1)}
                    className={`px-2 py-1 rounded-full transition-colors ${detailLevel === 1 ? 'bg-white/20 text-white' : 'hover:text-white/80'}`}
                >
                    L2
                </button>
                <button
                    onClick={() => setDetailLevel(2)}
                    className={`px-2 py-1 rounded-full transition-colors ${detailLevel === 2 ? 'bg-white/20 text-white' : 'hover:text-white/80'}`}
                >
                    L3
                </button>
            </div>
        </div >
    );
};

export default GlobalGraphOverview;
