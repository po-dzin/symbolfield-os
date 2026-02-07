import React from 'react';
import { spaceManager } from '../../core/state/SpaceManager';
import { eventBus, EVENTS } from '../../core/events/EventBus';
import type { NodeBase } from '../../core/types';
import { stationStorage, type StationLayout } from '../../core/storage/StationStorage';
import { useAppStore } from '../../store/useAppStore';
import { NODE_SIZES } from '../../utils/layoutMetrics';
import { GLOBAL_ZOOM_HOTKEY_EVENT, type ZoomHotkeyDetail } from '../../core/hotkeys/zoomHotkeys';

type DetailLevel = 0 | 1 | 2;

type SpaceCluster = {
    id: string;
    name: string;
    center: { x: number; y: number };
    corePoint: { x: number; y: number } | null;
    radius: number;
    hasCore: boolean;
    clusters: Array<{ id: string; x: number; y: number; parentClusterId?: string | undefined; color: string }>;
    nodes: Array<{ id: string; x: number; y: number; parentClusterId?: string | undefined; color: string }>;
    links: Array<{ id: string; x1: number; y1: number; x2: number; y2: number }>;
    areas: Array<
        | {
            id: string;
            shape: 'rect';
            rect: { x: number; y: number; w: number; h: number };
            color: string;
            borderColor: string;
            opacity: number;
        }
        | {
            id: string;
            shape: 'circle';
            circle: { cx: number; cy: number; r: number };
            color: string;
            borderColor: string;
            opacity: number;
        }
    >;
};

const DEFAULT_VIEWBOX = { x: -700, y: -700, w: 1400, h: 1400 };
const MIN_STATION_ZOOM = 0.25;
const MAX_STATION_ZOOM = 2.0;
const STATION_ZOOM_STEP = 0.25;
const ARCHECORE_RADIUS = 90;
const ARCHECORE_PADDING = 60;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const TWO_PI = Math.PI * 2;
const AREA_STORAGE_PREFIX = 'sf_areas_';

const clampStationZoom = (zoom: number) => Math.min(MAX_STATION_ZOOM, Math.max(MIN_STATION_ZOOM, zoom));

const getStationZoomStep = (zoom: number, direction: 'in' | 'out') => {
    const epsilon = 1e-6;
    if (direction === 'in') {
        const base = Math.floor((zoom + epsilon) / STATION_ZOOM_STEP) * STATION_ZOOM_STEP;
        return Math.min(MAX_STATION_ZOOM, Number((base + STATION_ZOOM_STEP).toFixed(2)));
    }
    const base = Math.ceil((zoom - epsilon) / STATION_ZOOM_STEP) * STATION_ZOOM_STEP;
    return Math.max(MIN_STATION_ZOOM, Number((base - STATION_ZOOM_STEP).toFixed(2)));
};

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

const renderRawLink = (x1: number, y1: number, x2: number, y2: number, key: string) => (
    <g key={key} className="pointer-events-none">
        <line
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={2}
            strokeLinecap="round"
            style={{ filter: 'blur(1.5px)' }}
        />
        <line
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="rgba(255,255,255,0.24)"
            strokeWidth={0.8}
            strokeLinecap="round"
        />
    </g>
);

