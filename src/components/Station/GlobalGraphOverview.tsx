import React from 'react';
import { spaceManager } from '../../core/state/SpaceManager';
import { eventBus, EVENTS } from '../../core/events/EventBus';
import type { NodeBase } from '../../core/types';
import { stationStorage, type StationLayout } from '../../core/storage/StationStorage';
import { useAppStore } from '../../store/useAppStore';

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

const DEFAULT_VIEWBOX = { x: -700, y: -700, w: 1400, h: 1400 };
const ARCHECORE_RADIUS = 90;
const ARCHECORE_PADDING = 60;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const TWO_PI = Math.PI * 2;

const createSeededRandom = (seed: string) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
        hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    return () => {
        hash = (hash * 1664525 + 1013904223) >>> 0;
        return hash / 0xffffffff;
    };
};
type SpaceMetrics = {
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

const buildClusters = (includePlayground: boolean): SpaceCluster[] => {
    const spaces = spaceManager
        .getSpacesWithOptions({ includePlayground })
        .slice()
        .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
    const placed: SpaceCluster[] = [];
    const useUniformAngles = spaces.length <= 6;

    const hashJitter = (id: string) => {
        let hash = 0;
        for (let i = 0; i < id.length; i += 1) {
            hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
        }
        const jx = ((hash % 1000) / 500) - 1;
        const jy = (((Math.floor(hash / 1000)) % 1000) / 500) - 1;
        return { x: jx, y: jy };
    };

    // ... placement logic ...

    return spaces.map((space, index) => {
        const data = spaceManager.getSpaceData(space.id);
        const coreNodes = (data?.nodes ?? []).filter(n => n.type === 'core');
        const nodes = (data?.nodes ?? []).filter(n => n.type !== 'core');

        // Calculate bounds for ALL nodes including core to preserve relative structure
        const allNodes = [...coreNodes, ...nodes];

        const clusterCount = nodes.filter(n => n.type === 'cluster').length;
        const nodeCount = nodes.length + coreNodes.length;
        const clusterRadius = 60 + Math.sqrt(nodeCount) * 10 + clusterCount * 8;
        const baseOrbit = 210;
        const orbitStep = 110;
        const jitter = hashJitter(space.id);
        const jitterStrength = 18;

        const center = (() => {
            let t = index;
            for (let attempt = 0; attempt < 140; attempt += 1) {
                const angle = useUniformAngles
                    ? (index / Math.max(1, spaces.length)) * TWO_PI
                    : t * GOLDEN_ANGLE;
                const orbit = baseOrbit + orbitStep * (useUniformAngles ? 1 + attempt * 0.35 : Math.sqrt(t + 1));
                const candidate = {
                    x: (Math.cos(angle) * orbit) + jitter.x * jitterStrength,
                    y: (Math.sin(angle) * orbit) + jitter.y * jitterStrength,
                };
                const hasCollision = placed.some(other => {
                    const dx = candidate.x - other.center.x;
                    const dy = candidate.y - other.center.y;
                    const dist = Math.hypot(dx, dy);
                    return dist < (clusterRadius + other.radius + 60);
                });
                const coreDist = Math.hypot(candidate.x, candidate.y);
                const hitsArchecore = coreDist < (clusterRadius + ARCHECORE_RADIUS + ARCHECORE_PADDING);
                if (!hasCollision && !hitsArchecore) return candidate;
                t += 1;
            }
            const fallbackAngle = useUniformAngles
                ? (index / Math.max(1, spaces.length)) * TWO_PI
                : index * GOLDEN_ANGLE;
            const fallbackOrbit = baseOrbit + orbitStep * Math.sqrt(index + 1);
            return {
                x: (Math.cos(fallbackAngle) * fallbackOrbit) + jitter.x * jitterStrength,
                y: (Math.sin(fallbackAngle) * fallbackOrbit) + jitter.y * jitterStrength,
            };
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

const computeMaxMetrics = (includePlayground: boolean) => {
    const spaces = spaceManager.getSpacesWithOptions({ includePlayground });
    let maxNodeCount = 1;
    let maxEdgeCount = 1;
    let maxClusterCount = 1;
    let maxWeight = 1;
    spaces.forEach(space => {
        const data = spaceManager.getSpaceData(space.id);
        if (!data) return;
        const nodes = data.nodes ?? [];
        const edges = data.edges ?? [];
        const clusterCount = nodes.filter(n => n.type === 'cluster').length;
        const nodeCount = nodes.filter(n => n.type !== 'core').length;
        const edgeCount = edges.length;
        const weight = nodeCount + clusterCount * 2 + edgeCount * 0.5;
        maxNodeCount = Math.max(maxNodeCount, nodeCount);
        maxEdgeCount = Math.max(maxEdgeCount, edgeCount);
        maxClusterCount = Math.max(maxClusterCount, clusterCount);
        maxWeight = Math.max(maxWeight, weight);
    });
    return { maxNodeCount, maxEdgeCount, maxClusterCount, maxWeight };
};

const computeMetrics = (spaceId: string, includePlayground: boolean): SpaceMetrics | null => {
    const meta = spaceManager.getSpaceMeta(spaceId);
    const data = spaceManager.getSpaceData(spaceId);
    if (!meta || !data) return null;
    const nodes = data.nodes ?? [];
    const edges = data.edges ?? [];
    const clusterCount = nodes.filter(n => n.type === 'cluster').length;
    const nodeCount = nodes.filter(n => n.type !== 'core').length;
    const edgeCount = edges.length;
    const weight = nodeCount + clusterCount * 2 + edgeCount * 0.5;
    const { maxNodeCount, maxEdgeCount, maxClusterCount, maxWeight } = computeMaxMetrics(includePlayground);
    return {
        id: meta.id,
        name: meta.name,
        nodeCount,
        edgeCount,
        clusterCount,
        updatedAt: meta.updatedAt,
        lastAccessedAt: meta.lastAccessedAt,
        weight,
        maxNodeCount,
        maxEdgeCount,
        maxClusterCount,
        maxWeight
    };
};

const GlobalGraphOverview = ({
    className,
    focusedSpaceId,
    selectedSpaceId,
    onSelectSpace
}: {
    className?: string;
    focusedSpaceId?: string | null;
    selectedSpaceId?: string | null;
    onSelectSpace?: (metrics: SpaceMetrics | null) => void;
}) => {
    const showStationLabels = useAppStore(state => state.showStationLabels);
    const showPlaygroundOnStation = useAppStore(state => state.showPlaygroundOnStation);
    const [detailLevel, setDetailLevel] = React.useState<DetailLevel>(1);
    const [layoutOffsets, setLayoutOffsets] = React.useState<StationLayout>(() => stationStorage.loadStationLayout());
    const [clusters, setClusters] = React.useState<SpaceCluster[]>(() => buildClusters(showPlaygroundOnStation));
    const playgroundId = spaceManager.getPlaygroundSpace()?.id ?? null;
    const selectedMetrics = React.useMemo(() => {
        if (!selectedSpaceId) return null;
        if (!showPlaygroundOnStation && playgroundId && selectedSpaceId === playgroundId) return null;
        return computeMetrics(selectedSpaceId, showPlaygroundOnStation);
    }, [selectedSpaceId, showPlaygroundOnStation, clusters.length, playgroundId]);
    const clustersWithOffsets = React.useMemo(() => (
        clusters.map(cluster => {
            const offset = layoutOffsets[cluster.id] ?? { x: 0, y: 0 };
            return {
                ...cluster,
                center: {
                    x: cluster.center.x + offset.x,
                    y: cluster.center.y + offset.y
                },
                clusters: cluster.clusters.map(item => ({
                    ...item,
                    x: item.x + offset.x,
                    y: item.y + offset.y
                })),
                nodes: cluster.nodes.map(item => ({
                    ...item,
                    x: item.x + offset.x,
                    y: item.y + offset.y
                }))
            };
        })
    ), [clusters, layoutOffsets]);

    const visibleClusters = React.useMemo(() => {
        if (showPlaygroundOnStation || !playgroundId) return clustersWithOffsets;
        return clustersWithOffsets.filter(cluster => cluster.id !== playgroundId);
    }, [clustersWithOffsets, showPlaygroundOnStation, playgroundId]);
    const [highlightSpaceId, setHighlightSpaceId] = React.useState<string | null>(null);
    const svgRef = React.useRef<SVGSVGElement | null>(null);
    const viewBoxRef = React.useRef({ ...DEFAULT_VIEWBOX });
    const viewBoxVelocity = React.useRef({ x: 0, y: 0, w: 0, h: 0 });
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [stationZoom, setStationZoom] = React.useState(1);
    const draggingRef = React.useRef(false);
    const renderClustersRef = React.useRef<SpaceCluster[]>(visibleClusters);
    const [renderClusters, setRenderClusters] = React.useState<SpaceCluster[]>(visibleClusters);
    const dragRef = React.useRef<null | {
        id: string;
        start: { x: number; y: number };
        base: { x: number; y: number };
        moved: boolean;
    }>(null);

    React.useEffect(() => {
        const refresh = () => setClusters(buildClusters(showPlaygroundOnStation));
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
    }, [showPlaygroundOnStation]);

    React.useEffect(() => {
        const target = visibleClusters;
        if (draggingRef.current) {
            renderClustersRef.current = target;
            setRenderClusters(target);
            return;
        }

        let raf = 0;
        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
        const t = 0.16;
        const threshold = 0.4;

        const step = () => {
            const current = renderClustersRef.current;
            let maxDelta = 0;

            const next = target.map(space => {
                const prev = current.find(item => item.id === space.id);
                if (!prev) return space;
                const cx = lerp(prev.center.x, space.center.x, t);
                const cy = lerp(prev.center.y, space.center.y, t);
                const radius = lerp(prev.radius, space.radius, t);
                maxDelta = Math.max(maxDelta, Math.abs(space.center.x - cx), Math.abs(space.center.y - cy), Math.abs(space.radius - radius));

                const nextClusters = space.clusters.map(sub => {
                    const prevSub = prev.clusters.find(item => item.id === sub.id);
                    if (!prevSub) return sub;
                    const x = lerp(prevSub.x, sub.x, t);
                    const y = lerp(prevSub.y, sub.y, t);
                    maxDelta = Math.max(maxDelta, Math.abs(sub.x - x), Math.abs(sub.y - y));
                    return { ...sub, x, y };
                });

                const nextNodes = space.nodes.map(sub => {
                    const prevSub = prev.nodes.find(item => item.id === sub.id);
                    if (!prevSub) return sub;
                    const x = lerp(prevSub.x, sub.x, t);
                    const y = lerp(prevSub.y, sub.y, t);
                    maxDelta = Math.max(maxDelta, Math.abs(sub.x - x), Math.abs(sub.y - y));
                    return { ...sub, x, y };
                });

                return {
                    ...space,
                    center: { x: cx, y: cy },
                    radius,
                    clusters: nextClusters,
                    nodes: nextNodes
                };
            });

            renderClustersRef.current = next;
            setRenderClusters(next);

            if (maxDelta < threshold) {
                renderClustersRef.current = target;
                setRenderClusters(target);
                return;
            }
            raf = window.requestAnimationFrame(step);
        };

        raf = window.requestAnimationFrame(step);
        return () => window.cancelAnimationFrame(raf);
    }, [visibleClusters]);

    const toSvgPoint = (clientX: number, clientY: number) => {
        const svg = svgRef.current;
        if (!svg) return { x: 0, y: 0 };
        const rect = svg.getBoundingClientRect();
        const current = viewBoxRef.current;
        const scaleX = current.w / rect.width;
        const scaleY = current.h / rect.height;
        return {
            x: (clientX - rect.left) * scaleX + current.x,
            y: (clientY - rect.top) * scaleY + current.y
        };
    };

    const startDrag = (spaceId: string, e: React.PointerEvent<SVGGElement>) => {
        e.stopPropagation();
        const start = toSvgPoint(e.clientX, e.clientY);
        const base = layoutOffsets[spaceId] ?? { x: 0, y: 0 };
        dragRef.current = { id: spaceId, start, base, moved: false };
        draggingRef.current = true;
        (e.currentTarget as SVGGElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
        if (!dragRef.current) return;
        const current = toSvgPoint(e.clientX, e.clientY);
        const dx = current.x - dragRef.current.start.x;
        const dy = current.y - dragRef.current.start.y;
        if (Math.hypot(dx, dy) > 2) {
            dragRef.current.moved = true;
        }
        const nextOffset = {
            ...layoutOffsets,
            [dragRef.current.id]: {
                x: dragRef.current.base.x + dx,
                y: dragRef.current.base.y + dy
            }
        };
        const baseCluster = clusters.find(cluster => cluster.id === dragRef.current?.id);
        if (baseCluster) {
            const offset = nextOffset[dragRef.current.id];
            const nextCenter = {
                x: baseCluster.center.x + offset.x,
                y: baseCluster.center.y + offset.y
            };
            const minDist = baseCluster.radius + ARCHECORE_RADIUS + ARCHECORE_PADDING;
            const dist = Math.hypot(nextCenter.x, nextCenter.y);
            if (dist < minDist) {
                const angle = Math.atan2(nextCenter.y, nextCenter.x);
                const clamped = {
                    x: Math.cos(angle) * minDist,
                    y: Math.sin(angle) * minDist
                };
                nextOffset[dragRef.current.id] = {
                    x: clamped.x - baseCluster.center.x,
                    y: clamped.y - baseCluster.center.y
                };
            }
        }
        setLayoutOffsets(nextOffset);
    };

    const handlePointerUp = () => {
        if (!dragRef.current) return;
        stationStorage.saveStationLayout(layoutOffsets);
        dragRef.current = null;
        draggingRef.current = false;
    };

    const targetViewBox = React.useMemo(() => {
        const zoom = Math.min(2.6, Math.max(0.6, stationZoom));
        if (!focusedSpaceId) {
            return {
                x: DEFAULT_VIEWBOX.x + (DEFAULT_VIEWBOX.w * (1 - 1 / zoom)) / 2,
                y: DEFAULT_VIEWBOX.y + (DEFAULT_VIEWBOX.h * (1 - 1 / zoom)) / 2,
                w: DEFAULT_VIEWBOX.w / zoom,
                h: DEFAULT_VIEWBOX.h / zoom
            };
        }
        const cluster = visibleClusters.find(item => item.id === focusedSpaceId);
        if (!cluster) return DEFAULT_VIEWBOX;
        const size = Math.max(360, cluster.radius * 3.2) / zoom;
        return {
            x: cluster.center.x - size / 2,
            y: cluster.center.y - size / 2,
            w: size,
            h: size
        };
    }, [focusedSpaceId, visibleClusters, stationZoom]);

    const [viewBox, setViewBox] = React.useState(DEFAULT_VIEWBOX);

    React.useEffect(() => {
        let raf = 0;
        const k = 0.24;
        const damping = 0.7;
        const animate = () => {
            const current = viewBoxRef.current;
            const velocity = viewBoxVelocity.current;
            const target = targetViewBox;
            velocity.x = (velocity.x + (target.x - current.x) * k) * damping;
            velocity.y = (velocity.y + (target.y - current.y) * k) * damping;
            velocity.w = (velocity.w + (target.w - current.w) * k) * damping;
            velocity.h = (velocity.h + (target.h - current.h) * k) * damping;
            current.x += velocity.x;
            current.y += velocity.y;
            current.w += velocity.w;
            current.h += velocity.h;
            const snap =
                Math.abs(target.x - current.x) < 0.2 &&
                Math.abs(target.y - current.y) < 0.2 &&
                Math.abs(target.w - current.w) < 0.2 &&
                Math.abs(target.h - current.h) < 0.2 &&
                Math.abs(velocity.x) < 0.05 &&
                Math.abs(velocity.y) < 0.05 &&
                Math.abs(velocity.w) < 0.05 &&
                Math.abs(velocity.h) < 0.05;
            if (snap) {
                viewBoxRef.current = { ...target };
                viewBoxVelocity.current = { x: 0, y: 0, w: 0, h: 0 };
                setViewBox({ ...target });
                return;
            }
            viewBoxRef.current = { ...current };
            setViewBox({ ...current });
            raf = window.requestAnimationFrame(animate);
        };
        raf = window.requestAnimationFrame(animate);
        return () => window.cancelAnimationFrame(raf);
    }, [targetViewBox]);

    React.useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const onWheel = (event: WheelEvent) => {
            if (!event.ctrlKey) return;
            event.preventDefault();
            const next = Math.min(2.8, Math.max(0.6, stationZoom * (1 - event.deltaY * 0.002)));
            setStationZoom(next);
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [stationZoom]);

    const renderOrbitalHud = (cluster: SpaceCluster) => {
        if (!selectedMetrics || selectedMetrics.id !== cluster.id) return null;
        const maxWeight = selectedMetrics.maxWeight ?? Math.max(1, selectedMetrics.weight);
        const baseRadius = cluster.radius + 26;

        return (
            <g className="pointer-events-none" transform={`translate(${cluster.center.x} ${cluster.center.y})`}>
                <circle
                    r={baseRadius + 8}
                    cx={0}
                    cy={0}
                    fill="none"
                    stroke="rgba(255,255,255,0.25)"
                    strokeWidth={1.4}
                />
                {detailLevel >= 1 && (
                    <circle
                        r={baseRadius + 18}
                        cx={0}
                        cy={0}
                        fill="none"
                        stroke="rgba(255,255,255,0.18)"
                        strokeWidth={1.2}
                    />
                )}
                {(() => {
                    const rng = createSeededRandom(`${cluster.id}-glyph`);
                    const density = Math.max(6, Math.round((selectedMetrics.weight / maxWeight) * 22));
                    const ringR = baseRadius + 14;
                    return Array.from({ length: density }).map((_, idx) => {
                        const angle = rng() * TWO_PI;
                        const jitter = (rng() - 0.5) * 2.5;
                        const r = ringR + jitter;
                        const x = Math.cos(angle) * r;
                        const y = Math.sin(angle) * r;
                        return (
                            <circle
                                key={`glyph-dot-${cluster.id}-${idx}`}
                                cx={x}
                                cy={y}
                                r={1.3}
                                fill="rgba(255,255,255,0.35)"
                            />
                        );
                    });
                })()}
            </g>
        );
    };

    return (
        <div
            ref={containerRef}
            className={className ?? 'relative w-full h-full'}
            style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
                backgroundSize: '32px 32px'
            }}
        >
            <svg
                viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
                className="w-full h-full"
                role="img"
                aria-label="Global graph overview"
                preserveAspectRatio="xMidYMid meet"
                ref={svgRef}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >
                <defs>
                    <radialGradient id="gg-core" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
                    </radialGradient>
                </defs>

                {/* Level 0: ArcheNode -> Space Links */}
                {renderClusters.map(cluster => (
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

                {renderClusters.map(cluster => {
                    const isHighlight = highlightSpaceId === cluster.id;
                    const isSelected = selectedSpaceId === cluster.id;
                    const isActive = isHighlight || isSelected;
                    const clusterMap = new Map(cluster.clusters.map(h => [h.id, h]));

                    return (
                        <g
                            key={cluster.id}
                            className="cursor-pointer"
                            onPointerDown={(e) => startDrag(cluster.id, e)}
                            onClick={() => {
                                if (dragRef.current?.moved) return;
                                onSelectSpace?.(computeMetrics(cluster.id, showPlaygroundOnStation));
                            }}
                            onDoubleClick={() => spaceManager.loadSpace(cluster.id)}
                            onMouseEnter={() => setHighlightSpaceId(cluster.id)}
                            onMouseLeave={() => setHighlightSpaceId(null)}
                        >
                            <title>Double-click / Enter</title>
                            {isSelected && (
                                <g className="pointer-events-none">
                                    <circle
                                        cx={cluster.center.x}
                                        cy={cluster.center.y}
                                        r={cluster.radius + 18}
                                        fill="none"
                                        stroke="rgba(255,255,255,0.18)"
                                        strokeWidth={1.2}
                                    >
                                        <animate attributeName="stroke-opacity" values="0.12;0.4;0.12" dur="4.8s" repeatCount="indefinite" />
                                    </circle>
                                    <circle
                                        cx={cluster.center.x}
                                        cy={cluster.center.y}
                                        r={cluster.radius + 30}
                                        fill="none"
                                        stroke="rgba(255,255,255,0.12)"
                                        strokeWidth={1}
                                        strokeDasharray="6 10"
                                    >
                                        <animate attributeName="stroke-opacity" values="0.08;0.28;0.08" dur="6s" repeatCount="indefinite" />
                                        <animate attributeName="stroke-dashoffset" values="0;-64" dur="10s" repeatCount="indefinite" />
                                    </circle>
                                    <g>
                                        <circle
                                            cx={cluster.center.x + cluster.radius + 22}
                                            cy={cluster.center.y}
                                            r={2.2}
                                            fill="rgba(255,255,255,0.7)"
                                        />
                                        <animateTransform
                                            attributeName="transform"
                                            type="rotate"
                                            from={`0 ${cluster.center.x} ${cluster.center.y}`}
                                            to={`360 ${cluster.center.x} ${cluster.center.y}`}
                                            dur="18s"
                                            repeatCount="indefinite"
                                        />
                                    </g>
                                    <g>
                                        <circle
                                            cx={cluster.center.x + cluster.radius + 34}
                                            cy={cluster.center.y}
                                            r={1.6}
                                            fill="rgba(255,255,255,0.5)"
                                        />
                                        <animateTransform
                                            attributeName="transform"
                                            type="rotate"
                                            from={`360 ${cluster.center.x} ${cluster.center.y}`}
                                            to={`0 ${cluster.center.x} ${cluster.center.y}`}
                                            dur="28s"
                                            repeatCount="indefinite"
                                        />
                                    </g>
                                </g>
                            )}
                            {renderOrbitalHud(cluster)}
                            <circle
                                cx={cluster.center.x}
                                cy={cluster.center.y}
                                r={cluster.radius}
                                fill={isActive ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.02)'}
                                stroke={isActive ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.08)'}
                                strokeWidth={isActive ? 1.6 : 1}
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
                            {showStationLabels && (
                                <text
                                    x={cluster.center.x}
                                    y={cluster.center.y + cluster.radius + 16}
                                    fill={isActive ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)'}
                                    fontSize="10"
                                    textAnchor="middle"
                                    className="font-mono uppercase tracking-[0.3em]"
                                >
                                    {cluster.name}
                                </text>
                            )}

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
                            {detailLevel >= 1 && cluster.nodes
                                .filter(n => !n.parentClusterId)
                                .map(node => (
                                    <circle
                                        key={node.id}
                                        cx={node.x}
                                        cy={node.y}
                                        r={2}
                                        fill="rgba(255,255,255,0.45)"
                                    />
                                ))}
                            {detailLevel >= 2 && cluster.nodes
                                .filter(n => n.parentClusterId)
                                .map(node => (
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
                    L0
                </button>
                <button
                    onClick={() => setDetailLevel(1)}
                    className={`px-2 py-1 rounded-full transition-colors ${detailLevel === 1 ? 'bg-white/20 text-white' : 'hover:text-white/80'}`}
                >
                    L1
                </button>
                <button
                    onClick={() => setDetailLevel(2)}
                    className={`px-2 py-1 rounded-full transition-colors ${detailLevel === 2 ? 'bg-white/20 text-white' : 'hover:text-white/80'}`}
                >
                    L2
                </button>
            </div>
        </div >
    );
};

export default GlobalGraphOverview;
