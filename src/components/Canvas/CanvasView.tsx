/**
 * CanvasView.jsx
 * The infinite canvas that renders the Graph.
 * Handles input routing to GestureRouter.
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { useGraphStore } from '../../store/useGraphStore';
import { useAppStore } from '../../store/useAppStore';
import { gestureRouter } from '../../core/interaction/GestureRouter';
import { TOOLS } from '../../core/state/StateEngine';
import { stateEngine } from '../../core/state/StateEngine';
import NodeRenderer from './NodeRenderer';
import EdgeRenderer from './EdgeRenderer';
import InteractionLayer from './InteractionLayer';
import { eventBus, EVENTS, type BusEvent } from '../../core/events/EventBus';
import { graphEngine } from '../../core/graph/GraphEngine';
import { useCameraStore } from '../../store/useCameraStore';
import { screenToWorld } from '../../utils/coords';
import { GRID_METRICS, NODE_SIZES } from '../../utils/layoutMetrics';
import { useEdgeSelectionStore } from '../../store/useEdgeSelectionStore';
import { useAreaStore } from '../../store/useAreaStore';
import { selectionState } from '../../core/state/SelectionState';
import GlyphIcon from '../Icon/GlyphIcon';
import { asNodeId, type Edge, type NodeId } from '../../core/types';
import { spaceManager } from '../../core/state/SpaceManager';
import { getCoreId, getCoreLabel } from '../../core/defaults/coreIds';
import { GLOBAL_ZOOM_HOTKEY_EVENT, type ZoomHotkeyDetail } from '../../core/hotkeys/zoomHotkeys';
import { getSystemMotionMetrics } from '../../core/ui/SystemMotion';

type DomEventListener = (event: Event) => void;

const setDocumentBodyCursor = (value: string) => {
    if (typeof document === 'undefined') return;
    document.body.style.cursor = value;
};

const CanvasView = () => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const nodes = useGraphStore(state => state.nodes);
    const edges = useGraphStore(state => state.edges);
    const updateNode = useGraphStore(state => state.updateNode);
    const areas = useAreaStore(state => state.areas);
    const selectedAreaIds = useAreaStore(state => state.selectedAreaIds);
    const focusedAreaId = useAreaStore(state => state.focusedAreaId);
    const setFocusedAreaId = useAreaStore(state => state.setFocusedAreaId);
    const clearFocusedArea = useAreaStore(state => state.clearFocusedArea);
    const setSelectedAreaId = useAreaStore(state => state.setSelectedAreaId);
    const toggleSelectedArea = useAreaStore(state => state.toggleSelectedArea);
    const updateArea = useAreaStore(state => state.updateArea);
    const _removeArea = useAreaStore(state => state.removeArea);
    const activeTool = useAppStore(state => state.activeTool);
    const showGrid = useAppStore(state => state.showGrid);
    const showEdges = useAppStore(state => state.showEdges);
    const showHud = useAppStore(state => state.showHud);
    const showCounters = useAppStore(state => state.showCounters);
    const gridStepMul = useAppStore(state => state.gridStepMul);
    const subspaceLod = useAppStore(state => state.subspaceLod);
    const setSubspaceLod = useAppStore(state => state.setSubspaceLod);
    const themeMotion = useAppStore(state => state.themeMotion);
    const themeSpeed = useAppStore(state => state.themeSpeed);
    const currentSpaceId = useAppStore(state => state.currentSpaceId);
    const fieldScopeId = useAppStore(state => state.fieldScopeId);
    const viewContext = useAppStore(state => state.viewContext);
    const setViewContext = useAppStore(state => state.setViewContext);
    const { pan, zoom, centerOn } = useCameraStore();
    const setPan = useCameraStore(state => state.setPan);
    const setZoom = useCameraStore(state => state.setZoom);
    const [isSmooth, setIsSmooth] = React.useState(false);
    const [undoSmooth, setUndoSmooth] = React.useState(false);
    const sourceSize = NODE_SIZES.root;

    const handleSourceDoubleClick = React.useCallback(() => {
        if (!currentSpaceId) return;
        const coreId = getCoreId(currentSpaceId);
        if (graphEngine.getNode(asNodeId(coreId))) return;
        const spaceName = spaceManager.getSpaceMeta(currentSpaceId)?.name ?? 'Space';
        const coreNodeId = asNodeId(coreId);
        graphEngine.addNode({
            id: coreNodeId,
            type: 'core',
            position: { x: 0, y: 0 },
            data: { label: getCoreLabel(spaceName) },
            meta: { spaceId: currentSpaceId, role: 'core' }
        });
        selectionState.select(coreNodeId);
    }, [currentSpaceId]);
    const [zoomPulse, setZoomPulse] = React.useState<'out' | 'reset' | 'in' | 'fit' | null>(null);
    const lastHoverEdgeId = useRef<string | null>(null);
    const [hoverAreaId, setHoverAreaId] = React.useState<string | null>(null);
    const [spacePanArmed, setSpacePanArmed] = React.useState(false);
    const [anchorAnimatingIds, setAnchorAnimatingIds] = React.useState<Set<string>>(new Set());
    const anchorStateRef = React.useRef<Map<string, string>>(new Map());
    const anchorAnimationTimersRef = React.useRef<Map<string, number>>(new Map());
    const [editingRegionId, setEditingRegionId] = React.useState<string | null>(null);
    const [regionNameDraft, setRegionNameDraft] = React.useState('');
    const sortedAreas = useMemo(() => [...areas].sort((a, b) => a.zIndex - b.zIndex), [areas]);
    const undoSmoothTimerRef = useRef<number | null>(null);
    const motionMetricsRef = useRef(getSystemMotionMetrics(themeMotion, themeSpeed));
    const [areaInteraction, setAreaInteraction] = React.useState<null | {
        type: 'move' | 'resize' | 'resize-ring';
        areaId: string;
        startX: number;
        startY: number;
        startRect?: { x: number; y: number; w: number; h: number };
        startCircle?: { cx: number; cy: number; r: number };
        startNodes?: { id: NodeId; x: number; y: number }[];
        startAreas?: { id: string; rect?: { x: number; y: number; w: number; h: number }; circle?: { cx: number; cy: number; r: number } }[];
        pendingSingleSelect?: boolean;
        hasDragged?: boolean;
        ringId?: string;
        handle?: 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w' | 'radius';
    }>(null);
    const interactionCursorRef = useRef<string | null>(null);

    const isSpacePressed = useRef(false);
    const regionPalette = useMemo(() => ([
        { fill: 'var(--semantic-color-text-primary)', opacity: 0.06, stroke: 'var(--semantic-color-text-primary)' },
        { fill: 'var(--primitive-color-intent-info)', opacity: 0.08, stroke: 'var(--primitive-color-intent-info)' },
        { fill: 'var(--primitive-color-intent-accent)', opacity: 0.08, stroke: 'var(--primitive-color-intent-accent)' },
        { fill: 'var(--primitive-color-intent-warning)', opacity: 0.08, stroke: 'var(--primitive-color-intent-warning)' },
        { fill: 'var(--primitive-color-intent-success)', opacity: 0.08, stroke: 'var(--primitive-color-intent-success)' }
    ]), []);

    const snapToGrid = (value: number, cell: number) => Math.round(value / cell) * cell;

    useEffect(() => {
        motionMetricsRef.current = getSystemMotionMetrics(themeMotion, themeSpeed);
    }, [themeMotion, themeSpeed]);

    // Keep keyboard routing independent from wheel/gesture setup so cluster scope
    // always receives canvas hotkeys, even if pointer listeners are delayed.
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest('input, textarea, [contenteditable="true"]')) {
                return;
            }
            if (e.code === 'Space') {
                isSpacePressed.current = true;
                setSpacePanArmed(true);
            }
            if ((e.key === 'Escape' || e.key === 'Esc' || e.code === 'Escape') && stateEngine.getState().fieldScopeId) {
                stateEngine.setFieldScope(null);
                return;
            }
            if (e.defaultPrevented && (e.metaKey || e.ctrlKey)) {
                return;
            }
            gestureRouter.handleKeyDown(e);
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                isSpacePressed.current = false;
                setSpacePanArmed(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const getAreaCenter = (area: (typeof areas)[number]) => {
        if (area.shape !== 'circle') return null;
        if (area.anchor.type === 'node') {
            const anchorNode = graphEngine.getNode(asNodeId(area.anchor.nodeId));
            if (anchorNode) {
                return { cx: anchorNode.position.x, cy: anchorNode.position.y };
            }
        }
        return { cx: area.circle?.cx ?? 0, cy: area.circle?.cy ?? 0 };
    };

    const getAreaRectBounds = (area: (typeof areas)[number]) => {
        if (area.shape !== 'rect' || !area.rect) return null;
        if (area.anchor.type === 'node') {
            const anchorNode = graphEngine.getNode(asNodeId(area.anchor.nodeId));
            if (anchorNode) {
                return {
                    x: anchorNode.position.x - area.rect.w / 2,
                    y: anchorNode.position.y - area.rect.h / 2,
                    w: area.rect.w,
                    h: area.rect.h
                };
            }
        }
        return area.rect;
    };

    const getCircleBoundsRadius = (area: (typeof areas)[number]) => {
        if (area.shape !== 'circle' || !area.circle) return 0;
        const ringMax = area.rings?.reduce((max, ring) => Math.max(max, ring.r), area.circle.r) ?? area.circle.r;
        return Math.max(area.circle.r, ringMax);
    };

    const _addRing = (areaId: string) => {
        const area = areas.find(item => item.id === areaId);
        if (!area || area.shape !== 'circle' || !area.circle) return;
        const rings = area.rings ? [...area.rings] : [];
        const next = getCircleBoundsRadius(area) + GRID_METRICS.cell;
        rings.push({ id: crypto.randomUUID(), r: next });
        updateArea(areaId, { rings });
    };

    const _removeRing = (areaId: string) => {
        const area = areas.find(item => item.id === areaId);
        if (!area || !area.rings || area.rings.length === 0) return;
        updateArea(areaId, { rings: area.rings.slice(0, -1) });
    };

    const _toggleAnchorToNode = (areaId: string) => {
        const area = areas.find(item => item.id === areaId);
        if (!area) return;
        const selectedNodes = selectionState.getSelection();
        const isAnchored = area.anchor.type === 'node';
        const activeNodeId = selectedNodes.length === 1 ? selectedNodes[0] : null;
        const anchorNodeId = area.anchor.type === 'node' ? area.anchor.nodeId : null;
        const anchorNode = anchorNodeId ? graphEngine.getNode(asNodeId(anchorNodeId)) : null;
        const targetNode = activeNodeId ? graphEngine.getNode(activeNodeId) : null;

        const getCenteredRect = () => {
            if (!targetNode || area.shape !== 'rect' || !area.rect) return null;
            return {
                x: targetNode.position.x - area.rect.w / 2,
                y: targetNode.position.y - area.rect.h / 2
            };
        };

        if (isAnchored && anchorNode) {
            if (!targetNode || anchorNode.id === targetNode.id) {
                if (area.shape === 'circle' && area.circle) {
                    updateArea(areaId, {
                        anchor: { type: 'canvas' },
                        circle: {
                            cx: anchorNode.position.x,
                            cy: anchorNode.position.y,
                            r: area.circle.r
                        }
                    });
                    return;
                }
                if (area.shape === 'rect' && area.rect) {
                    const rect = getAreaRectBounds(area);
                    updateArea(areaId, {
                        anchor: { type: 'canvas' },
                        rect: {
                            x: rect?.x ?? area.rect.x,
                            y: rect?.y ?? area.rect.y,
                            w: area.rect.w,
                            h: area.rect.h
                        }
                    });
                    return;
                }
            }
        }

        if (!targetNode) return;
        const centeredRect = getCenteredRect();
        if (area.shape === 'circle' && area.circle) {
            updateArea(areaId, {
                anchor: { type: 'node', nodeId: targetNode.id, attach: 'center', follow: 'position', offset: { dx: 0, dy: 0 } },
                circle: { cx: targetNode.position.x, cy: targetNode.position.y, r: area.circle.r }
            });
            return;
        }
        if (area.shape === 'rect' && area.rect) {
            updateArea(areaId, {
                anchor: { type: 'node', nodeId: targetNode.id, attach: 'center', follow: 'position', offset: { dx: 0, dy: 0 } },
                rect: {
                    ...area.rect,
                    x: centeredRect?.x ?? area.rect.x,
                    y: centeredRect?.y ?? area.rect.y
                }
            });
        }
    };

    React.useEffect(() => {
        const currentIds = new Set<string>();
        const nextAnimating = new Set<string>();

        areas.forEach(area => {
            if (area.shape !== 'circle') return;
            currentIds.add(area.id);
            const anchorKey = area.anchor.type === 'node' ? `node:${area.anchor.nodeId}` : 'canvas';
            const prevKey = anchorStateRef.current.get(area.id);
            if (prevKey && prevKey !== anchorKey) {
                nextAnimating.add(area.id);
                const existing = anchorAnimationTimersRef.current.get(area.id);
                if (existing) window.clearTimeout(existing);
                const timeoutId = window.setTimeout(() => {
                    setAnchorAnimatingIds(prev => {
                        const updated = new Set(prev);
                        updated.delete(area.id);
                        return updated;
                    });
                    anchorAnimationTimersRef.current.delete(area.id);
                }, 240);
                anchorAnimationTimersRef.current.set(area.id, timeoutId);
            }
            anchorStateRef.current.set(area.id, anchorKey);
        });

        anchorStateRef.current.forEach((_value, id) => {
            if (!currentIds.has(id)) {
                anchorStateRef.current.delete(id);
                const existing = anchorAnimationTimersRef.current.get(id);
                if (existing) window.clearTimeout(existing);
                anchorAnimationTimersRef.current.delete(id);
            }
        });

        if (nextAnimating.size > 0) {
            setAnchorAnimatingIds(prev => {
                const updated = new Set(prev);
                nextAnimating.forEach(id => updated.add(id));
                return updated;
            });
        }
    }, [areas]);

    const _alignRegionToGrid = (areaId: string) => {
        const area = areas.find(r => r.id === areaId);
        if (!area || area.shape !== 'rect') return;
        const rect = getAreaRectBounds(area);
        if (!rect) return;
        const cell = GRID_METRICS.cell * gridStepMul;
        const bounds = {
            x: snapToGrid(rect.x, cell),
            y: snapToGrid(rect.y, cell),
            w: Math.max(cell, snapToGrid(rect.w, cell)),
            h: Math.max(cell, snapToGrid(rect.h, cell))
        };
        updateArea(areaId, { rect: bounds });
    };

    const _bringAreaToFront = (areaId: string) => {
        const maxZ = Math.max(0, ...areas.map(a => a.zIndex ?? 0));
        updateArea(areaId, { zIndex: maxZ + 1 });
    };

    const _sendAreaToBack = (areaId: string) => {
        const minZ = Math.min(0, ...areas.map(a => a.zIndex ?? 0));
        updateArea(areaId, { zIndex: minZ - 1 });
    };

    const _fitAreaToSelection = (areaId: string) => {
        const area = areas.find(a => a.id === areaId);
        if (!area || area.shape !== 'rect') return;
        const selection = selectionState.getSelection();
        if (selection.length === 0) return;

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        selection.forEach(id => {
            const node = graphEngine.getNode(id);
            if (!node) return;
            const radius = node.type === 'core'
                ? NODE_SIZES.root / 2
                : node.type === 'cluster'
                    ? NODE_SIZES.cluster / 2
                    : NODE_SIZES.base / 2;
            minX = Math.min(minX, node.position.x - radius);
            minY = Math.min(minY, node.position.y - radius);
            maxX = Math.max(maxX, node.position.x + radius);
            maxY = Math.max(maxY, node.position.y + radius);
        });

        if (!isFinite(minX)) return;
        const padding = GRID_METRICS.cell * 2;
        updateArea(areaId, {
            rect: {
                x: minX - padding,
                y: minY - padding,
                w: (maxX - minX) + padding * 2,
                h: (maxY - minY) + padding * 2
            }
        });
    };

    const _cycleRegionColor = (areaId: string) => {
        const area = areas.find(r => r.id === areaId);
        if (!area) return;
        const currentIndex = regionPalette.findIndex(
            palette => palette.fill === area.color && palette.stroke === area.borderColor
        );
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % regionPalette.length : 0;
        const next = regionPalette[nextIndex];
        if (!next) return;
        updateArea(areaId, { color: next.fill, borderColor: next.stroke });
    };

    const _beginRenameRegion = (areaId: string, currentName: string) => {
        setEditingRegionId(areaId);
        setRegionNameDraft(currentName);
    };

    const _focusArea = (areaId: string) => {
        const area = areas.find(a => a.id === areaId);
        if (!area || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        let bounds = { x: 0, y: 0, w: 0, h: 0 };
        if (area.shape === 'rect') {
            const rectBounds = getAreaRectBounds(area);
            if (rectBounds) bounds = rectBounds;
        } else if (area.shape === 'circle' && area.circle) {
            const center = getAreaCenter(area);
            const radius = getCircleBoundsRadius(area);
            const cx = center?.cx ?? 0;
            const cy = center?.cy ?? 0;
            bounds = { x: cx - radius, y: cy - radius, w: radius * 2, h: radius * 2 };
        }
        const padding = GRID_METRICS.cell * 4;
        const availableW = Math.max(1, rect.width - padding * 2);
        const availableH = Math.max(1, rect.height - padding * 2);
        const nextZoom = Math.min(availableW / bounds.w, availableH / bounds.h);
        const clampedZoom = Math.min(Math.max(nextZoom, 0.25), 2.0);
        const centerX = bounds.x + bounds.w / 2;
        const centerY = bounds.y + bounds.h / 2;
        setZoom(clampedZoom);
        setPan({
            x: rect.width / 2 - centerX * clampedZoom,
            y: rect.height / 2 - centerY * clampedZoom
        });
        setFocusedAreaId(areaId);
    };

    const commitRegionName = () => {
        if (!editingRegionId) return;
        updateArea(editingRegionId, { title: regionNameDraft.trim() || 'Area' });
        setEditingRegionId(null);
    };

    const startAreaMove = (areaId: string, e: React.PointerEvent, preserveSelection = false) => {
        const area = areas.find(item => item.id === areaId);
        if (!area) return;
        if (!preserveSelection) {
            setSelectedAreaId(areaId);
        }
        if (area.locked || activeTool === TOOLS.LINK) return;
        if (area.anchor.type === 'node') return;
        const proj = getProjection(e);
        const nodeSelection = selectionState.getSelection();
        const startNodes = nodeSelection.map(id => {
            const node = graphEngine.getNode(id);
            if (!node || node.type === 'core') return null;
            return node ? { id, x: node.position.x, y: node.position.y } : null;
        }).filter((item): item is { id: NodeId; x: number; y: number } => Boolean(item));
        const activeAreaIds = preserveSelection ? selectedAreaIds : [areaId];
        const startAreas = activeAreaIds.map(id => {
            const target = areas.find(item => item.id === id);
            if (!target || target.anchor.type === 'node') return null;
            const rect = target.shape === 'rect' && target.rect ? { ...target.rect } : null;
            const circle = target.shape === 'circle' && target.circle
                ? {
                    cx: getAreaCenter(target)?.cx ?? 0,
                    cy: getAreaCenter(target)?.cy ?? 0,
                    r: target.circle.r
                }
                : null;
            return {
                id,
                ...(rect ? { rect } : {}),
                ...(circle ? { circle } : {})
            };
        }).filter((item): item is { id: string; rect?: { x: number; y: number; w: number; h: number }; circle?: { cx: number; cy: number; r: number } } => Boolean(item));
        const pendingSingleSelect = !e.shiftKey;
        if (area.shape === 'rect' && area.rect) {
            setAreaInteraction({
                type: 'move',
                areaId,
                startX: proj.worldX,
                startY: proj.worldY,
                startRect: { ...area.rect },
                ...(startNodes.length > 0 ? { startNodes } : {}),
                ...(startAreas.length > 0 ? { startAreas } : {}),
                pendingSingleSelect,
                hasDragged: false
            });
        }
        if (area.shape === 'circle' && area.circle) {
            const center = getAreaCenter(area);
            const cx = center?.cx ?? 0;
            const cy = center?.cy ?? 0;
            setAreaInteraction({
                type: 'move',
                areaId,
                startX: proj.worldX,
                startY: proj.worldY,
                startCircle: { cx, cy, r: area.circle.r },
                ...(startNodes.length > 0 ? { startNodes } : {}),
                ...(startAreas.length > 0 ? { startAreas } : {}),
                pendingSingleSelect,
                hasDragged: false
            });
        }
        containerRef.current?.setPointerCapture(e.pointerId);
    };

    const startAreaResize = (areaId: string, handle: 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w' | 'radius', e: React.PointerEvent) => {
        const area = areas.find(item => item.id === areaId);
        if (!area || area.locked || activeTool === TOOLS.LINK) return;
        setSelectedAreaId(areaId);
        const proj = getProjection(e);
        if (area.shape === 'rect' && area.rect) {
            setAreaInteraction({
                type: 'resize',
                areaId,
                startX: proj.worldX,
                startY: proj.worldY,
                startRect: { ...area.rect },
                handle
            });
        }
        if (area.shape === 'circle' && area.circle) {
            const center = getAreaCenter(area);
            const cx = center?.cx ?? 0;
            const cy = center?.cy ?? 0;
            setAreaInteraction({
                type: 'resize',
                areaId,
                startX: proj.worldX,
                startY: proj.worldY,
                startCircle: { cx, cy, r: area.circle.r },
                handle: 'radius'
            });
        }
        containerRef.current?.setPointerCapture(e.pointerId);
    };

    // Calculate Rendered Edges (including Proxy Links for folded clusters)
    const renderedEdges = useMemo(() => {
        const nodeMap = new Map(nodes.map(n => [n.id, n]));

        // Helper: Find the nearest visible ancestor (or self if visible)
        // Returns null if the entire branch is hidden (shouldn't happen for valid graph) or core is hidden
        const getVisibleAncestor = (nodeId: string): string | null => {
            let current = nodeMap.get(asNodeId(nodeId));
            const visited = new Set<string>();
            while (current) {
                if (visited.has(current.id)) return null; // Circular Loop safety
                visited.add(current.id);

                if (!current.meta?.isHidden) return current.id;

                if (!current.meta?.parentClusterId) return null; // Hidden but no parent? Orphaned hidden node.
                current = nodeMap.get(current.meta.parentClusterId as NodeId);
            }
            return null;
        };

        const proxyEdges: Edge[] = [];
        const seenProxies = new Set<string>();

        // 1. Process all real edges
        // If an edge connects two visible nodes, keep it (EdgeRenderer handles hidden-check for normal edges, 
        //   but we can also filter here for purity, or let EdgeRenderer do it. 
        //   EdgeRenderer returns null if ends are hidden, so passing real edges is fine).
        // If an edge connects involving hidden nodes, we calculate proxies.

        edges.forEach(edge => {
            const sourceVisibleId = getVisibleAncestor(edge.source);
            const targetVisibleId = getVisibleAncestor(edge.target);

            // If either end effectively disappears (orphan hidden), we skip
            if (!sourceVisibleId || !targetVisibleId) return;

            // If resolved IDs match original IDs, it's a normal edge (or fully visible). 
            // We let the standard render pass handle it (EdgeRenderer checks isHidden props).
            // BUT: If the standard render pass checks `node.meta.isHidden`, and returns null,
            // we effectively don't render it.
            // If we have a proxy situation (e.g. Source is hidden, SourceAncestor is visible),
            // then `sourceVisibleId !== edge.source`.

            const isProxy = sourceVisibleId !== edge.source || targetVisibleId !== edge.target;

            if (isProxy) {
                // If both map to the SAME visible ancestor, it's an internal link within the folded cluster. Hide it.
                if (sourceVisibleId === targetVisibleId) return;

                // Create Proxy Edge
                // We use a deterministic ID based on the resolved visible nodes
                // Sort to ensure directionless uniqueness if needed, but edges are usually directed.
                // For visual proxy, standardizing direction A->B (lexicographical) helps dedup.
                const [a, b] = [sourceVisibleId, targetVisibleId].sort();
                const proxyId = `proxy-${a}-${b}`;

                if (!seenProxies.has(proxyId)) {
                    seenProxies.add(proxyId);
                    proxyEdges.push({
                        id: proxyId,
                        source: sourceVisibleId,
                        target: targetVisibleId,
                        type: 'associative'
                    } as Edge);
                }
            }
        });

        // Return real edges + proxies
        return [...edges, ...proxyEdges];
    }, [nodes, edges]);

    // Helper to get local and world coords
    const getProjection = (e: { clientX: number; clientY: number }) => {
        if (!containerRef.current) return { x: 0, y: 0, worldX: 0, worldY: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        const world = screenToWorld(e.clientX, e.clientY, rect, { pan, zoom });
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            worldX: world.x,
            worldY: world.y
        };
    };

    const pinchRef = useRef<null | {
        pointers: Map<number, { x: number; y: number }>;
        startDistance: number;
    }>(null);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.pointerType === 'touch') {
            if (!pinchRef.current) {
                pinchRef.current = {
                    pointers: new Map(),
                    startDistance: 0,
                };
            }
            pinchRef.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            e.currentTarget.setPointerCapture(e.pointerId);

            // Only intercept when a real 2-finger pinch begins.
            // Single-finger touch should continue through the normal gesture pipeline.
            if (pinchRef.current.pointers.size === 2) {
                e.preventDefault();
                const pts = Array.from(pinchRef.current.pointers.values());
                const [p0, p1] = pts;
                if (!p0 || !p1) return;
                const dx = p0.x - p1.x;
                const dy = p0.y - p1.y;
                pinchRef.current.startDistance = Math.max(1, Math.hypot(dx, dy));

                // If the first touch already started a router interaction (drag/box-select/etc),
                // end it now so it doesn't interfere with pinch (we skip router pointer-up for pinches).
                const proj = getProjection(e);
                gestureRouter.handlePointerUp({
                    x: proj.worldX,
                    y: proj.worldY,
                    screenX: proj.x,
                    screenY: proj.y,
                    targetType: 'empty',
                    targetId: null,
                    modifiers: {
                        alt: false,
                        shift: false,
                        ctrl: false,
                        meta: false,
                        space: false
                    }
                });
                return;
            }
        }
        const proj = getProjection(e);

        // Basic normalized gesture object
        const target = e.target as Element | null;
        const edgeEl = target?.closest('[data-edge-id]');
        const nodeEl = target?.closest('[data-node-id]');
        const labelEl = target?.closest('[data-part="label"]');
        const targetType: 'node' | 'edge' | 'empty' = nodeEl ? 'node' : edgeEl ? 'edge' : 'empty';

        if (activeTool === TOOLS.POINTER) {
            const allowFill = targetType === 'empty';
            const hitBorder = (areaId: string) => {
                const area = areas.find(item => item.id === areaId);
                if (!area) return false;
                const hit = 10;
                if (area.shape === 'rect') {
                    const rect = getAreaRectBounds(area);
                    if (!rect) return false;
                    const x = proj.worldX;
                    const y = proj.worldY;
                    const left = rect.x;
                    const top = rect.y;
                    const right = left + rect.w;
                    const bottom = top + rect.h;
                    const inside = x >= left && x <= right && y >= top && y <= bottom;
                    if (!inside) return false;
                    if (allowFill) return true;
                    return (
                        Math.abs(x - left) <= hit ||
                        Math.abs(x - right) <= hit ||
                        Math.abs(y - top) <= hit ||
                        Math.abs(y - bottom) <= hit
                    );
                }
                if (area.shape === 'circle' && area.circle) {
                    const center = getAreaCenter(area);
                    const cx = center?.cx ?? 0;
                    const cy = center?.cy ?? 0;
                    const radius = getCircleBoundsRadius(area);
                    const dx = proj.worldX - cx;
                    const dy = proj.worldY - cy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (allowFill && dist <= radius) return true;
                    return Math.abs(dist - radius) <= hit;
                }
                return false;
            };

            const orderedAreas = [...areas].sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0));
            const hitArea = orderedAreas.find(item => hitBorder(item.id));
            if (hitArea) {
                e.stopPropagation();
                if (e.shiftKey) {
                    toggleSelectedArea(hitArea.id);
                    return;
                }
                const hasNodeSelection = selectionState.getSelection().length > 0;
                const keepMulti = selectedAreaIds.includes(hitArea.id) && (selectedAreaIds.length > 1 || hasNodeSelection);
                if (!keepMulti) {
                    // clear on click, not on drag
                }
                startAreaMove(hitArea.id, e, keepMulti);
                return;
            }
        }

        const gesture = {
            ...proj,
            x: proj.worldX, // Router now works primarily in world space
            y: proj.worldY,
            screenX: proj.x,
            screenY: proj.y,
            button: e.button,
            modifiers: {
                shift: e.shiftKey,
                ctrl: e.ctrlKey,
                alt: e.altKey,
                meta: e.metaKey,
                space: isSpacePressed.current,
                doubleClick: e.detail === 2
            },
            targetType,
            targetPart: labelEl ? 'label' : null,
            targetId: nodeEl
                ? nodeEl.getAttribute('data-node-id')
                : edgeEl
                    ? edgeEl.getAttribute('data-edge-id')
                    : null
        };

        // Capture pointer to ensure Move/Up fire even if leaving window/container
        e.currentTarget.setPointerCapture(e.pointerId);

        gestureRouter.handlePointerDown(gesture);
        if (isSpacePressed.current) {
            setDocumentBodyCursor('grabbing');
        }
    };

    const getResizeCursor = (handle?: 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w' | 'radius') => {
        if (!handle) return 'grabbing';
        if (handle === 'n' || handle === 's') return 'ns-resize';
        if (handle === 'e' || handle === 'w' || handle === 'radius') return 'ew-resize';
        return handle === 'nw' || handle === 'se' ? 'nwse-resize' : 'nesw-resize';
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.pointerType === 'touch' && pinchRef.current) {
            const pinch = pinchRef.current;
            if (pinch.pointers.has(e.pointerId)) {
                pinch.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            }
            if (pinch.pointers.size === 2) {
                e.preventDefault();
                const pts = Array.from(pinch.pointers.values());
                const [p0, p1] = pts;
                if (!p0 || !p1) return;
                const dx = p0.x - p1.x;
                const dy = p0.y - p1.y;
                const dist = Math.max(1, Math.hypot(dx, dy));
                const ratio = dist / Math.max(1, pinch.startDistance);
                if (Number.isFinite(ratio) && ratio > 0.0001) {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect) {
                        const cx = (p0.x + p1.x) / 2;
                        const cy = (p0.y + p1.y) / 2;
                        const delta = -Math.log(ratio) / 0.0022;
                        useCameraStore.getState().zoomAt(cx, cy, delta, rect);
                    }
                    pinch.startDistance = dist;
                }
                return;
            }
        }
        if (!areaInteraction) {
            const target = e.target as HTMLElement | null;
            const areaEl = target?.closest('[data-area-id]');
            const nextHoverId = areaEl ? areaEl.getAttribute('data-area-id') : null;
            if (nextHoverId !== hoverAreaId) {
                setHoverAreaId(nextHoverId);
            }
            if (nextHoverId) {
                setDocumentBodyCursor('pointer');
            } else if (!isSpacePressed.current) {
                if (!interactionCursorRef.current) {
                    setDocumentBodyCursor('');
                }
            }
        } else {
            setDocumentBodyCursor(areaInteraction.type === 'move'
                ? 'grabbing'
                : getResizeCursor(areaInteraction.handle));
        }
        const proj = getProjection(e);
        if (areaInteraction) {
            const area = areas.find(item => item.id === areaInteraction.areaId);
            if (!area) return;
            const dx = proj.worldX - areaInteraction.startX;
            const dy = proj.worldY - areaInteraction.startY;
            if (!areaInteraction.hasDragged) {
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 2) {
                    setAreaInteraction({ ...areaInteraction, hasDragged: true });
                }
            }
            if (areaInteraction.type === 'move') {
                if (areaInteraction.startAreas && areaInteraction.startAreas.length > 0) {
                    areaInteraction.startAreas.forEach(entry => {
                        if (entry.rect) {
                            updateArea(entry.id, {
                                rect: {
                                    x: entry.rect.x + dx,
                                    y: entry.rect.y + dy,
                                    w: entry.rect.w,
                                    h: entry.rect.h
                                }
                            });
                        } else if (entry.circle) {
                            updateArea(entry.id, {
                                circle: {
                                    cx: entry.circle.cx + dx,
                                    cy: entry.circle.cy + dy,
                                    r: entry.circle.r
                                }
                            });
                        }
                    });
                } else if (area.shape === 'rect' && areaInteraction.startRect) {
                    updateArea(area.id, {
                        rect: {
                            x: areaInteraction.startRect.x + dx,
                            y: areaInteraction.startRect.y + dy,
                            w: areaInteraction.startRect.w,
                            h: areaInteraction.startRect.h
                        }
                    });
                } else if (area.shape === 'circle' && areaInteraction.startCircle) {
                    updateArea(area.id, {
                        circle: {
                            cx: areaInteraction.startCircle.cx + dx,
                            cy: areaInteraction.startCircle.cy + dy,
                            r: areaInteraction.startCircle.r
                        }
                    });
                }
                if (areaInteraction.startNodes) {
                    areaInteraction.startNodes.forEach(node => {
                        graphEngine.updateNode(node.id, {
                            position: { x: node.x + dx, y: node.y + dy }
                        });
                    });
                }
            }
            if (areaInteraction.type === 'resize' && area.shape === 'rect' && areaInteraction.startRect) {
                const minSize = GRID_METRICS.cell * 2;
                let { x, y, w, h } = areaInteraction.startRect;
                if (areaInteraction.handle === 'nw') {
                    x += dx;
                    y += dy;
                    w -= dx;
                    h -= dy;
                } else if (areaInteraction.handle === 'ne') {
                    y += dy;
                    w += dx;
                    h -= dy;
                } else if (areaInteraction.handle === 'se') {
                    w += dx;
                    h += dy;
                } else if (areaInteraction.handle === 'sw') {
                    x += dx;
                    w -= dx;
                    h += dy;
                } else if (areaInteraction.handle === 'n') {
                    y += dy;
                    h -= dy;
                } else if (areaInteraction.handle === 'e') {
                    w += dx;
                } else if (areaInteraction.handle === 's') {
                    h += dy;
                } else if (areaInteraction.handle === 'w') {
                    x += dx;
                    w -= dx;
                }
                w = Math.max(minSize, w);
                h = Math.max(minSize, h);
                updateArea(area.id, { rect: { x, y, w, h } });
            }
            if (areaInteraction.type === 'resize' && area.shape === 'circle' && areaInteraction.startCircle) {
                const cx = areaInteraction.startCircle.cx;
                const cy = areaInteraction.startCircle.cy;
                const dxr = proj.worldX - cx;
                const dyr = proj.worldY - cy;
                const r = Math.max(GRID_METRICS.cell, Math.sqrt(dxr * dxr + dyr * dyr));
                updateArea(area.id, { circle: { cx, cy, r } });
            }
            if (areaInteraction.type === 'resize-ring' && area.shape === 'circle' && areaInteraction.ringId) {
                const center = getAreaCenter(area);
                const cx = center?.cx ?? 0;
                const cy = center?.cy ?? 0;
                const dxr = proj.worldX - cx;
                const dyr = proj.worldY - cy;
                const r = Math.max(GRID_METRICS.cell, Math.sqrt(dxr * dxr + dyr * dyr));
                const rings = area.rings?.map(ring => (
                    ring.id === areaInteraction.ringId ? { ...ring, r } : ring
                )) ?? [];
                updateArea(area.id, { rings });
            }
            return;
        }
        const hitEl = document.elementFromPoint(e.clientX, e.clientY);
        const edgeEl = hitEl?.closest('[data-edge-id]');
        const edgeId = edgeEl ? edgeEl.getAttribute('data-edge-id') : null;
        if (edgeId !== lastHoverEdgeId.current) {
            lastHoverEdgeId.current = edgeId;
            useEdgeSelectionStore.getState().setHover(edgeId);
        }
        gestureRouter.handlePointerMove({
            x: proj.worldX,
            y: proj.worldY,
            screenX: proj.x,
            screenY: proj.y,
            modifiers: {
                space: isSpacePressed.current
            }
        });
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        let skipRouterPointerUp = false;
        if (e.pointerType === 'touch' && pinchRef.current) {
            const wasPinching = pinchRef.current.pointers.size >= 2;
            pinchRef.current.pointers.delete(e.pointerId);
            if (pinchRef.current.pointers.size < 2) {
                pinchRef.current = null;
            }
            // If this touch sequence participated in a pinch, don't treat the end as a click/select.
            skipRouterPointerUp = wasPinching;
        }
        const proj = getProjection(e);
        if (areaInteraction) {
            if (!areaInteraction.hasDragged && areaInteraction.pendingSingleSelect) {
                selectionState.clear();
                useEdgeSelectionStore.getState().clear();
                setSelectedAreaId(areaInteraction.areaId);
            }
            setAreaInteraction(null);
            return;
        }
        if (isSpacePressed.current) {
            setDocumentBodyCursor('grab');
        } else if (!interactionCursorRef.current) {
            setDocumentBodyCursor('');
        }

        // Manual Hit Test
        const hitEl = document.elementFromPoint(e.clientX, e.clientY);
        const edgeEl = hitEl?.closest('[data-edge-id]');
        const nodeEl = hitEl?.closest('[data-node-id]');
        const targetType: 'node' | 'edge' | 'empty' = nodeEl ? 'node' : edgeEl ? 'edge' : 'empty';
        const targetId = nodeEl
            ? nodeEl.getAttribute('data-node-id')
            : edgeEl
                ? edgeEl.getAttribute('data-edge-id')
                : null;

        if (!skipRouterPointerUp) {
            gestureRouter.handlePointerUp({
                x: proj.worldX,
                y: proj.worldY,
                screenX: proj.x,
                screenY: proj.y,
                targetType,
                targetId,
                modifiers: {
                    alt: e.altKey,
                    shift: e.shiftKey,
                    ctrl: e.ctrlKey,
                    meta: e.metaKey,
                    space: isSpacePressed.current
                }
            });
        }
    };

    useEffect(() => {
        const onInteractionStart = (e: BusEvent<'UI_INTERACTION_START'>) => {
            const type = e.payload?.type;
            if (!type) return;
            if (['DRAG_NODES', 'PAN', 'LINK_DRAG', 'BOX_SELECT', 'REGION_DRAW'].includes(type)) {
                interactionCursorRef.current = 'grabbing';
                setDocumentBodyCursor('grabbing');
            }
        };
        const onInteractionEnd = (e: BusEvent<'UI_INTERACTION_END'>) => {
            const type = e.payload?.type;
            if (!type) return;
            if (['DRAG_NODES', 'PAN', 'LINK_DRAG', 'BOX_SELECT', 'REGION_DRAW'].includes(type)) {
                interactionCursorRef.current = null;
                setDocumentBodyCursor(isSpacePressed.current ? 'grab' : '');
            }
        };
        const unsubStart = eventBus.on('UI_INTERACTION_START', onInteractionStart);
        const unsubEnd = eventBus.on('UI_INTERACTION_END', onInteractionEnd);
        return () => {
            unsubStart();
            unsubEnd();
        };
    }, []);

    const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (stateEngine.getState().viewContext === 'node') return;
        if (nodes.length === 0 && currentSpaceId && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const { pan, zoom } = useCameraStore.getState();
            const sourceScreenX = rect.left + pan.x;
            const sourceScreenY = rect.top + pan.y;
            const dx = e.clientX - sourceScreenX;
            const dy = e.clientY - sourceScreenY;
            const sourceHitRadiusPx = (sourceSize / 2) * zoom;
            if ((dx * dx + dy * dy) <= sourceHitRadiusPx * sourceHitRadiusPx) {
                handleSourceDoubleClick();
                return;
            }
        }
        const proj = getProjection(e);
        const hitEl = document.elementFromPoint(e.clientX, e.clientY);

        // Prevent "Enter Now" if double-clicking the label (reserved for edit)
        if (hitEl?.closest('[data-part="label"]')) {
            return;
        }

        let nodeEl = hitEl?.closest('[data-node-id]');
        let nodeId = nodeEl ? nodeEl.getAttribute('data-node-id') : null;
        if (!nodeId) {
            const { pan, zoom } = useCameraStore.getState();
            for (const node of nodes) {
                const sizePx = node.type === 'core' ? NODE_SIZES.root : node.type === 'cluster' ? NODE_SIZES.cluster : NODE_SIZES.base;
                const screenX = node.position.x * zoom + pan.x;
                const screenY = node.position.y * zoom + pan.y;
                const radius = (sizePx / 2) * zoom;
                const dx = proj.x - screenX;
                const dy = proj.y - screenY;
                if ((dx * dx + dy * dy) <= radius * radius) {
                    nodeId = node.id;
                    break;
                }
            }
        }
        if (nodeId) {
            const resolvedId = asNodeId(nodeId);
            const node = graphEngine.getNode(resolvedId);
            if (node?.type === 'cluster') {
                stateEngine.toggleClusterScope(resolvedId);
                return;
            }
            if (node) eventBus.emit('UI_SIGNAL', { x: node.position.x, y: node.position.y, type: 'OPEN_NODE' });
            stateEngine.enterNode(resolvedId);
            return;
        }
        gestureRouter.handlePointerDown({
            ...proj,
            x: proj.worldX,
            y: proj.worldY,
            screenX: proj.x,
            screenY: proj.y,
            modifiers: {
                doubleClick: true,
                space: isSpacePressed.current
            },
            targetType: 'empty',
            targetId: null
        });
    };

    const adjustZoomTo = (nextZoom: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const state = useCameraStore.getState();
        const clampedZoom = Math.min(Math.max(nextZoom, 0.25), 2.0);
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const worldX = (centerX - state.pan.x) / state.zoom;
        const worldY = (centerY - state.pan.y) / state.zoom;
        const newPanX = centerX - worldX * clampedZoom;
        const newPanY = centerY - worldY * clampedZoom;
        setZoom(clampedZoom);
        setPan({ x: newPanX, y: newPanY });
    };

    const getZoomStep = (currentZoom: number, direction: 'in' | 'out') => {
        const step = 0.25;
        const min = 0.25;
        const max = 2.0;
        const epsilon = 1e-6;
        if (direction === 'in') {
            const base = Math.floor((currentZoom + epsilon) / step) * step;
            return Math.min(max, Number((base + step).toFixed(2)));
        }
        const base = Math.ceil((currentZoom - epsilon) / step) * step;
        return Math.max(min, Number((base - step).toFixed(2)));
    };

    const handleZoomClick = (action: 'out' | 'reset' | 'in') => {
        setZoomPulse(action);
        window.setTimeout(() => setZoomPulse(null), 180);
        if (action === 'reset') {
            adjustZoomTo(1);
            return;
        }
        const currentZoom = useCameraStore.getState().zoom;
        const next = getZoomStep(currentZoom, action);
        adjustZoomTo(next);
    };

    const focusVisibleNodeIds = useMemo(() => {
        if (!fieldScopeId && !focusedAreaId) return null;
        const set = new Set<string>();
        nodes.forEach(node => {
            if (!node.meta?.focusHidden) {
                set.add(node.id);
            }
        });
        return set;
    }, [fieldScopeId, focusedAreaId, nodes]);

    const focusGhostNodeIds = useMemo(() => {
        if (!fieldScopeId && !focusedAreaId) return null;
        const set = new Set<string>();
        nodes.forEach(node => {
            if (node.meta?.focusGhost) {
                set.add(node.id);
            }
        });
        return set;
    }, [fieldScopeId, focusedAreaId, nodes]);

    const fitToContent = (options?: { clampToOne?: boolean }) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        if (nodes.length === 0 && areas.length === 0) {
            adjustZoomTo(1);
            centerOn(0, 0, rect.width, rect.height);
            return;
        }

        const getRadius = (nodeType?: string) => {
            if (nodeType === 'core') return NODE_SIZES.root / 2;
            if (nodeType === 'cluster') return NODE_SIZES.cluster / 2;
            return NODE_SIZES.base / 2;
        };

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        nodes.forEach(node => {
            const r = getRadius(node.type);
            minX = Math.min(minX, node.position.x - r);
            minY = Math.min(minY, node.position.y - r);
            maxX = Math.max(maxX, node.position.x + r);
            maxY = Math.max(maxY, node.position.y + r);
        });

        areas.forEach(area => {
            if (area.shape === 'rect') {
                const rectBounds = getAreaRectBounds(area);
                if (rectBounds) {
                    minX = Math.min(minX, rectBounds.x);
                    minY = Math.min(minY, rectBounds.y);
                    maxX = Math.max(maxX, rectBounds.x + rectBounds.w);
                    maxY = Math.max(maxY, rectBounds.y + rectBounds.h);
                }
            } else if (area.shape === 'circle') {
                const center = getAreaCenter(area);
                if (center) {
                    const radius = getCircleBoundsRadius(area);
                    minX = Math.min(minX, center.cx - radius);
                    minY = Math.min(minY, center.cy - radius);
                    maxX = Math.max(maxX, center.cx + radius);
                    maxY = Math.max(maxY, center.cy + radius);
                }
            }
        });

        if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
            adjustZoomTo(1);
            centerOn(0, 0, rect.width, rect.height);
            return;
        }

        const boundsW = Math.max(1, maxX - minX);
        const boundsH = Math.max(1, maxY - minY);
        const padding = 80;
        // Use only 90% of available space to leave room for HUD panels and analytics
        const scaleFactor = 0.90;
        const availableW = Math.max(1, (rect.width - padding * 2) * scaleFactor);
        const availableH = Math.max(1, (rect.height - padding * 2) * scaleFactor);
        const nextZoom = Math.min(availableW / boundsW, availableH / boundsH);
        const targetZoom = options?.clampToOne ? Math.min(nextZoom, 1) : nextZoom;
        const clampedZoom = Math.min(Math.max(targetZoom, 0.25), 2.0);
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        setZoom(clampedZoom);
        setPan({
            x: rect.width / 2 - centerX * clampedZoom,
            y: rect.height / 2 - centerY * clampedZoom
        });
    };

    // We need to attach wheel listeners non-passively for zooming inhibition if needed
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const GESTURE_WHEEL_GUARD_MS = 120;
        let gestureActive = false;
        let lastGestureChangeTs = 0;
        let gestureFallbackTimer: number | null = null;
        const markGestureWindow = () => {
            gestureActive = true;
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

        const preventWheelZoom = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) e.preventDefault();
        };
        el.addEventListener('wheel', preventWheelZoom, { passive: false });

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

        const handleWheel = (event: WheelEvent) => {
            const root = containerRef.current;
            if (!root) return;
            const target = event.target as Node | null;
            if (!target || !root.contains(target)) return;

            const now = Date.now();
            const inNativeGestureWindow = (now - lastGestureChangeTs) < GESTURE_WHEEL_GUARD_MS;
            const wantsZoom = wheelZoomEnabled() || event.ctrlKey || event.metaKey;
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
                console.log('[sf pinch] wheel', {
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
                    shouldZoom
                });
            }

            event.preventDefault();
            event.stopPropagation();
            if (inNativeGestureWindow) return;

            const rect = root.getBoundingClientRect();
            const normalized = normalizeWheelDelta(event, Math.max(1, rect.height));
            if (shouldZoom) {
                useCameraStore.getState().zoomAt(event.clientX, event.clientY, normalized.dy, rect);
                return;
            }
            useCameraStore.getState().updatePan(-normalized.dx, -normalized.dy);
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
                console.log('[sf pinch] window wheel', {
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
        el.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('wheel', handleGlobalWheelCapture, { passive: false, capture: true });

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
                console.log('[sf pinch] gesturestart', { scale });
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
                console.log('[sf pinch] gesturechange', { scale, ratio });
            }
            if (!Number.isFinite(ratio) || ratio <= 0) return;

            const rect = el.getBoundingClientRect();
            const state = useCameraStore.getState();
            const nextZoom = Math.min(Math.max(state.zoom * ratio, 0.25), 2.0);
            const localX = (typeof e.clientX === 'number' ? e.clientX : rect.left + rect.width / 2) - rect.left;
            const localY = (typeof e.clientY === 'number' ? e.clientY : rect.top + rect.height / 2) - rect.top;
            const worldX = (localX - state.pan.x) / state.zoom;
            const worldY = (localY - state.pan.y) / state.zoom;
            const newPanX = localX - worldX * nextZoom;
            const newPanY = localY - worldY * nextZoom;
            setZoom(nextZoom);
            setPan({ x: newPanX, y: newPanY });
        };
        const handleGestureEnd = (event: Event) => {
            const e = event as unknown as { preventDefault: () => void };
            if (!gestureActive) return;
            e.preventDefault();
            gestureActive = false;
            lastGestureScale = 1;
            if (debugPinch()) {
                // eslint-disable-next-line no-console
                console.log('[sf pinch] gestureend');
            }
            if (gestureFallbackTimer) {
                window.clearTimeout(gestureFallbackTimer);
                gestureFallbackTimer = null;
            }
        };

        window.addEventListener('gesturestart', handleGestureStart as DomEventListener, { passive: false });
        window.addEventListener('gesturechange', handleGestureChange as DomEventListener, { passive: false });
        window.addEventListener('gestureend', handleGestureEnd as DomEventListener, { passive: false });
        document.addEventListener('gesturestart', handleGestureStart as DomEventListener, { passive: false });
        document.addEventListener('gesturechange', handleGestureChange as DomEventListener, { passive: false });
        document.addEventListener('gestureend', handleGestureEnd as DomEventListener, { passive: false });

        const onGlobalZoomHotkey = (event: Event) => {
            const detail = (event as CustomEvent<ZoomHotkeyDetail>).detail;
            if (!detail) return;
            switch (detail.command) {
                case 'zoom_in': {
                    const currentZoom = useCameraStore.getState().zoom;
                    const next = getZoomStep(currentZoom, 'in');
                    adjustZoomTo(next);
                    break;
                }
                case 'zoom_out': {
                    const currentZoom = useCameraStore.getState().zoom;
                    const next = getZoomStep(currentZoom, 'out');
                    adjustZoomTo(next);
                    break;
                }
                case 'zoom_reset':
                    adjustZoomTo(1);
                    break;
                case 'zoom_fit':
                    fitToContent();
                    break;
            }
        };
        window.addEventListener(GLOBAL_ZOOM_HOTKEY_EVENT, onGlobalZoomHotkey as DomEventListener);

        // Ego-focus listener
        const onFocus = (e: BusEvent<'UI_FOCUS_NODE'>) => {
            const nodeId = e.payload.id;
            if (!nodeId) return;
            const node = graphEngine.getNode(nodeId);
            if (node && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();

                // Enable smooth transition temporarily
                setIsSmooth(true);
                centerOn(node.position.x, node.position.y, rect.width, rect.height);

                // Disable after animation finishes
                window.setTimeout(() => setIsSmooth(false), motionMetricsRef.current.cameraFocusSettleMs);
            }
        };
        const unsubFocus = eventBus.on('UI_FOCUS_NODE', onFocus);
        const triggerUndoSmooth = () => {
            setUndoSmooth(true);
            if (undoSmoothTimerRef.current) {
                window.clearTimeout(undoSmoothTimerRef.current);
            }
            undoSmoothTimerRef.current = window.setTimeout(() => setUndoSmooth(false), motionMetricsRef.current.cameraUndoSettleMs);
        };
        const unsubUndo = eventBus.on('GRAPH_UNDO', triggerUndoSmooth);
        const unsubRedo = eventBus.on('GRAPH_REDO', triggerUndoSmooth);

        return () => {
            el.removeEventListener('wheel', preventWheelZoom);
            el.removeEventListener('wheel', handleWheel);
            window.removeEventListener('wheel', handleGlobalWheelCapture, true);
            window.removeEventListener('gesturestart', handleGestureStart as DomEventListener);
            window.removeEventListener('gesturechange', handleGestureChange as DomEventListener);
            window.removeEventListener('gestureend', handleGestureEnd as DomEventListener);
            document.removeEventListener('gesturestart', handleGestureStart as DomEventListener);
            document.removeEventListener('gesturechange', handleGestureChange as DomEventListener);
            document.removeEventListener('gestureend', handleGestureEnd as DomEventListener);
            if (gestureFallbackTimer) {
                window.clearTimeout(gestureFallbackTimer);
            }
            window.removeEventListener(GLOBAL_ZOOM_HOTKEY_EVENT, onGlobalZoomHotkey as DomEventListener);
            unsubFocus();
            unsubUndo();
            unsubRedo();
            if (undoSmoothTimerRef.current) {
                window.clearTimeout(undoSmoothTimerRef.current);
            }
        };
    }, []);

    const lastCenteredSpaceId = useRef<string | null>(null);
    const fitTimerRef = useRef<number | null>(null);

    useEffect(() => {
        if (viewContext !== 'space') {
            lastCenteredSpaceId.current = null;
        }
    }, [viewContext]);

    useEffect(() => {
        const unsub = eventBus.on('UI_SIGNAL', (e) => {
            if (e.payload.type !== 'EXIT_TO_STATION') return;
            setViewContext('home');
        });
        return () => unsub();
    }, [setViewContext]);

    useEffect(() => {
        if (viewContext !== 'space' || !currentSpaceId || !containerRef.current) return;
        if (lastCenteredSpaceId.current === currentSpaceId) return;

        if (fitTimerRef.current) {
            window.clearTimeout(fitTimerRef.current);
            fitTimerRef.current = null;
        }

        if (nodes.length === 0 && areas.length === 0) {
            fitTimerRef.current = window.setTimeout(() => {
                if (lastCenteredSpaceId.current === currentSpaceId) return;
                fitToContent({ clampToOne: true });
                lastCenteredSpaceId.current = currentSpaceId;
                fitTimerRef.current = null;
            }, motionMetricsRef.current.cameraFitDelayMs);
            return () => {
                if (fitTimerRef.current) {
                    window.clearTimeout(fitTimerRef.current);
                    fitTimerRef.current = null;
                }
            };
        }

        fitToContent({ clampToOne: true });
        lastCenteredSpaceId.current = currentSpaceId;
        return () => {
            if (fitTimerRef.current) {
                window.clearTimeout(fitTimerRef.current);
                fitTimerRef.current = null;
            }
        };
    }, [viewContext, currentSpaceId, nodes, areas, fitToContent]);

    useEffect(() => {
        const isFieldView = viewContext === 'space' || viewContext === 'cluster';
        if (!isFieldView) return;
        const currentScope = fieldScopeId;
        const nodeMap = new Map(nodes.map(node => [node.id, node]));
        const focusSet = new Set<string>();
        const areaFocusSet = new Set<string>();
        const ghostSetLevel1 = new Set<string>();

        const collectChildren = (clusterId: string) => {
            nodes.forEach(node => {
                if (node.meta?.parentClusterId === clusterId) {
                    focusSet.add(node.id);
                }
            });
        };

        const adjacency = new Map<NodeId, Set<NodeId>>();
        const nodeTypeMap = new Map<NodeId, string | undefined>(nodes.map(node => [node.id, node.type]));
        edges.forEach(edge => {
            if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
            if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());
            adjacency.get(edge.source)?.add(edge.target);
            adjacency.get(edge.target)?.add(edge.source);
        });

        const maxGhostDepthForScope = Math.max(0, subspaceLod - 1);

        if (currentScope) {
            focusSet.add(currentScope);
            collectChildren(currentScope);

            const visited = new Set<NodeId>([currentScope]);
            const queue: Array<{ id: NodeId; depth: number }> = [{ id: currentScope, depth: 0 }];
            const maxDepth = 1 + maxGhostDepthForScope;

            while (queue.length > 0) {
                const current = queue.shift();
                if (!current) break;
                const neighbors = adjacency.get(current.id);
                if (!neighbors) continue;
                neighbors.forEach((neighbor) => {
                    if (visited.has(neighbor)) return;
                    const neighborType = nodeTypeMap.get(neighbor);
                    if (neighborType === 'core') return;
                    const nextDepth = current.depth + 1;
                    if (nextDepth > maxDepth) return;
                    visited.add(neighbor);
                    queue.push({ id: neighbor, depth: nextDepth });
                    if (nextDepth <= maxDepth - 1) {
                        focusSet.add(neighbor);
                    } else if (nextDepth === maxDepth && maxGhostDepthForScope > 0) {
                        ghostSetLevel1.add(neighbor);
                    }
                });
            }
        }

        let areaFocusActive = false;
        if (!currentScope && focusedAreaId) {
            const area = areas.find(item => item.id === focusedAreaId);
            if (area) {
                areaFocusActive = true;
                nodes.forEach(node => {
                    if (area.shape === 'rect') {
                        const rect = getAreaRectBounds(area);
                        if (!rect) return;
                        const inside = node.position.x >= rect.x
                            && node.position.x <= rect.x + rect.w
                            && node.position.y >= rect.y
                            && node.position.y <= rect.y + rect.h;
                        if (inside) areaFocusSet.add(node.id);
                    } else if (area.shape === 'circle' && area.circle) {
                        const center = getAreaCenter(area);
                        const cx = center?.cx ?? 0;
                        const cy = center?.cy ?? 0;
                        const r = area.circle.r;
                        const dx = node.position.x - cx;
                        const dy = node.position.y - cy;
                        if ((dx * dx + dy * dy) <= r * r) {
                            areaFocusSet.add(node.id);
                        }
                    }
                });
            }
        }

        nodes.forEach(node => {
            const isCore = node.type === 'core';
            const focusActive = Boolean(currentScope || areaFocusActive);
            const ghostLevel = ghostSetLevel1.has(node.id) ? 1 : 0;
            const shouldGhost = ghostLevel > 0 && !isCore;
            const shouldHide = focusActive
                ? (currentScope
                    ? (!focusSet.has(node.id) && ghostLevel === 0)
                    : (!areaFocusSet.has(node.id)))
                : false;
            const nextFocusHidden = shouldHide;
            const nextFocusGhost = shouldGhost;
            const nextFocusGhostLevel = shouldGhost ? ghostLevel : 0;
            if (
                node.meta?.focusHidden === nextFocusHidden
                && node.meta?.focusGhost === nextFocusGhost
                && node.meta?.focusGhostLevel === nextFocusGhostLevel
            ) return;
            const meta = {
                ...(node.meta ?? {}),
                focusHidden: nextFocusHidden,
                focusGhost: nextFocusGhost,
                focusGhostLevel: nextFocusGhostLevel
            };
            updateNode(node.id, { meta });
        });

        if (currentScope) {
            const scopeNode = nodeMap.get(currentScope as NodeId);
            if (scopeNode && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                centerOn(scopeNode.position.x, scopeNode.position.y, rect.width, rect.height);
            }
        }
    }, [fieldScopeId, focusedAreaId, areas, nodes, edges, updateNode, viewContext, centerOn, subspaceLod]);

    useEffect(() => {
        if (areaInteraction?.type === 'move') {
            setDocumentBodyCursor('grabbing');
            return () => {
                setDocumentBodyCursor('');
            };
        }
        setDocumentBodyCursor('');
        return undefined;
    }, [areaInteraction]);

    useEffect(() => {
        if (areaInteraction) return;
        if (spacePanArmed) {
            setDocumentBodyCursor('grab');
            return;
        }
        setDocumentBodyCursor('');
    }, [spacePanArmed, areaInteraction]);

    return (
        <div
            ref={containerRef}
            id="sf-canvas"
            className="w-full h-full bg-[var(--semantic-color-bg-app)] overflow-hidden relative touch-none select-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={(e) => {
                lastHoverEdgeId.current = null;
                useEdgeSelectionStore.getState().setHover(null);
                setHoverAreaId(null);
                if (e.pointerType !== 'touch') {
                    pinchRef.current = null;
                }
                if (!isSpacePressed.current) {
                    setDocumentBodyCursor('');
                }
            }}
            onDoubleClick={handleDoubleClick}
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* Dot Matrix Background */}
            {showGrid && (
                <div
                    className="absolute inset-0 pointer-events-none"
                    data-grid="dot-matrix"
                    style={{
                        opacity: Math.min(0.45, 0.2 + zoom * 0.08),
                        backgroundImage: (() => {
                            let gridScale = zoom;
                            const minPx = 8 * gridStepMul;
                            const maxPx = 24 * gridStepMul;
                            const cell = GRID_METRICS.cell * gridStepMul;
                            while (cell * gridScale < minPx) gridScale *= 2;
                            while (cell * gridScale > maxPx) gridScale /= 2;
                            const dotPx = Math.max(1.1, GRID_METRICS.dotRadius * gridScale);
                            return `radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--semantic-color-text-primary), transparent 45%) ${dotPx}px, transparent ${dotPx}px)`;
                        })(),
                        backgroundSize: (() => {
                            let gridScale = zoom;
                            const minPx = 8 * gridStepMul;
                            const maxPx = 24 * gridStepMul;
                            const cell = GRID_METRICS.cell * gridStepMul;
                            while (cell * gridScale < minPx) gridScale *= 2;
                            while (cell * gridScale > maxPx) gridScale /= 2;
                            return `${cell * gridScale}px ${cell * gridScale}px`;
                        })(),
                        backgroundPosition: (() => {
                            let gridScale = zoom;
                            const minPx = 8 * gridStepMul;
                            const maxPx = 24 * gridStepMul;
                            const cell = GRID_METRICS.cell * gridStepMul;
                            while (cell * gridScale < minPx) gridScale *= 2;
                            while (cell * gridScale > maxPx) gridScale /= 2;
                            const ratio = gridScale / zoom;
                            return `${pan.x * ratio}px ${pan.y * ratio}px`;
                        })()
                    }}
                />
            )}

            {/* Cosmogenesis Source Node moved to transform layer */}

            {/* Transform Layer (Camera) */}
            <div
                className={`transform-layer absolute inset-0 origin-top-left ${isSmooth ? 'camera-smooth' : ''} ${undoSmooth ? 'undo-smooth' : ''}`}
                style={{
                    transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                    willChange: 'transform'
                }}
            >
                {/* Regions Layer (Area overlays) */}
                {sortedAreas.length > 0 && (
                    <div className="absolute inset-0 pointer-events-none">
                        {sortedAreas.map((area, areaIndex) => {
                            let focusVisibility: 'visible' | 'ghost' | 'hidden' = 'visible';
                            if ((fieldScopeId || focusedAreaId) && focusVisibleNodeIds && focusGhostNodeIds) {
                                if (area.anchor.type === 'node') {
                                    if (focusVisibleNodeIds.has(area.anchor.nodeId)) {
                                        focusVisibility = 'visible';
                                    } else if (focusGhostNodeIds.has(area.anchor.nodeId)) {
                                        focusVisibility = 'ghost';
                                    } else {
                                        focusVisibility = 'hidden';
                                    }
                                } else {
                                    let hasFocus = false;
                                    let hasGhost = false;
                                    for (const node of nodes) {
                                        const isFocus = focusVisibleNodeIds.has(node.id);
                                        const isGhost = focusGhostNodeIds.has(node.id);
                                        if (!isFocus && !isGhost) continue;
                                        if (area.shape === 'rect') {
                                            const rect = getAreaRectBounds(area);
                                            if (!rect) continue;
                                            const inside = node.position.x >= rect.x
                                                && node.position.x <= rect.x + rect.w
                                                && node.position.y >= rect.y
                                                && node.position.y <= rect.y + rect.h;
                                            if (inside) {
                                                if (isFocus) hasFocus = true;
                                                if (isGhost) hasGhost = true;
                                            }
                                        } else if (area.shape === 'circle' && area.circle) {
                                            const center = getAreaCenter(area);
                                            const cx = center?.cx ?? 0;
                                            const cy = center?.cy ?? 0;
                                            const r = area.circle.r;
                                            const dx = node.position.x - cx;
                                            const dy = node.position.y - cy;
                                            if ((dx * dx + dy * dy) <= r * r) {
                                                if (isFocus) hasFocus = true;
                                                if (isGhost) hasGhost = true;
                                            }
                                        }
                                        if (hasFocus) break;
                                    }
                                    if (hasFocus) focusVisibility = 'visible';
                                    else if (hasGhost) focusVisibility = 'ghost';
                                    else focusVisibility = 'hidden';
                                }
                            }

                            if (focusVisibility === 'hidden') return null;
                            const ghostOpacity = focusVisibility === 'ghost' ? 0.35 : 1;
                            const isSelected = selectedAreaIds.includes(area.id);
                            const isHovered = hoverAreaId === area.id;
                            if (area.shape === 'circle' && area.circle) {
                                const circle = area.circle;
                                const center = getAreaCenter(area);
                                const cx = center?.cx ?? 0;
                                const cy = center?.cy ?? 0;
                                const anchorTransition = anchorAnimatingIds.has(area.id)
                                    ? 'left 240ms ease-out, top 240ms ease-out'
                                    : undefined;
                                return (
                                    <React.Fragment key={area.id}>
                                        {area.rings?.map(ring => {
                                            const basePct = Math.max(0, Math.min(100, (circle.r / ring.r) * 100));
                                            const color = area.color ?? 'var(--semantic-color-graph-node-fill)';
                                            const colorStrong = `color-mix(in srgb, ${color}, var(--semantic-color-graph-node-glyph) 22%)`;
                                            const innerPct = Math.max(0, basePct - 16);
                                            const outerPct = Math.min(100, basePct + 36);
                                            return (
                                                <div
                                                    key={ring.id}
                                                    className="absolute rounded-full pointer-events-none"
                                                    style={{
                                                        left: cx - ring.r,
                                                        top: cy - ring.r,
                                                        width: ring.r * 2,
                                                        height: ring.r * 2,
                                                        backgroundColor: 'transparent',
                                                        backgroundImage: `radial-gradient(circle at center, rgba(0,0,0,0) 0%, ${colorStrong} ${innerPct}%, ${color} ${basePct}%, rgba(0,0,0,0) ${outerPct}%, rgba(0,0,0,0) 100%)`,
                                                        borderColor: area.borderColor ?? 'var(--semantic-color-graph-node-stroke)',
                                                        borderStyle: ring.border?.style ?? area.border?.style ?? 'solid',
                                                        borderWidth: ring.border?.width ?? area.border?.width ?? 1.5,
                                                        filter: 'blur(0.6px)',
                                                        opacity: (area.opacity ?? 0.5) * (ring.opacityMul ?? 0.55) * ghostOpacity,
                                                        transition: anchorTransition
                                                    }}
                                                />
                                            );
                                        })}
                                        {(() => {
                                            const baseBounds = {
                                                x: cx - circle.r,
                                                y: cy - circle.r,
                                                w: circle.r * 2,
                                                h: circle.r * 2
                                            };
                                            const blurOverlaps = sortedAreas.slice(areaIndex + 1).map(other => {
                                                const otherZ = other.zIndex ?? 0;
                                                const selfZ = area.zIndex ?? 0;
                                                if (otherZ <= selfZ) return null;
                                                const otherRect = other.shape === 'rect' ? getAreaRectBounds(other) : null;
                                                const otherCenter = other.shape === 'circle' ? getAreaCenter(other) : null;
                                                const otherRadius = other.shape === 'circle' ? getCircleBoundsRadius(other) : 0;
                                                const otherBounds = other.shape === 'circle' && otherCenter
                                                    ? { x: otherCenter.cx - otherRadius, y: otherCenter.cy - otherRadius, w: otherRadius * 2, h: otherRadius * 2 }
                                                    : otherRect;
                                                if (!otherBounds) return null;
                                                const left = Math.max(baseBounds.x, otherBounds.x);
                                                const top = Math.max(baseBounds.y, otherBounds.y);
                                                const right = Math.min(baseBounds.x + baseBounds.w, otherBounds.x + otherBounds.w);
                                                const bottom = Math.min(baseBounds.y + baseBounds.h, otherBounds.y + otherBounds.h);
                                                const width = right - left;
                                                const height = bottom - top;
                                                if (width < 6 || height < 6) return null;
                                                const wrapperLeft = baseBounds.x;
                                                const wrapperTop = baseBounds.y;
                                                const wrapperSize = baseBounds.w;
                                                const maskImage = `radial-gradient(circle ${circle.r}px at ${circle.r}px ${circle.r}px, #fff 98%, transparent 100%)`;
                                                const offsetLeft = left - wrapperLeft;
                                                const offsetTop = top - wrapperTop;
                                                return (
                                                    <div
                                                        key={`${area.id}-blur-${other.id}`}
                                                        className="absolute pointer-events-none"
                                                        style={{
                                                            left: wrapperLeft,
                                                            top: wrapperTop,
                                                            width: wrapperSize,
                                                            height: wrapperSize,
                                                            maskImage,
                                                            WebkitMaskImage: maskImage,
                                                            maskRepeat: 'no-repeat',
                                                            WebkitMaskRepeat: 'no-repeat',
                                                            maskPosition: '0 0',
                                                            WebkitMaskPosition: '0 0',
                                                            maskSize: '100% 100%',
                                                            WebkitMaskSize: '100% 100%',
                                                            borderRadius: '9999px',
                                                            overflow: 'hidden'
                                                        }}
                                                    >
                                                        <div
                                                            className="absolute"
                                                            style={{
                                                                left: offsetLeft,
                                                                top: offsetTop,
                                                                width,
                                                                height,
                                                                backdropFilter: 'blur(2px)',
                                                                WebkitBackdropFilter: 'blur(2px)',
                                                                backgroundColor: 'rgba(0,0,0,0.01)',
                                                                transform: 'translateZ(0)',
                                                                willChange: 'transform'
                                                            }}
                                                        />
                                                    </div>
                                                );
                                            });
                                            return (
                                                <>
                                                    <div
                                                        className="absolute rounded-full border pointer-events-none"
                                                        style={{
                                                            left: baseBounds.x,
                                                            top: baseBounds.y,
                                                            width: baseBounds.w,
                                                            height: baseBounds.h,
                                                            backgroundColor: area.color ?? 'var(--semantic-color-graph-node-fill)',
                                                            backgroundImage: `radial-gradient(circle at center, ${area.color ?? 'var(--semantic-color-graph-node-fill)'
                                                                } 0%, rgba(0,0,0,0) 70%)`,
                                                            opacity: (area.opacity ?? 0.5) * ghostOpacity,
                                                            borderColor: area.borderColor ?? 'var(--semantic-color-graph-node-stroke)',
                                                            borderStyle: area.border?.style ?? 'solid',
                                                            borderWidth: (area.border?.width ?? 1.5) * (isSelected ? 1.25 : isHovered ? 1.12 : 1),
                                                            boxShadow: isSelected
                                                                ? '0 0 10px color-mix(in srgb, var(--semantic-color-graph-node-glyph), transparent 78%)'
                                                                : isHovered
                                                                    ? '0 0 8px color-mix(in srgb, var(--semantic-color-graph-node-glyph), transparent 82%)'
                                                                    : undefined,
                                                            transition: anchorTransition
                                                        }}
                                                    />
                                                    {blurOverlaps}
                                                </>
                                            );
                                        })()}
                                    </React.Fragment>
                                );
                            }
                            const rect = area.shape === 'rect' ? getAreaRectBounds(area) : null;
                            if (!rect) return null;
                            const baseVisual = (
                                <div
                                    key={`${area.id}-base`}
                                    className="absolute rounded-xl border pointer-events-none"
                                    style={{
                                        left: rect.x,
                                        top: rect.y,
                                        width: rect.w,
                                        height: rect.h,
                                        backgroundColor: area.color ?? 'var(--semantic-color-graph-node-fill)',
                                        backgroundImage: `radial-gradient(ellipse at center, ${area.color ?? 'var(--semantic-color-graph-node-fill)'
                                            } 0%, rgba(0,0,0,0) 70%)`,
                                        opacity: (area.opacity ?? 0.5) * ghostOpacity,
                                        borderColor: area.borderColor ?? 'var(--semantic-color-graph-node-stroke)',
                                        borderStyle: area.border?.style ?? 'solid',
                                        borderWidth: (area.border?.width ?? 1.5) * (isSelected ? 1.25 : isHovered ? 1.12 : 1),
                                        boxShadow: isSelected
                                            ? '0 0 10px color-mix(in srgb, var(--semantic-color-graph-node-glyph), transparent 78%)'
                                            : isHovered
                                                ? '0 0 8px color-mix(in srgb, var(--semantic-color-graph-node-glyph), transparent 82%)'
                                                : undefined
                                    }}
                                />
                            );
                            const blurOverlaps = sortedAreas.slice(areaIndex + 1).map(other => {
                                const otherZ = other.zIndex ?? 0;
                                const selfZ = area.zIndex ?? 0;
                                if (otherZ <= selfZ) return null;
                                const otherRect = other.shape === 'rect' ? getAreaRectBounds(other) : null;
                                const otherCenter = other.shape === 'circle' ? getAreaCenter(other) : null;
                                const otherRadius = other.shape === 'circle' ? getCircleBoundsRadius(other) : 0;
                                const otherBounds = other.shape === 'circle' && otherCenter
                                    ? { x: otherCenter.cx - otherRadius, y: otherCenter.cy - otherRadius, w: otherRadius * 2, h: otherRadius * 2 }
                                    : otherRect;
                                if (!otherBounds) return null;
                                const left = Math.max(rect.x, otherBounds.x);
                                const top = Math.max(rect.y, otherBounds.y);
                                const right = Math.min(rect.x + rect.w, otherBounds.x + otherBounds.w);
                                const bottom = Math.min(rect.y + rect.h, otherBounds.y + otherBounds.h);
                                const width = right - left;
                                const height = bottom - top;
                                if (width < 6 || height < 6) return null;
                                const clipPath = other.shape === 'circle' && otherCenter
                                    ? `circle(${otherRadius}px at ${otherCenter.cx - left}px ${otherCenter.cy - top}px)`
                                    : undefined;
                                const maskImage = other.shape === 'circle' && otherCenter
                                    ? `radial-gradient(circle ${otherRadius}px at ${otherCenter.cx - left}px ${otherCenter.cy - top}px, #fff 98%, transparent 100%)`
                                    : undefined;
                                return (
                                    <div
                                        key={`${area.id}-blur-${other.id}`}
                                        className="absolute pointer-events-none"
                                        style={{
                                            left,
                                            top,
                                            width,
                                            height,
                                            backdropFilter: 'blur(2px)',
                                            WebkitBackdropFilter: 'blur(2px)',
                                            clipPath,
                                            WebkitClipPath: clipPath,
                                            maskImage,
                                            WebkitMaskImage: maskImage,
                                            maskRepeat: maskImage ? 'no-repeat' : undefined,
                                            WebkitMaskRepeat: maskImage ? 'no-repeat' : undefined,
                                            maskPosition: maskImage ? '0 0' : undefined,
                                            WebkitMaskPosition: maskImage ? '0 0' : undefined,
                                            maskSize: maskImage ? '100% 100%' : undefined,
                                            WebkitMaskSize: maskImage ? '100% 100%' : undefined,
                                            backgroundColor: 'rgba(0,0,0,0.01)',
                                            transform: 'translateZ(0)',
                                            willChange: 'transform'
                                        }}
                                    />
                                );
                            });
                            return (
                                <React.Fragment key={area.id}>
                                    {baseVisual}
                                    {blurOverlaps}
                                </React.Fragment>
                            );
                        })}
                    </div>
                )}

                {focusedAreaId && (
                    (() => {
                        const area = areas.find(item => item.id === focusedAreaId);
                        if (!area) return null;
                        let bounds = { x: 0, y: 0, w: 0, h: 0 };
                        let radius = 0;
                        if (area.shape === 'rect') {
                            const rect = getAreaRectBounds(area);
                            if (rect) bounds = rect;
                        } else if (area.shape === 'circle' && area.circle) {
                            const center = getAreaCenter(area);
                            radius = getCircleBoundsRadius(area);
                            const cx = center?.cx ?? 0;
                            const cy = center?.cy ?? 0;
                            bounds = { x: cx - radius, y: cy - radius, w: radius * 2, h: radius * 2 };
                        }
                        const shade = 'rgba(0,0,0,0.45)';
                        return (
                            <div className="absolute inset-0 pointer-events-none">
                                <div
                                    className="absolute"
                                    style={{
                                        left: bounds.x,
                                        top: bounds.y,
                                        width: bounds.w,
                                        height: bounds.h,
                                        borderRadius: area.shape === 'circle' ? '9999px' : '16px',
                                        boxShadow: `0 0 0 9999px ${shade}`
                                    }}
                                />
                            </div>
                        );
                    })()
                )}

                {sortedAreas.length > 0 && (
                    <div className="absolute inset-0">
                        {sortedAreas.map(area => {
                            const isSelected = selectedAreaIds.includes(area.id);
                            const isEditing = editingRegionId === area.id;
                            const rect = area.shape === 'rect' ? getAreaRectBounds(area) : undefined;
                            const circle = area.shape === 'circle' ? area.circle : undefined;
                            const center = area.shape === 'circle' ? getAreaCenter(area) : null;
                            const radius = area.shape === 'circle' && circle ? getCircleBoundsRadius(area) : 0;
                            if (!rect && !circle) return null;
                            const left = rect ? rect.x : (center?.cx ?? 0) - radius;
                            const top = rect ? rect.y : (center?.cy ?? 0) - radius;
                            const width = rect ? rect.w : radius * 2;
                            const height = rect ? rect.h : radius * 2;
                            const anchorTransition = area.shape === 'circle' && anchorAnimatingIds.has(area.id)
                                ? 'left 240ms ease-out, top 240ms ease-out'
                                : undefined;
                            const handleSize = 8;
                            const handles = rect ? [
                                { id: 'nw', x: 0, y: 0 },
                                { id: 'ne', x: width - handleSize, y: 0 },
                                { id: 'se', x: width - handleSize, y: height - handleSize },
                                { id: 'sw', x: 0, y: height - handleSize }
                            ] : [];
                            return (
                                <div
                                    key={`${area.id}-interactive`}
                                    className={`absolute ${area.shape === 'circle' ? 'rounded-full' : 'rounded-xl'} pointer-events-auto`}
                                    data-area-id={area.id}
                                    style={{
                                        left,
                                        top,
                                        width,
                                        height,
                                        transition: anchorTransition,
                                        cursor: 'pointer'
                                    }}
                                >
                                    <svg
                                        className="absolute inset-0"
                                        width="100%"
                                        height="100%"
                                        viewBox={`0 0 ${width} ${height}`}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {area.shape === 'rect' && (
                                            <rect
                                                x={0}
                                                y={0}
                                                width={width}
                                                height={height}
                                                fill="transparent"
                                                stroke="transparent"
                                                strokeWidth={activeTool === TOOLS.AREA ? 1 : 12}
                                                pointerEvents="all"
                                                style={{ cursor: 'pointer' }}
                                                onPointerDown={(e) => {
                                                    e.stopPropagation();
                                                    if (e.shiftKey) {
                                                        toggleSelectedArea(area.id);
                                                        return;
                                                    }
                                                    if (selectionState.getSelection().length > 0) {
                                                        selectionState.clear();
                                                        useEdgeSelectionStore.getState().clear();
                                                    }
                                                    const keepMulti = selectedAreaIds.includes(area.id) && selectedAreaIds.length > 1;
                                                    startAreaMove(area.id, e, keepMulti);
                                                }}
                                            />
                                        )}
                                        {area.shape === 'circle' && (
                                            <circle
                                                cx={width / 2}
                                                cy={height / 2}
                                                r={circle?.r ?? 0}
                                                fill="transparent"
                                                stroke="transparent"
                                                strokeWidth={activeTool === TOOLS.AREA ? 1 : 12}
                                                pointerEvents="all"
                                                style={{ cursor: 'pointer' }}
                                                onPointerDown={(e) => {
                                                    e.stopPropagation();
                                                    if (e.shiftKey) {
                                                        toggleSelectedArea(area.id);
                                                        return;
                                                    }
                                                    if (selectionState.getSelection().length > 0) {
                                                        selectionState.clear();
                                                        useEdgeSelectionStore.getState().clear();
                                                    }
                                                    const keepMulti = selectedAreaIds.includes(area.id) && selectedAreaIds.length > 1;
                                                    startAreaMove(area.id, e, keepMulti);
                                                }}
                                            />
                                        )}
                                        {area.shape === 'rect' && !area.locked && activeTool !== TOOLS.LINK && (
                                            <>
                                                <line
                                                    x1={0}
                                                    y1={0}
                                                    x2={width}
                                                    y2={0}
                                                    stroke="rgba(255,255,255,0.001)"
                                                    strokeWidth={10}
                                                    pointerEvents="all"
                                                    style={{ cursor: 'ns-resize' }}
                                                    onPointerDown={(e) => {
                                                        e.stopPropagation();
                                                        startAreaResize(area.id, 'n', e);
                                                    }}
                                                />
                                                <line
                                                    x1={0}
                                                    y1={height}
                                                    x2={width}
                                                    y2={height}
                                                    stroke="rgba(255,255,255,0.001)"
                                                    strokeWidth={10}
                                                    pointerEvents="all"
                                                    style={{ cursor: 'ns-resize' }}
                                                    onPointerDown={(e) => {
                                                        e.stopPropagation();
                                                        startAreaResize(area.id, 's', e);
                                                    }}
                                                />
                                                <line
                                                    x1={0}
                                                    y1={0}
                                                    x2={0}
                                                    y2={height}
                                                    stroke="rgba(255,255,255,0.001)"
                                                    strokeWidth={10}
                                                    pointerEvents="all"
                                                    style={{ cursor: 'ew-resize' }}
                                                    onPointerDown={(e) => {
                                                        e.stopPropagation();
                                                        startAreaResize(area.id, 'w', e);
                                                    }}
                                                />
                                                <line
                                                    x1={width}
                                                    y1={0}
                                                    x2={width}
                                                    y2={height}
                                                    stroke="rgba(255,255,255,0.001)"
                                                    strokeWidth={10}
                                                    pointerEvents="all"
                                                    style={{ cursor: 'ew-resize' }}
                                                    onPointerDown={(e) => {
                                                        e.stopPropagation();
                                                        startAreaResize(area.id, 'e', e);
                                                    }}
                                                />
                                            </>
                                        )}
                                    </svg>
                                    {isSelected && isEditing && (
                                        <div className="absolute -top-6 left-0 flex items-center gap-2 pointer-events-auto">
                                            <input
                                                value={regionNameDraft}
                                                onChange={(e) => setRegionNameDraft(e.target.value)}
                                                onBlur={commitRegionName}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') commitRegionName();
                                                    if (e.key === 'Escape') setEditingRegionId(null);
                                                }}
                                                className="px-2 py-0.5 rounded-full bg-[var(--semantic-color-bg-surface)]/88 border border-[var(--semantic-color-border-default)] text-[10px] uppercase tracking-[0.2em] text-[var(--semantic-color-text-secondary)] outline-none w-32"
                                            />
                                        </div>
                                    )}
                                    {isSelected && activeTool !== TOOLS.LINK && !area.locked && area.shape === 'rect' && (
                                        <>
                                            {handles.map(handle => (
                                                <div
                                                    key={handle.id}
                                                    className="absolute rounded-full pointer-events-auto"
                                                    style={{
                                                        width: handleSize,
                                                        height: handleSize,
                                                        left: handle.x,
                                                        top: handle.y,
                                                        cursor: handle.id === 'nw' || handle.id === 'se' ? 'nwse-resize' : 'nesw-resize',
                                                        backgroundColor: 'rgb(255,255,255)'
                                                    }}
                                                    onPointerDown={(e) => {
                                                        e.stopPropagation();
                                                        startAreaResize(area.id, handle.id as 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w', e);
                                                    }}
                                                />
                                            ))}
                                        </>
                                    )}
                                    {isSelected && activeTool !== TOOLS.LINK && !area.locked && area.shape === 'circle' && circle && (
                                        <>
                                            <div
                                                className="absolute rounded-full pointer-events-auto"
                                                style={{
                                                    width: handleSize,
                                                    height: handleSize,
                                                    left: width / 2 + circle.r - handleSize / 2,
                                                    top: height / 2 - handleSize / 2,
                                                    cursor: 'ew-resize',
                                                    backgroundColor: 'rgb(255,255,255)'
                                                }}
                                                onPointerDown={(e) => {
                                                    e.stopPropagation();
                                                    startAreaResize(area.id, 'radius', e);
                                                }}
                                            />
                                            {area.rings?.map(ring => (
                                                <div
                                                    key={ring.id}
                                                    className="absolute rounded-full pointer-events-auto"
                                                    style={{
                                                        width: handleSize,
                                                        height: handleSize,
                                                        left: width / 2 + ring.r - handleSize / 2,
                                                        top: height / 2 - handleSize / 2,
                                                        cursor: 'ew-resize',
                                                        backgroundColor: 'var(--semantic-color-text-primary)'
                                                    }}
                                                    onPointerDown={(e) => {
                                                        e.stopPropagation();
                                                        const proj = getProjection(e);
                                                        setAreaInteraction({
                                                            type: 'resize-ring',
                                                            areaId: area.id,
                                                            ringId: ring.id,
                                                            startX: proj.worldX,
                                                            startY: proj.worldY
                                                        });
                                                        containerRef.current?.setPointerCapture(e.pointerId);
                                                    }}
                                                />
                                            ))}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Cosmogenesis / New Space Source: Rendered in World Space at (0,0) (when empty) */}
                {nodes.length === 0 && (
                    <div
                        className="absolute top-0 left-0 z-50 pointer-events-auto"
                        style={{ transform: 'translate(0px, 0px)' }}
                    >
                        <div
                            className="relative flex flex-col items-center justify-center cursor-pointer group -translate-x-1/2 -translate-y-1/2 rounded-full"
                            style={{ width: `${sourceSize}px`, height: `${sourceSize}px` }}
                            onPointerDown={(e) => e.stopPropagation()}
                            onDoubleClick={(e) => {
                                e.stopPropagation();
                                handleSourceDoubleClick();
                            }}
                        >
                            {/* Visual Source: The DOT is the center */}
                            <div className="relative flex items-center justify-center w-16 h-16">
                                {/* Spreading Ring */}
                                <div
                                    className="absolute inset-0 rounded-full animate-source-pulse-spread"
                                    style={{ border: '1px solid color-mix(in srgb, var(--semantic-color-graph-node-stroke), transparent 20%)' }}
                                />

                                {/* Center Dot */}
                                <div
                                    className="w-2.5 h-2.5 rounded-full animate-source-dot-pulse relative z-10"
                                    style={{ backgroundColor: 'var(--semantic-color-text-primary)' }}
                                />
                            </div>

                            {/* Label Container: Positioned absolutely below the dot to avoid shifting the center */}
                            <div
                                className="absolute top-[100%] flex flex-col items-center gap-1.5 pointer-events-none"
                                style={{ paddingTop: `${GRID_METRICS.cell * 2 - 40}px` }}
                            >
                                <span className="text-[10px] uppercase tracking-[0.2em] font-mono select-none transition-colors text-[color:color-mix(in_srgb,var(--semantic-color-text-primary),transparent_70%)] group-hover:text-[color:color-mix(in_srgb,var(--semantic-color-text-primary),transparent_35%)]">
                                    Source
                                </span>
                                <span className="text-[8px] uppercase tracking-[0.15em] opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0 whitespace-nowrap text-[color:color-mix(in_srgb,var(--semantic-color-text-primary),transparent_82%)]">
                                    Double-click to materialize
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <InteractionLayer />

                {/* Edges Layer (SVG) */}
                {showEdges && (
                    <svg className="absolute inset-0 pointer-events-auto overflow-visible w-full h-full z-0">
                        {renderedEdges.map(edge => (
                            <EdgeRenderer key={edge.id} edge={edge} />
                        ))}
                    </svg>
                )}

                {/* Nodes Layer (Html) */}
                <div className="nodes-layer absolute inset-0 pointer-events-none z-10">
                    {nodes.map(node => (
                        <NodeRenderer key={node.id} node={node} />
                    ))}
                </div>

            </div>

            {/* HUD: Stats & Status (Bottom-Left) */}
            <div
                className="absolute bottom-4 left-4 pointer-events-auto flex flex-col items-start gap-2 z-50"
            >
                {showHud && activeTool === TOOLS.LINK && (
                    <div className="pointer-events-none flex items-center gap-2 pr-3 py-1.5 pl-4 opacity-70">
                        <span className="w-1.5 h-1.5 rounded-[var(--primitive-radius-pill)] bg-[var(--semantic-color-text-muted)] animate-pulse" />
                        <span className="text-[9px] uppercase tracking-[0.4em] text-[var(--semantic-color-text-muted)] font-medium">
                            Connection...
                        </span>
                    </div>
                )}
                {showHud && showCounters && (
                    <div className="pointer-events-none flex gap-4 items-center pr-3 py-1.5 pl-4 opacity-60 hover:opacity-100 transition-opacity">
                        <div className="flex items-baseline gap-1">
                            <span className="text-xs font-medium text-[var(--semantic-color-text-secondary)]">{nodes.length}</span>
                            <span className="text-[8px] uppercase tracking-widest text-[var(--semantic-color-text-muted)]">Nodes</span>
                        </div>
                        <div className="w-[1px] h-3 bg-[var(--semantic-color-border-default)]" />
                        <div className="flex items-baseline gap-1">
                            <span className="text-xs font-medium text-[var(--semantic-color-text-secondary)]">{edges.length}</span>
                            <span className="text-[8px] uppercase tracking-widest text-[var(--semantic-color-text-muted)]">Edges</span>
                        </div>
                    </div>
                )}
                <div className="pointer-events-auto flex items-center gap-3 pr-3 py-1.5 pl-4 opacity-70 hover:opacity-100 transition-opacity">
                    <div
                        className="flex items-center gap-2"
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => {
                                setZoomPulse('fit');
                                window.setTimeout(() => setZoomPulse(null), 180);
                                fitToContent();
                            }}
                            className={`w-6 h-6 rounded-[var(--primitive-radius-pill)] flex items-center justify-center text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)] hover:bg-[var(--semantic-color-interactive-hover-bg)] transition-colors ${zoomPulse === 'fit' ? 'bg-[var(--semantic-color-interactive-active-bg)] text-[var(--semantic-color-text-primary)] border border-[var(--semantic-color-interactive-active-border)]' : ''} -ml-1`}
                            aria-label="Fit to content"
                        >
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M8 4H4v4M16 4h4v4M4 16v4h4M20 16v4h-4" />
                            </svg>
                        </button>
                        <button
                            onClick={() => handleZoomClick('out')}
                            className={`w-6 h-6 rounded-[var(--primitive-radius-pill)] flex items-center justify-center text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)] hover:bg-[var(--semantic-color-interactive-hover-bg)] transition-colors ${zoomPulse === 'out' ? 'bg-[var(--semantic-color-interactive-active-bg)] text-[var(--semantic-color-text-primary)] border border-[var(--semantic-color-interactive-active-border)]' : ''}`}
                            aria-label="Zoom out"
                        >
                            −
                        </button>
                        <button
                            onClick={() => handleZoomClick('reset')}
                            className={`min-w-[48px] text-[10px] uppercase tracking-[0.2em] text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)] ${zoomPulse === 'reset' ? 'text-[var(--semantic-color-text-primary)]' : ''}`}
                            aria-label="Reset zoom"
                        >
                            {Math.round(zoom * 100)}%
                        </button>
                        <button
                            onClick={() => handleZoomClick('in')}
                            className={`w-6 h-6 rounded-[var(--primitive-radius-pill)] flex items-center justify-center text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)] hover:bg-[var(--semantic-color-interactive-hover-bg)] transition-colors ${zoomPulse === 'in' ? 'bg-[var(--semantic-color-interactive-active-bg)] text-[var(--semantic-color-text-primary)] border border-[var(--semantic-color-interactive-active-border)]' : ''}`}
                            aria-label="Zoom in"
                        >
                            +
                        </button>
                    </div>
                    {fieldScopeId && (
                        <div
                            className="flex items-center gap-1 px-2 py-0.5 rounded-[var(--primitive-radius-pill)] bg-[var(--semantic-color-interactive-hover-bg)] border border-[var(--semantic-color-border-default)]"
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            {[1, 2, 3].map(level => (
                                <button
                                    key={level}
                                    type="button"
                                    onClick={() => setSubspaceLod(level as 1 | 2 | 3)}
                                    className={`w-5 h-5 rounded-[var(--primitive-radius-pill)] text-[10px] font-semibold transition-colors ${subspaceLod === level ? 'bg-[var(--semantic-color-interactive-active-bg)] border border-[var(--semantic-color-interactive-active-border)] text-[var(--semantic-color-text-primary)]' : 'text-[var(--semantic-color-text-muted)] hover:text-[var(--semantic-color-text-primary)] hover:bg-[var(--semantic-color-interactive-hover-bg)]'}`}
                                    title={`LOD ${level}`}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {focusedAreaId && (
                <div
                    className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto z-50"
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center gap-3 rounded-[var(--primitive-radius-pill)] bg-[var(--semantic-color-bg-surface)]/70 border border-[var(--semantic-color-border-default)] px-4 py-2 backdrop-blur-md">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--semantic-color-text-secondary)]">
                            Focus Mode
                        </span>
                        <button
                            type="button"
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                clearFocusedArea();
                                selectionState.clear();
                                useAreaStore.getState().clearSelectedAreas();
                                useEdgeSelectionStore.getState().clear();
                            }}
                            className="text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)] transition-colors"
                            title="Exit focus (Esc)"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                                <path d="M6 6l12 12M18 6l-12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CanvasView;