const loadRawAreas = (spaceId: string) => {
    try {
        const raw = localStorage.getItem(`${AREA_STORAGE_PREFIX}${spaceId}`);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
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
        const rawAreas = loadRawAreas(space.id);

        const allNodes = [...coreNodes, ...nodes];
        const rawNodePointMap = new Map<string, { x: number; y: number }>(
            allNodes.map(node => [String(node.id), { x: node.position.x, y: node.position.y }])
        );

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
        if (allNodes.length === 0) {
            const emptyCluster: SpaceCluster = {
                id: space.id,
                name: space.name,
                center,
                corePoint: null,
                radius: clusterRadius,
                hasCore: false,
                clusters: [],
                nodes: [],
                links: [],
                areas: []
            };
            placed.push(emptyCluster);
            return emptyCluster;
        }

        // Project using a real envelope of the space: node size bounds + area bounds.
        // This keeps relative positions stable on station and avoids misplaced zones/nodes.
        let minX = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;

        const includeBounds = (x1: number, y1: number, x2: number, y2: number) => {
            minX = Math.min(minX, x1);
            minY = Math.min(minY, y1);
            maxX = Math.max(maxX, x2);
            maxY = Math.max(maxY, y2);
        };

        const getNodeRadius = (node: NodeBase) => {
            if (node.type === 'core') return NODE_SIZES.root / 2;
            if (node.type === 'cluster') return NODE_SIZES.cluster / 2;
            return NODE_SIZES.base / 2;
        };

        allNodes.forEach(node => {
            const r = getNodeRadius(node);
            includeBounds(
                node.position.x - r,
                node.position.y - r,
                node.position.x + r,
                node.position.y + r
            );
        });

        rawAreas.forEach((area: any) => {
            const anchorType = area?.anchor?.type;
            const anchorNode = anchorType === 'node' ? rawNodePointMap.get(String(area?.anchor?.nodeId ?? '')) : null;

            if (area?.shape === 'circle' && area?.circle && Number.isFinite(area.circle.r)) {
                const rawR = Number(area.circle.r);
                const rawCx = Number.isFinite(area.circle.cx) ? Number(area.circle.cx) : 0;
                const rawCy = Number.isFinite(area.circle.cy) ? Number(area.circle.cy) : 0;
                const cx = anchorNode ? anchorNode.x : rawCx;
                const cy = anchorNode ? anchorNode.y : rawCy;
                includeBounds(cx - rawR, cy - rawR, cx + rawR, cy + rawR);
                return;
            }

            if (area?.shape === 'rect' && area?.rect && Number.isFinite(area.rect.w) && Number.isFinite(area.rect.h)) {
                const rawW = Number(area.rect.w);
                const rawH = Number(area.rect.h);
                if (anchorNode) {
                    const cx = anchorNode.x;
                    const cy = anchorNode.y;
                    includeBounds(cx - rawW / 2, cy - rawH / 2, cx + rawW / 2, cy + rawH / 2);
                    return;
                }

                const rawX = Number.isFinite(area.rect.x) ? Number(area.rect.x) : 0;
                const rawY = Number.isFinite(area.rect.y) ? Number(area.rect.y) : 0;
                includeBounds(rawX, rawY, rawX + rawW, rawY + rawH);
            }
        });

        if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
            const xs = allNodes.map(n => n.position.x);
            const ys = allNodes.map(n => n.position.y);
            minX = Math.min(...xs);
            maxX = Math.max(...xs);
            minY = Math.min(...ys);
            maxY = Math.max(...ys);
        }

        const originX = (minX + maxX) / 2;
        const originY = (minY + maxY) / 2;

        const spanX = Math.max(1, maxX - minX);
        const spanY = Math.max(1, maxY - minY);
        const scale = (clusterRadius * 0.82) / Math.max(spanX, spanY, 1);

        const mapPoint = (x: number, y: number) => ({
            x: center.x + ((x - originX) * scale),
            y: center.y + ((y - originY) * scale)
        });

        const nodePointMap = new Map<string, { x: number; y: number }>(
            allNodes.map(node => [String(node.id), mapPoint(node.position.x, node.position.y)])
        );
        const projectedCorePoint = (() => {
            const core = coreNodes[0];
            if (!core) return null;
            return nodePointMap.get(String(core.id)) ?? mapPoint(core.position.x, core.position.y);
        })();

        const resolveNodeColor = (node: NodeBase) => {
            const body = typeof node.data?.color_body === 'string' ? node.data.color_body.trim() : '';
            const base = typeof node.data?.color === 'string' ? node.data.color.trim() : '';
            return body || base || 'rgba(255,255,255,0.5)';
        };

        const normalize = (targetNodes: NodeBase[]) => (
            targetNodes.map(node => {
                const mapped = nodePointMap.get(String(node.id)) ?? mapPoint(node.position.x, node.position.y);
                return {
                    id: node.id,
                    x: mapped.x,
                    y: mapped.y,
                    parentClusterId: node.meta?.parentClusterId as string | undefined,
                    color: resolveNodeColor(node)
                };
            })
        );

        const subClusters = nodes.filter(n => n.type === 'cluster');
        const leafNodes = nodes.filter(n => n.type !== 'cluster');

        const links = (data?.edges ?? [])
            .map((edge, edgeIndex) => {
                const edgeSource = String((edge as { source?: string; from?: string }).source ?? (edge as { source?: string; from?: string }).from ?? '');
                const edgeTarget = String((edge as { target?: string; to?: string }).target ?? (edge as { target?: string; to?: string }).to ?? '');
                if (!edgeSource || !edgeTarget) return null;
                const source = nodePointMap.get(edgeSource);
                const target = nodePointMap.get(edgeTarget);
                if (!source || !target) return null;
                return {
                    id: String((edge as { id?: string }).id ?? `legacy-${space.id}-${edgeIndex}`),
                    x1: source.x,
                    y1: source.y,
                    x2: target.x,
                    y2: target.y
                };
            })
            .filter((edge): edge is { id: string; x1: number; y1: number; x2: number; y2: number } => !!edge);

        const areas = rawAreas
            .map((area: any) => {
                const anchorType = area?.anchor?.type;
                const anchorNode = anchorType === 'node' ? nodePointMap.get(String(area?.anchor?.nodeId ?? '')) : null;
                const color = String(area?.color ?? 'rgba(255,255,255,0.08)');
                const borderColor = String(area?.borderColor ?? 'rgba(255,255,255,0.25)');
                const opacity = Number.isFinite(area?.opacity) ? Number(area.opacity) : 0.45;

                if (area?.shape === 'circle' && area?.circle && Number.isFinite(area.circle.r)) {
                    const rawCx = Number.isFinite(area.circle.cx) ? area.circle.cx : 0;
                    const rawCy = Number.isFinite(area.circle.cy) ? area.circle.cy : 0;
                    const rawR = Number(area.circle.r);
                    const mappedCenter = anchorNode
                        ? { x: anchorNode.x, y: anchorNode.y }
                        : mapPoint(rawCx, rawCy);
                    return {
                        id: String(area.id ?? crypto.randomUUID()),
                        shape: 'circle' as const,
                        circle: { cx: mappedCenter.x, cy: mappedCenter.y, r: Math.max(2, rawR * scale) },
                        color,
                        borderColor,
                        opacity
                    };
                }

                if (area?.shape === 'rect' && area?.rect && Number.isFinite(area.rect.w) && Number.isFinite(area.rect.h)) {
                    const rawW = Number(area.rect.w);
                    const rawH = Number(area.rect.h);
                    const scaledW = Math.max(2, rawW * scale);
                    const scaledH = Math.max(2, rawH * scale);
                    if (anchorNode) {
                        return {
                            id: String(area.id ?? crypto.randomUUID()),
                            shape: 'rect' as const,
                            rect: {
                                x: anchorNode.x - scaledW / 2,
                                y: anchorNode.y - scaledH / 2,
                                w: scaledW,
                                h: scaledH
                            },
                            color,
                            borderColor,
                            opacity
                        };
                    }

                    const mapped = mapPoint(Number(area.rect.x ?? 0), Number(area.rect.y ?? 0));
                    return {
                        id: String(area.id ?? crypto.randomUUID()),
                        shape: 'rect' as const,
                        rect: { x: mapped.x, y: mapped.y, w: scaledW, h: scaledH },
                        color,
                        borderColor,
                        opacity
                    };
                }
                return null;
            })
            .filter((area): area is SpaceCluster['areas'][number] => !!area);

        const cluster = {
            id: space.id,
            name: space.name,
            center,
            corePoint: projectedCorePoint,
            radius: clusterRadius,
            hasCore: coreNodes.length > 0,
            clusters: normalize(subClusters),
            nodes: normalize(leafNodes),
            links,
            areas
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
    const showGrid = useAppStore(state => state.showGrid);
    const showEdges = useAppStore(state => state.showEdges);
    const showHud = useAppStore(state => state.showHud);
    const drawerRightOpen = useAppStore(state => state.drawerRightOpen);
    const drawerRightWidth = useAppStore(state => state.drawerRightWidth);
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
                corePoint: cluster.corePoint
                    ? {
                        x: cluster.corePoint.x + offset.x,
                        y: cluster.corePoint.y + offset.y
                    }
                    : null,
                clusters: cluster.clusters.map(item => ({
                    ...item,
                    x: item.x + offset.x,
                    y: item.y + offset.y
                })),
                nodes: cluster.nodes.map(item => ({
                    ...item,
                    x: item.x + offset.x,
                    y: item.y + offset.y
                })),
                links: cluster.links.map(item => ({
                    ...item,
                    x1: item.x1 + offset.x,
                    y1: item.y1 + offset.y,
                    x2: item.x2 + offset.x,
                    y2: item.y2 + offset.y
                })),
                areas: cluster.areas.map(area => (
                    area.shape === 'rect'
                        ? {
                            ...area,
                            rect: {
                                x: area.rect.x + offset.x,
                                y: area.rect.y + offset.y,
                                w: area.rect.w,
                                h: area.rect.h
                            }
                        }
                        : {
                            ...area,
                            circle: {
                                cx: area.circle.cx + offset.x,
                                cy: area.circle.cy + offset.y,
                                r: area.circle.r
                            }
                        }
                ))
            };
        })
    ), [clusters, layoutOffsets]);

    const visibleClusters = React.useMemo(() => {
        if (showPlaygroundOnStation || !playgroundId) return clustersWithOffsets;
        return clustersWithOffsets.filter(cluster => cluster.id !== playgroundId);
    }, [clustersWithOffsets, showPlaygroundOnStation, playgroundId]);
    const stationHudSummary = React.useMemo(() => {
        let nodeCount = 0;
        let edgeCount = 0;
        let clusterCount = 0;
        visibleClusters.forEach(cluster => {
            nodeCount += cluster.nodes.length;
            edgeCount += cluster.links.length;
            clusterCount += cluster.clusters.length;
        });
        return {
            spaces: visibleClusters.length,
            nodes: nodeCount,
            edges: edgeCount,
            clusters: clusterCount
        };
    }, [visibleClusters]);
    const rightDrawerWidthToken = drawerRightWidth === 'sm'
        ? 'var(--panel-width-sm)'
        : drawerRightWidth === 'md'
            ? 'var(--panel-width-md)'
            : 'var(--panel-width-lg)';
    const stationHudRightInset = drawerRightOpen
        ? `calc(${rightDrawerWidthToken} + 24px)`
        : '24px';
    const [highlightSpaceId, setHighlightSpaceId] = React.useState<string | null>(null);
    const svgRef = React.useRef<SVGSVGElement | null>(null);
    const viewBoxRef = React.useRef({ ...DEFAULT_VIEWBOX });
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [stationZoom, setStationZoom] = React.useState(1);
    const [stationPan, setStationPan] = React.useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = React.useState(false);
    const stationZoomRef = React.useRef(stationZoom);
    const stationPanRef = React.useRef(stationPan);
    const draggingRef = React.useRef(false);
    const renderClustersRef = React.useRef<SpaceCluster[]>(visibleClusters);
    const [renderClusters, setRenderClusters] = React.useState<SpaceCluster[]>(visibleClusters);
    const suppressClusterClickRef = React.useRef<string | null>(null);
    const dragRef = React.useRef<null | {
        id: string;
        start: { x: number; y: number };
        base: { x: number; y: number };
        moved: boolean;
    }>(null);
    const panRef = React.useRef<null | {
        pointerId: number;
        startClient: { x: number; y: number };
        basePan: { x: number; y: number };
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
        stationZoomRef.current = stationZoom;
    }, [stationZoom]);

    React.useEffect(() => {
        stationPanRef.current = stationPan;
    }, [stationPan]);

    React.useEffect(() => {
        setStationPan({ x: 0, y: 0 });
    }, [focusedSpaceId]);

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
                const corePoint = (() => {
                    if (!space.corePoint) return null;
                    if (!prev.corePoint) return space.corePoint;
                    const x = lerp(prev.corePoint.x, space.corePoint.x, t);
                    const y = lerp(prev.corePoint.y, space.corePoint.y, t);
                    maxDelta = Math.max(maxDelta, Math.abs(space.corePoint.x - x), Math.abs(space.corePoint.y - y));
                    return { x, y };
                })();

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

                const nextLinks = space.links.map(link => {
                    const prevLink = prev.links.find(item => item.id === link.id);
                    if (!prevLink) return link;
                    const x1 = lerp(prevLink.x1, link.x1, t);
                    const y1 = lerp(prevLink.y1, link.y1, t);
                    const x2 = lerp(prevLink.x2, link.x2, t);
                    const y2 = lerp(prevLink.y2, link.y2, t);
                    maxDelta = Math.max(maxDelta, Math.abs(link.x1 - x1), Math.abs(link.y1 - y1), Math.abs(link.x2 - x2), Math.abs(link.y2 - y2));
                    return { ...link, x1, y1, x2, y2 };
                });

                const nextAreas = space.areas.map(area => {
                    const prevArea = prev.areas.find(item => item.id === area.id && item.shape === area.shape);
                    if (!prevArea) return area;
                    if (area.shape === 'rect' && prevArea.shape === 'rect') {
                        const x = lerp(prevArea.rect.x, area.rect.x, t);
                        const y = lerp(prevArea.rect.y, area.rect.y, t);
                        const w = lerp(prevArea.rect.w, area.rect.w, t);
                        const h = lerp(prevArea.rect.h, area.rect.h, t);
                        maxDelta = Math.max(maxDelta, Math.abs(area.rect.x - x), Math.abs(area.rect.y - y));
                        return { ...area, rect: { x, y, w, h } };
                    }
                    if (area.shape === 'circle' && prevArea.shape === 'circle') {
                        const cx = lerp(prevArea.circle.cx, area.circle.cx, t);
                        const cy = lerp(prevArea.circle.cy, area.circle.cy, t);
                        const r = lerp(prevArea.circle.r, area.circle.r, t);
                        maxDelta = Math.max(maxDelta, Math.abs(area.circle.cx - cx), Math.abs(area.circle.cy - cy));
                        return { ...area, circle: { cx, cy, r } };
                    }
                    return area;
                });

                return {
                    ...space,
                    center: { x: cx, y: cy },
                    corePoint,
                    radius,
                    clusters: nextClusters,
                    nodes: nextNodes,
                    links: nextLinks,
                    areas: nextAreas
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

    const buildTargetViewBox = React.useCallback((zoomInput: number, panInput: { x: number; y: number }) => {
        const zoom = clampStationZoom(zoomInput);
        if (!focusedSpaceId) {
            const w = DEFAULT_VIEWBOX.w / zoom;
            const h = DEFAULT_VIEWBOX.h / zoom;
            const centerX = (DEFAULT_VIEWBOX.x + DEFAULT_VIEWBOX.w / 2) + panInput.x;
            const centerY = (DEFAULT_VIEWBOX.y + DEFAULT_VIEWBOX.h / 2) + panInput.y;
            return {
                x: centerX - w / 2,
                y: centerY - h / 2,
                w,
                h
            };
        }
        const cluster = visibleClusters.find(item => item.id === focusedSpaceId);
        if (!cluster) return DEFAULT_VIEWBOX;
        const size = Math.max(360, cluster.radius * 3.2) / zoom;
        return {
            x: cluster.center.x + panInput.x - size / 2,
            y: cluster.center.y + panInput.y - size / 2,
            w: size,
            h: size
        };
    }, [focusedSpaceId, visibleClusters]);

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

    const zoomAroundPoint = React.useCallback((nextZoomInput: number, clientX: number, clientY: number) => {
        const nextZoom = clampStationZoom(nextZoomInput);
        const host = containerRef.current;
        if (!host) {
            setStationZoom(nextZoom);
            return;
        }
        const rect = host.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
            setStationZoom(nextZoom);
            return;
        }

        const nx = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        const ny = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
        const currentView = viewBoxRef.current;
        const worldX = currentView.x + currentView.w * nx;
        const worldY = currentView.y + currentView.h * ny;

        const currentPan = stationPanRef.current;
        const nextBase = buildTargetViewBox(nextZoom, currentPan);
        const worldAfterX = nextBase.x + nextBase.w * nx;
        const worldAfterY = nextBase.y + nextBase.h * ny;
        const nextPan = {
            x: currentPan.x + (worldX - worldAfterX),
            y: currentPan.y + (worldY - worldAfterY)
        };

        stationPanRef.current = nextPan;
        stationZoomRef.current = nextZoom;
        setStationPan(nextPan);
        setStationZoom(nextZoom);
    }, [buildTargetViewBox]);

    const startDrag = (spaceId: string, e: React.PointerEvent<SVGGElement>) => {
        e.stopPropagation();
        const start = toSvgPoint(e.clientX, e.clientY);
        const base = layoutOffsets[spaceId] ?? { x: 0, y: 0 };
        dragRef.current = { id: spaceId, start, base, moved: false };
        draggingRef.current = true;
        (e.currentTarget as SVGGElement).setPointerCapture(e.pointerId);
    };

    const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
        if (e.pointerType === 'touch') {
            if (!pinchRef.current) {
                pinchRef.current = {
                    pointers: new Map(),
                    startDistance: 0,
                    startZoom: stationZoomRef.current,
                };
            }
            pinchRef.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (pinchRef.current.pointers.size === 2) {
                const pts = Array.from(pinchRef.current.pointers.values());
                const [p0, p1] = pts;
                if (!p0 || !p1) {
                    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
                    return;
                }
                const dx = p0.x - p1.x;
                const dy = p0.y - p1.y;
                pinchRef.current.startDistance = Math.max(1, Math.hypot(dx, dy));
                pinchRef.current.startZoom = stationZoomRef.current;
                panRef.current = null;
                setIsPanning(false);
            }
            (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
            return;
        }

        if (e.button !== 0) return;
        if (e.target !== e.currentTarget) return;
        panRef.current = {
            pointerId: e.pointerId,
            startClient: { x: e.clientX, y: e.clientY },
            basePan: stationPanRef.current,
            moved: false
        };
        setIsPanning(true);
        (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
        if (e.pointerType === 'touch' && pinchRef.current) {
            const pinch = pinchRef.current;
            if (pinch.pointers.has(e.pointerId)) {
                pinch.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            }
            if (pinch.pointers.size === 2) {
                const pts = Array.from(pinch.pointers.values());
                const [p0, p1] = pts;
                if (!p0 || !p1) return;
                const dx = p0.x - p1.x;
                const dy = p0.y - p1.y;
                const dist = Math.max(1, Math.hypot(dx, dy));
                const ratio = dist / Math.max(1, pinch.startDistance);
                if (Number.isFinite(ratio) && ratio > 0) {
                    const nextZoom = clampStationZoom(pinch.startZoom * ratio);
                    const cx = (p0.x + p1.x) / 2;
                    const cy = (p0.y + p1.y) / 2;
                    zoomAroundPoint(nextZoom, cx, cy);
                }
                return;
            }
        }

        if (panRef.current && panRef.current.pointerId === e.pointerId) {
            const svg = svgRef.current;
            if (!svg) return;
            const rect = svg.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return;
            const dx = e.clientX - panRef.current.startClient.x;
            const dy = e.clientY - panRef.current.startClient.y;
            if (Math.hypot(dx, dy) > 1.5) {
                panRef.current.moved = true;
            }
            const currentView = viewBoxRef.current;
            const scaleX = currentView.w / rect.width;
            const scaleY = currentView.h / rect.height;
            const nextPan = {
                x: panRef.current.basePan.x - dx * scaleX,
                y: panRef.current.basePan.y - dy * scaleY
            };
            stationPanRef.current = nextPan;
            setStationPan(nextPan);
            return;
        }

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
            const safeOffset = offset ?? { x: 0, y: 0 };
            const nextCenter = {
                x: baseCluster.center.x + safeOffset.x,
                y: baseCluster.center.y + safeOffset.y
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

    const handlePointerUp = (event?: React.PointerEvent<SVGSVGElement>) => {
        if (event?.pointerType === 'touch' && pinchRef.current) {
            pinchRef.current.pointers.delete(event.pointerId);
            if (pinchRef.current.pointers.size < 2) {
                pinchRef.current = null;
            }
        }
        if (panRef.current && (!event || panRef.current.pointerId === event.pointerId)) {
            panRef.current = null;
            setIsPanning(false);
        }

        if (!dragRef.current) return;
        const finishedDrag = dragRef.current;
        stationStorage.saveStationLayout(layoutOffsets);
        dragRef.current = null;
        draggingRef.current = false;
        if (finishedDrag.moved) {
            suppressClusterClickRef.current = finishedDrag.id;
            window.setTimeout(() => {
                if (suppressClusterClickRef.current === finishedDrag.id) {
                    suppressClusterClickRef.current = null;
                }
            }, 0);
        }
    };

    const targetViewBox = React.useMemo(
        () => buildTargetViewBox(stationZoom, stationPan),
        [buildTargetViewBox, stationZoom, stationPan]
    );

    const fitStationToContent = React.useCallback(() => {
        const host = containerRef.current;
        if (!host) return;
        const rect = host.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        let minX = -ARCHECORE_RADIUS;
        let minY = -ARCHECORE_RADIUS;
        let maxX = ARCHECORE_RADIUS;
        let maxY = ARCHECORE_RADIUS;

        visibleClusters.forEach(cluster => {
            minX = Math.min(minX, cluster.center.x - cluster.radius);
            minY = Math.min(minY, cluster.center.y - cluster.radius);
            maxX = Math.max(maxX, cluster.center.x + cluster.radius);
            maxY = Math.max(maxY, cluster.center.y + cluster.radius);
        });

        const boundsW = Math.max(1, maxX - minX);
        const boundsH = Math.max(1, maxY - minY);
        const padding = 80;
        const availableW = Math.max(1, rect.width - padding * 2);
        const availableH = Math.max(1, rect.height - padding * 2);
        const nextZoom = clampStationZoom(Math.min(availableW / boundsW, availableH / boundsH));
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const nextPan = { x: centerX, y: centerY };

        stationPanRef.current = nextPan;
        stationZoomRef.current = nextZoom;
        setStationPan(nextPan);
        setStationZoom(nextZoom);
    }, [visibleClusters]);

    const [viewBox, setViewBox] = React.useState(DEFAULT_VIEWBOX);

    React.useEffect(() => {
        viewBoxRef.current = { ...targetViewBox };
        setViewBox({ ...targetViewBox });
    }, [targetViewBox]);

    const pinchRef = React.useRef<null | {
        pointers: Map<number, { x: number; y: number }>;
        startDistance: number;
        startZoom: number;
    }>(null);

    React.useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const GESTURE_WHEEL_GUARD_MS = 120;
        let gestureActive = false;
        let lastGestureEventTs = 0;
        let lastGestureChangeTs = 0;
        let gestureFallbackTimer: number | null = null;
        const markGestureWindow = () => {
            gestureActive = true;
            lastGestureEventTs = Date.now();
            if (gestureFallbackTimer) {
                window.clearTimeout(gestureFallbackTimer);
            }
            // Safari sometimes fails to deliver gestureend; don't let the guard window get stuck.
            gestureFallbackTimer = window.setTimeout(() => {
                gestureActive = false;
            }, 240);
        };
        const normalizeWheelDelta = (event: WheelEvent, pageHeight: number) => {
            const modeFactor = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? pageHeight : 1;
            return {
                dx: event.deltaX * modeFactor,
                dy: event.deltaY * modeFactor
            };
        };

        const preventWheelZoom = (event: WheelEvent) => {
            if (event.ctrlKey || event.metaKey) event.preventDefault();
        };

        const debugPinch = () => {
            try {
                return window.localStorage.getItem('sf_debug_pinch') === '1';
            } catch {
                return false;
            }
        };

        const wheelZoomEnabled = () => {
            try {
                return window.localStorage.getItem('sf_wheel_zoom') === '1';
            } catch {
                return false;
            }
        };

        let lastWheelZoomTs = 0;

        const handleWheel = (event: WheelEvent) => {
            const root = containerRef.current;
            if (!root) return;
            const target = event.target as Node | null;
            if (!target || !root.contains(target)) return;

            const now = Date.now();
            const inNativeGestureWindow = (now - lastGestureChangeTs) < GESTURE_WHEEL_GUARD_MS;
            const wantsZoom = wheelZoomEnabled() || event.ctrlKey || event.metaKey;
            
            // Heuristic: If we are zooming, track it.
            // If we stop zooming, we might get some "tail" inertia events without ctrlKey.
            // We want to ignore those for a short time to prevent "jerky pan".
            const shouldZoom = wantsZoom && !inNativeGestureWindow;

            if (debugPinch()) {
                const anyEvent = event as unknown as {
                    wheelDelta?: number;
                    wheelDeltaX?: number;
                    wheelDeltaY?: number;
                    webkitDirectionInvertedFromDevice?: boolean;
                    sourceCapabilities?: unknown;
                };
                // eslint-disable-next-line no-console
                console.log('[sf pinch][station] wheel', {
                    ctrlKey: event.ctrlKey,
                    metaKey: event.metaKey,
                    shiftKey: event.shiftKey,
                    altKey: event.altKey,
                    wheelZoomEnabled: wheelZoomEnabled(),
                    deltaX: event.deltaX,
                    deltaY: event.deltaY,
                    deltaZ: event.deltaZ,
                    deltaMode: event.deltaMode,
                    wheelDelta: anyEvent.wheelDelta,
                    wheelDeltaX: anyEvent.wheelDeltaX,
                    wheelDeltaY: anyEvent.wheelDeltaY,
                    invertedFromDevice: anyEvent.webkitDirectionInvertedFromDevice,
                    sourceCapabilities: anyEvent.sourceCapabilities,
                    inNativeGestureWindow,
                    shouldZoom,
                    sinceLastZoom: now - lastWheelZoomTs
                });
            }

            event.preventDefault();
            event.stopPropagation();
            
            if (inNativeGestureWindow) return;

            const rect = root.getBoundingClientRect();
            const normalized = normalizeWheelDelta(event, Math.max(1, rect.height));

            if (shouldZoom) {
                lastWheelZoomTs = now;
                const currentZoom = stationZoomRef.current;
                // Increased sensitivity from 0.0022 to 0.005 for stronger pinch
                const factor = Math.exp(-normalized.dy * 0.005);
                const next = clampStationZoom(currentZoom * factor);
                if (Math.abs(next - currentZoom) < 0.0001) return;
                zoomAroundPoint(next, event.clientX, event.clientY);
                return;
            }

            // Cooldown for Pan to prevent "tail"
            if (now - lastWheelZoomTs < 200) {
                return;
            }

            if (rect.width <= 0 || rect.height <= 0) return;
            const currentView = viewBoxRef.current;
            const scaleX = currentView.w / rect.width;
            const scaleY = currentView.h / rect.height;
            const nextPan = {
                x: stationPanRef.current.x + normalized.dx * scaleX,
                y: stationPanRef.current.y + normalized.dy * scaleY
            };
            stationPanRef.current = nextPan;
            setStationPan(nextPan);
        };

        const handleGlobalWheelCapture = (event: WheelEvent) => {
            if (debugPinch()) {
                const root = containerRef.current;
                const target = event.target as Node | null;
                const inside = Boolean(root && target && root.contains(target));
                const anyEvent = event as unknown as {
                    wheelDelta?: number;
                    wheelDeltaX?: number;
                    wheelDeltaY?: number;
                    webkitDirectionInvertedFromDevice?: boolean;
                    sourceCapabilities?: unknown;
                };
                // eslint-disable-next-line no-console
                console.log('[sf pinch][station] window wheel', {
                    inside,
                    ctrlKey: event.ctrlKey,
                    metaKey: event.metaKey,
                    shiftKey: event.shiftKey,
                    altKey: event.altKey,
                    deltaX: event.deltaX,
                    deltaY: event.deltaY,
                    deltaZ: event.deltaZ,
                    deltaMode: event.deltaMode
                    ,
                    wheelDelta: anyEvent.wheelDelta,
                    wheelDeltaX: anyEvent.wheelDeltaX,
                    wheelDeltaY: anyEvent.wheelDeltaY,
                    invertedFromDevice: anyEvent.webkitDirectionInvertedFromDevice,
                    sourceCapabilities: anyEvent.sourceCapabilities
                });
            }
            handleWheel(event);
        };

        let lastGestureScale = 1;
        const handleGestureStart = (event: Event) => {
            const e = event as unknown as { preventDefault: () => void; scale?: number };
            const scale = typeof e.scale === 'number' ? e.scale : null;
            if (scale === null || !Number.isFinite(scale) || scale <= 0) return;
            e.preventDefault();
            markGestureWindow();
            lastGestureScale = scale;
            if (debugPinch()) {
                // eslint-disable-next-line no-console
                console.log('[sf pinch][station] gesturestart', { scale });
            }
        };
        const handleGestureChange = (event: Event) => {
            const e = event as unknown as {
                preventDefault: () => void;
                scale?: number;
                clientX?: number;
                clientY?: number;
            };
            const scale = typeof e.scale === 'number' ? e.scale : null;
            if (scale === null || !Number.isFinite(scale) || scale <= 0) return;
            e.preventDefault();
            markGestureWindow();
            lastGestureChangeTs = Date.now();
            const ratio = scale / Math.max(0.0001, lastGestureScale);
            lastGestureScale = scale;
            if (debugPinch()) {
                // eslint-disable-next-line no-console
                console.log('[sf pinch][station] gesturechange', { scale, ratio });
            }
            if (!Number.isFinite(ratio) || ratio <= 0) return;
            const currentZoom = stationZoomRef.current;
            const nextZoom = clampStationZoom(currentZoom * ratio);
            if (Math.abs(nextZoom - currentZoom) < 0.0001) return;
            const rect = el.getBoundingClientRect();
            const clientX = typeof e.clientX === 'number' ? e.clientX : rect.left + rect.width / 2;
            const clientY = typeof e.clientY === 'number' ? e.clientY : rect.top + rect.height / 2;
            zoomAroundPoint(nextZoom, clientX, clientY);
        };
        const handleGestureEnd = (event: Event) => {
            const e = event as unknown as { preventDefault: () => void };
            if (!gestureActive) return;
            e.preventDefault();
            gestureActive = false;
            lastGestureEventTs = Date.now();
            lastGestureScale = 1;
            if (debugPinch()) {
                // eslint-disable-next-line no-console
                console.log('[sf pinch][station] gestureend');
            }
            if (gestureFallbackTimer) {
                window.clearTimeout(gestureFallbackTimer);
                gestureFallbackTimer = null;
            }
        };

        el.addEventListener('wheel', preventWheelZoom, { passive: false });
        el.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('wheel', handleGlobalWheelCapture, { passive: false, capture: true });
        window.addEventListener('gesturestart', handleGestureStart as EventListener, { passive: false });
        window.addEventListener('gesturechange', handleGestureChange as EventListener, { passive: false });
        window.addEventListener('gestureend', handleGestureEnd as EventListener, { passive: false });
        document.addEventListener('gesturestart', handleGestureStart as EventListener, { passive: false });
        document.addEventListener('gesturechange', handleGestureChange as EventListener, { passive: false });
        document.addEventListener('gestureend', handleGestureEnd as EventListener, { passive: false });

        return () => {
            el.removeEventListener('wheel', preventWheelZoom);
            el.removeEventListener('wheel', handleWheel);
            window.removeEventListener('wheel', handleGlobalWheelCapture, true);
            window.removeEventListener('gesturestart', handleGestureStart as EventListener);
            window.removeEventListener('gesturechange', handleGestureChange as EventListener);
            window.removeEventListener('gestureend', handleGestureEnd as EventListener);
            document.removeEventListener('gesturestart', handleGestureStart as EventListener);
            document.removeEventListener('gesturechange', handleGestureChange as EventListener);
            document.removeEventListener('gestureend', handleGestureEnd as EventListener);
            if (gestureFallbackTimer) {
                window.clearTimeout(gestureFallbackTimer);
            }
        };
    }, [zoomAroundPoint]);

    React.useEffect(() => {
        const onGlobalZoomHotkey = (event: Event) => {
            const detail = (event as CustomEvent<ZoomHotkeyDetail>).detail;
            if (!detail) return;
            const host = containerRef.current;
            const rect = host?.getBoundingClientRect();
            const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
            const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;

            switch (detail.command) {
                case 'zoom_in': {
                    const next = getStationZoomStep(stationZoomRef.current, 'in');
                    zoomAroundPoint(next, cx, cy);
                    break;
                }
                case 'zoom_out': {
                    const next = getStationZoomStep(stationZoomRef.current, 'out');
                    zoomAroundPoint(next, cx, cy);
                    break;
                }
                case 'zoom_reset':
                    stationPanRef.current = { x: 0, y: 0 };
                    stationZoomRef.current = 1;
                    setStationPan({ x: 0, y: 0 });
                    setStationZoom(1);
                    break;
                case 'zoom_fit':
                    fitStationToContent();
                    break;
            }
        };

        window.addEventListener(GLOBAL_ZOOM_HOTKEY_EVENT, onGlobalZoomHotkey as (event: Event) => void);
        return () => window.removeEventListener(GLOBAL_ZOOM_HOTKEY_EVENT, onGlobalZoomHotkey as (event: Event) => void);
    }, [fitStationToContent, zoomAroundPoint]);

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
                touchAction: 'none',
                backgroundImage: showGrid ? 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)' : 'none',
                backgroundSize: '32px 32px'
            }}
        >
            <svg
                viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
                className={`w-full h-full ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
                role="img"
                aria-label="Global graph overview"
                preserveAspectRatio="xMidYMid meet"
                ref={svgRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >
                <defs>
                    <radialGradient id="gg-core" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
                    </radialGradient>
                </defs>

                {/* Level 0/1: ArcheNode -> Space Links */}
                {showEdges && renderClusters.map(cluster => {
                    const target = cluster.corePoint ?? cluster.center;
                    return renderLink(
                        0,
                        0,
                        target.x,
                        target.y,
                        40,
                        cluster.hasCore ? 10 : 0,
                        `link-root-${cluster.id}`
                    );
                })}

                <circle cx="0" cy="0" r="90" fill="url(#gg-core)" stroke="rgba(255,255,255,0.08)" />
                <circle cx="0" cy="0" r="45" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={3} />
                <circle cx="0" cy="0" r="40" fill="none" stroke="rgba(255,255,255,0.78)" strokeWidth={3} />
                <circle cx="0" cy="0" r="28" fill="rgba(255,255,255,0.9)" />
                {showStationLabels && (
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
                )}

                {renderClusters.map(cluster => {
                    const isHighlight = highlightSpaceId === cluster.id;
                    const isSelected = selectedSpaceId === cluster.id;
                    const isActive = isHighlight || isSelected;
                    const coreAnchor = cluster.corePoint ?? cluster.center;

                    return (
                        <g
                            key={cluster.id}
                            className="cursor-pointer"
                            onPointerDown={(e) => startDrag(cluster.id, e)}
                            onClick={() => {
                                if (suppressClusterClickRef.current === cluster.id) {
                                    suppressClusterClickRef.current = null;
                                    return;
                                }
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
                            {showEdges && detailLevel >= 1 && (
                                <>
                                    {cluster.clusters.map(sub =>
                                        renderLink(coreAnchor.x, coreAnchor.y, sub.x, sub.y, 10, 6, `link-${cluster.id}-c-${sub.id}`, true)
                                    )}
                                </>
                            )}

                            {detailLevel >= 2 && cluster.areas.map(area => (
                                area.shape === 'rect' ? (
                                    <rect
                                        key={`area-${cluster.id}-${area.id}`}
                                        x={area.rect.x}
                                        y={area.rect.y}
                                        width={area.rect.w}
                                        height={area.rect.h}
                                        rx={10}
                                        fill={area.color}
                                        fillOpacity={typeof area.color === 'string' && area.color.startsWith('rgba') ? 1 : Math.min(0.85, Math.max(0.15, area.opacity))}
                                        stroke={area.borderColor}
                                        strokeOpacity={0.72}
                                        strokeWidth={1}
                                    />
                                ) : (
                                    <circle
                                        key={`area-${cluster.id}-${area.id}`}
                                        cx={area.circle.cx}
                                        cy={area.circle.cy}
                                        r={area.circle.r}
                                        fill={area.color}
                                        fillOpacity={typeof area.color === 'string' && area.color.startsWith('rgba') ? 1 : Math.min(0.85, Math.max(0.15, area.opacity))}
                                        stroke={area.borderColor}
                                        strokeOpacity={0.72}
                                        strokeWidth={1}
                                    />
                                )
                            ))}

                            {showEdges && detailLevel >= 2 && cluster.links.map(link =>
                                renderRawLink(link.x1, link.y1, link.x2, link.y2, `link-real-${cluster.id}-${link.id}`)
                            )}

                            {cluster.hasCore && (
                                <>
                                    <circle
                                        cx={coreAnchor.x}
                                        cy={coreAnchor.y}
                                        r={10}
                                        fill="rgba(255,255,255,0.12)"
                                        stroke="rgba(255,255,255,0.35)"
                                        strokeWidth={1}
                                    />
                                    <circle
                                        cx={coreAnchor.x}
                                        cy={coreAnchor.y}
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
                                        fill={node.color}
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
                                    fill={node.color}
                                />
                            ))}
                        </g>
                    );
                })}
            </svg>

            {showHud && (
                <div
                    className="absolute flex flex-wrap items-center justify-end gap-2 text-[10px] uppercase tracking-[0.25em] text-white/70 pointer-events-none transition-all duration-200"
                    style={{ right: stationHudRightInset, bottom: '104px' }}
                >
                    <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1">
                        Spaces {stationHudSummary.spaces}
                    </div>
                    <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1">
                        Nodes {stationHudSummary.nodes}
                    </div>
                    <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1">
                        Links {stationHudSummary.edges}
                    </div>
                    <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1">
                        Clusters {stationHudSummary.clusters}
                    </div>
                </div>
            )}

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
