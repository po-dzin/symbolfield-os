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
import { eventBus, type BusEvent } from '../../core/events/EventBus';
import { graphEngine } from '../../core/graph/GraphEngine';
import { useCameraStore } from '../../store/useCameraStore';
import { screenToWorld } from '../../utils/coords';
import { GRID_METRICS, NODE_SIZES } from '../../utils/layoutMetrics';
import { useEdgeSelectionStore } from '../../store/useEdgeSelectionStore';
import { useAreaStore } from '../../store/useAreaStore';
import { selectionState } from '../../core/state/SelectionState';
import GlyphIcon from '../Icon/GlyphIcon';
import { asNodeId, type Edge, type NodeId } from '../../core/types';

const CanvasView = () => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const nodes = useGraphStore(state => state.nodes);
    const edges = useGraphStore(state => state.edges);
    const updateNode = useGraphStore(state => state.updateNode);
    const areas = useAreaStore(state => state.areas);
    const selectedAreaId = useAreaStore(state => state.selectedAreaId);
    const selectedAreaIds = useAreaStore(state => state.selectedAreaIds);
    const setSelectedAreaId = useAreaStore(state => state.setSelectedAreaId);
    const toggleSelectedArea = useAreaStore(state => state.toggleSelectedArea);
    const focusedAreaId = useAreaStore(state => state.focusedAreaId);
    const setFocusedAreaId = useAreaStore(state => state.setFocusedAreaId);
    const clearFocusedArea = useAreaStore(state => state.clearFocusedArea);
    const updateArea = useAreaStore(state => state.updateArea);
    const removeArea = useAreaStore(state => state.removeArea);
    const activeTool = useAppStore(state => state.activeTool);
    const currentSpaceId = useAppStore(state => state.currentSpaceId);
    const fieldScopeId = useAppStore(state => state.fieldScopeId);
    const viewContext = useAppStore(state => state.viewContext);
    const { pan, zoom, zoomAt, centerOn } = useCameraStore();
    const setPan = useCameraStore(state => state.setPan);
    const setZoom = useCameraStore(state => state.setZoom);
    const [isSmooth, setIsSmooth] = React.useState(false);
    const [undoSmooth, setUndoSmooth] = React.useState(false);
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

    const isSpacePressed = useRef(false);
    const regionPalette = useMemo(() => ([
        { fill: 'rgba(255,255,255,0.06)', stroke: 'rgba(255,255,255,0.25)' },
        { fill: 'rgba(56,189,248,0.08)', stroke: 'rgba(56,189,248,0.35)' },
        { fill: 'rgba(167,139,250,0.08)', stroke: 'rgba(167,139,250,0.35)' },
        { fill: 'rgba(251,191,36,0.08)', stroke: 'rgba(251,191,36,0.35)' },
        { fill: 'rgba(16,185,129,0.08)', stroke: 'rgba(16,185,129,0.35)' }
    ]), []);

    const snapToGrid = (value: number, cell: number) => Math.round(value / cell) * cell;

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

    const addRing = (areaId: string) => {
        const area = areas.find(item => item.id === areaId);
        if (!area || area.shape !== 'circle' || !area.circle) return;
        const rings = area.rings ? [...area.rings] : [];
        const next = getCircleBoundsRadius(area) + GRID_METRICS.cell;
        rings.push({ id: crypto.randomUUID(), r: next });
        updateArea(areaId, { rings });
    };

    const removeRing = (areaId: string) => {
        const area = areas.find(item => item.id === areaId);
        if (!area || !area.rings || area.rings.length === 0) return;
        updateArea(areaId, { rings: area.rings.slice(0, -1) });
    };

    const toggleAnchorToNode = (areaId: string) => {
        const area = areas.find(item => item.id === areaId);
        if (!area) return;
        const selectedNodes = selectionState.getSelection();
        const isAnchored = area.anchor.type === 'node';
        const activeNodeId = selectedNodes.length === 1 ? selectedNodes[0] : null;
        const anchorNodeId = isAnchored ? area.anchor.nodeId : null;
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

    const alignRegionToGrid = (areaId: string) => {
        const area = areas.find(r => r.id === areaId);
        if (!area || area.shape !== 'rect') return;
        const rect = getAreaRectBounds(area);
        if (!rect) return;
        const cell = GRID_METRICS.cell;
        const bounds = {
            x: snapToGrid(rect.x, cell),
            y: snapToGrid(rect.y, cell),
            w: Math.max(cell, snapToGrid(rect.w, cell)),
            h: Math.max(cell, snapToGrid(rect.h, cell))
        };
        updateArea(areaId, { rect: bounds });
    };

    const bringAreaToFront = (areaId: string) => {
        const maxZ = Math.max(0, ...areas.map(a => a.zIndex ?? 0));
        updateArea(areaId, { zIndex: maxZ + 1 });
    };

    const sendAreaToBack = (areaId: string) => {
        const minZ = Math.min(0, ...areas.map(a => a.zIndex ?? 0));
        updateArea(areaId, { zIndex: minZ - 1 });
    };

    const fitAreaToSelection = (areaId: string) => {
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
            const radius = (node.type === 'root' || node.type === 'core')
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

    const focusArea = (areaId: string) => {
        const area = areas.find(a => a.id === areaId);
        if (!area || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        let bounds = { x: 0, y: 0, w: 0, h: 0 };
        if (area.shape === 'rect') {
            const rect = getAreaRectBounds(area);
            if (rect) bounds = rect;
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

    const cycleRegionColor = (areaId: string) => {
        const area = areas.find(r => r.id === areaId);
        if (!area) return;
        const currentIndex = regionPalette.findIndex(
            palette => palette.fill === area.color && palette.stroke === area.borderColor
        );
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % regionPalette.length : 0;
        const next = regionPalette[nextIndex];
        updateArea(areaId, { color: next.fill, borderColor: next.stroke });
    };

    const beginRenameRegion = (areaId: string, currentName: string) => {
        setEditingRegionId(areaId);
        setRegionNameDraft(currentName);
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
            return node ? { id, x: node.position.x, y: node.position.y } : null;
        }).filter((item): item is { id: NodeId; x: number; y: number } => Boolean(item));
        const activeAreaIds = preserveSelection ? selectedAreaIds : [areaId];
        const startAreas = activeAreaIds.map(id => {
            const target = areas.find(item => item.id === id);
            if (!target || target.anchor.type === 'node') return null;
            return {
                id,
                rect: target.shape === 'rect' && target.rect ? { ...target.rect } : undefined,
                circle: target.shape === 'circle' && target.circle ? {
                    cx: getAreaCenter(target)?.cx ?? 0,
                    cy: getAreaCenter(target)?.cy ?? 0,
                    r: target.circle.r
                } : undefined
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
                startNodes: startNodes.length > 0 ? startNodes : undefined,
                startAreas: startAreas.length > 0 ? startAreas : undefined,
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
                startNodes: startNodes.length > 0 ? startNodes : undefined,
                startAreas: startAreas.length > 0 ? startAreas : undefined,
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
        // Returns null if the entire branch is hidden (shouldn't happen for valid graph) or root is hidden
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

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        const proj = getProjection(e);

        // Basic normalized gesture object
        const target = e.target as Element | null;
        const areaEl = target?.closest('[data-area-id]');
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
            document.body.style.cursor = 'grabbing';
        }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!areaInteraction) {
            const target = e.target as HTMLElement | null;
            const areaEl = target?.closest('[data-area-id]');
            const nextHoverId = areaEl ? areaEl.getAttribute('data-area-id') : null;
            if (nextHoverId !== hoverAreaId) {
                setHoverAreaId(nextHoverId);
            }
            if (nextHoverId) {
                document.body.style.cursor = 'pointer';
            } else if (!isSpacePressed.current) {
                document.body.style.cursor = '';
            }
        } else {
            document.body.style.cursor = 'grabbing';
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
            document.body.style.cursor = 'grab';
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
    };

    const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (stateEngine.getState().viewContext === 'now') return;
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
                const sizePx = node.type === 'root' ? NODE_SIZES.root : node.type === 'cluster' ? NODE_SIZES.cluster : NODE_SIZES.base;
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
                if (stateEngine.getState().fieldScopeId === resolvedId) {
                    stateEngine.setFieldScope(null);
                } else {
                    stateEngine.setFieldScope(resolvedId);
                }
                return;
            }
            if (node) eventBus.emit('UI_SIGNAL', { x: node.position.x, y: node.position.y, type: 'ENTER_NOW' });
            stateEngine.enterNow(resolvedId);
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

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
            const rect = containerRef.current.getBoundingClientRect();
            zoomAt(e.clientX, e.clientY, e.deltaY, rect);
            return;
        }
        useCameraStore.getState().updatePan(-e.deltaX, -e.deltaY);
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
        if (!fieldScopeId) return null;
        const set = new Set<string>();
        nodes.forEach(node => {
            if (!node.meta?.focusHidden) {
                set.add(node.id);
            }
        });
        return set;
    }, [fieldScopeId, nodes]);

    const focusGhostNodeIds = useMemo(() => {
        if (!fieldScopeId) return null;
        const set = new Set<string>();
        nodes.forEach(node => {
            if (node.meta?.focusGhost) {
                set.add(node.id);
            }
        });
        return set;
    }, [fieldScopeId, nodes]);

    const fitToContent = () => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        if (nodes.length === 0) {
            adjustZoomTo(1);
            centerOn(0, 0, rect.width, rect.height);
            return;
        }

        const getRadius = (nodeType: string) => {
            if (nodeType === 'root' || nodeType === 'core') return NODE_SIZES.root / 2;
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

        const boundsW = Math.max(1, maxX - minX);
        const boundsH = Math.max(1, maxY - minY);
        const padding = 80;
        const availableW = Math.max(1, rect.width - padding * 2);
        const availableH = Math.max(1, rect.height - padding * 2);
        const nextZoom = Math.min(availableW / boundsW, availableH / boundsH);
        const clampedZoom = Math.min(Math.max(nextZoom, 0.25), 2.0);
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

        // Disable native pinch-zoom gestures
        const preventDefault = (e: Event) => e.preventDefault();
        const preventWheelZoom = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) e.preventDefault();
        };
        el.addEventListener('gesturestart', preventDefault);
        el.addEventListener('gesturechange', preventDefault);
        el.addEventListener('wheel', preventWheelZoom, { passive: false });

        // Global hotkey listener for Router & local state
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
            const isMod = e.metaKey || e.ctrlKey;
            if (isMod && (e.key === '+' || e.key === '=')) {
                e.preventDefault();
                const currentZoom = useCameraStore.getState().zoom;
                const next = getZoomStep(currentZoom, 'in');
                adjustZoomTo(next);
                return;
            }
            if (isMod && e.key === '-') {
                e.preventDefault();
                const currentZoom = useCameraStore.getState().zoom;
                const next = getZoomStep(currentZoom, 'out');
                adjustZoomTo(next);
                return;
            }
            if (isMod && e.key === '0') {
                e.preventDefault();
                adjustZoomTo(1);
                return;
            }
            if (e.shiftKey && (e.code === 'Digit1' || e.key === '!')) {
                e.preventDefault();
                fitToContent();
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
                setTimeout(() => setIsSmooth(false), 700);
            }
        };
        const unsubFocus = eventBus.on('UI_FOCUS_NODE', onFocus);
        const triggerUndoSmooth = () => {
            setUndoSmooth(true);
            if (undoSmoothTimerRef.current) {
                window.clearTimeout(undoSmoothTimerRef.current);
            }
            undoSmoothTimerRef.current = window.setTimeout(() => setUndoSmooth(false), 300);
        };
        const unsubUndo = eventBus.on('GRAPH_UNDO', triggerUndoSmooth);
        const unsubRedo = eventBus.on('GRAPH_REDO', triggerUndoSmooth);

        return () => {
            el.removeEventListener('gesturestart', preventDefault);
            el.removeEventListener('gesturechange', preventDefault);
            el.removeEventListener('wheel', preventWheelZoom);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            unsubFocus();
            unsubUndo();
            unsubRedo();
            if (undoSmoothTimerRef.current) {
                window.clearTimeout(undoSmoothTimerRef.current);
            }
        };
    }, []);

    const lastCenteredSpaceId = useRef<string | null>(null);

    useEffect(() => {
        if (viewContext !== 'space' || !currentSpaceId || !containerRef.current) return;
        if (lastCenteredSpaceId.current === currentSpaceId) return;

        const coreNode = nodes.find(node => node.type === 'core' || node.type === 'root');
        if (!coreNode && nodes.length > 0) return;

        const rect = containerRef.current.getBoundingClientRect();
        const target = coreNode?.position ?? { x: 0, y: 0 };
        centerOn(target.x, target.y, rect.width, rect.height);
        lastCenteredSpaceId.current = currentSpaceId;
    }, [viewContext, currentSpaceId, centerOn, nodes]);

    useEffect(() => {
        if (!viewContext || viewContext !== 'space') return;
        const currentScope = fieldScopeId;
        const nodeMap = new Map(nodes.map(node => [node.id, node]));
        const focusSet = new Set<string>();
        const ghostSet = new Set<string>();

        const collectChildren = (clusterId: string) => {
            nodes.forEach(node => {
                if (node.meta?.parentClusterId === clusterId) {
                    focusSet.add(node.id);
                }
            });
        };

        if (currentScope) {
            focusSet.add(currentScope);
            collectChildren(currentScope);

            const adjacency = new Map<string, Set<string>>();
            const nodeTypeMap = new Map(nodes.map(node => [node.id, node.type]));
            edges.forEach(edge => {
                if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
                if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());
                adjacency.get(edge.source)?.add(edge.target);
                adjacency.get(edge.target)?.add(edge.source);
            });

            const visited = new Set<string>([currentScope]);
            const queue: Array<{ id: string; depth: number }> = [{ id: currentScope, depth: 0 }];
            const maxDepth = 2;

            while (queue.length > 0) {
                const current = queue.shift();
                if (!current) break;
                const neighbors = adjacency.get(current.id);
                if (!neighbors) continue;
                neighbors.forEach(neighbor => {
                    if (visited.has(neighbor)) return;
                    const neighborType = nodeTypeMap.get(neighbor);
                    if (neighborType === 'core' || neighborType === 'root') return;
                    const nextDepth = current.depth + 1;
                    if (nextDepth > maxDepth) return;
                    visited.add(neighbor);
                    queue.push({ id: neighbor, depth: nextDepth });
                    if (nextDepth === 1) {
                        focusSet.add(neighbor);
                    } else if (nextDepth === 2) {
                        ghostSet.add(neighbor);
                    }
                });
            }
        }

        nodes.forEach(node => {
            const isCoreOrRoot = node.type === 'core' || node.type === 'root';
            const shouldGhost = currentScope ? ghostSet.has(node.id) && !isCoreOrRoot : false;
            const shouldHide = currentScope ? (!focusSet.has(node.id) && !ghostSet.has(node.id)) : false;
            const nextFocusHidden = shouldHide;
            const nextFocusGhost = shouldGhost;
            if (node.meta?.focusHidden === nextFocusHidden && node.meta?.focusGhost === nextFocusGhost) return;
            const meta = { ...(node.meta ?? {}), focusHidden: nextFocusHidden, focusGhost: nextFocusGhost };
            updateNode(node.id, { meta });
        });

        if (currentScope) {
            const scopeNode = nodeMap.get(currentScope as NodeId);
            if (scopeNode && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setIsSmooth(true);
                centerOn(scopeNode.position.x, scopeNode.position.y, rect.width, rect.height);
                setTimeout(() => setIsSmooth(false), 420);
            }
        }
    }, [fieldScopeId, nodes, edges, updateNode, viewContext, centerOn]);

    useEffect(() => {
        if (areaInteraction?.type === 'move') {
            document.body.style.cursor = 'grabbing';
            return () => {
                document.body.style.cursor = '';
            };
        }
        document.body.style.cursor = '';
        return undefined;
    }, [areaInteraction]);

    useEffect(() => {
        if (areaInteraction) return;
        if (spacePanArmed) {
            document.body.style.cursor = 'grab';
            return;
        }
        document.body.style.cursor = '';
    }, [spacePanArmed, areaInteraction]);

    return (
        <div
            ref={containerRef}
            id="sf-canvas"
            className="w-full h-full bg-os-dark overflow-hidden relative touch-none select-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={() => {
                lastHoverEdgeId.current = null;
                useEdgeSelectionStore.getState().setHover(null);
                setHoverAreaId(null);
                if (!isSpacePressed.current) {
                    document.body.style.cursor = '';
                }
            }}
            onDoubleClick={handleDoubleClick}
            onWheel={handleWheel}
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* Dot Matrix Background */}
            <div
                className="absolute inset-0 pointer-events-none"
                data-grid="dot-matrix"
                style={{
                    opacity: Math.min(0.45, 0.2 + zoom * 0.08),
                    backgroundImage: (() => {
                        let gridScale = zoom;
                        const minPx = 8;
                        const maxPx = 24;
                        while (GRID_METRICS.cell * gridScale < minPx) gridScale *= 2;
                        while (GRID_METRICS.cell * gridScale > maxPx) gridScale /= 2;
                        const dotPx = Math.max(1.1, GRID_METRICS.dotRadius * gridScale);
                        return `radial-gradient(circle at 0% 0%, rgba(255,255,255,0.55) ${dotPx}px, transparent ${dotPx}px)`;
                    })(),
                    backgroundSize: (() => {
                        let gridScale = zoom;
                        const minPx = 8;
                        const maxPx = 24;
                        while (GRID_METRICS.cell * gridScale < minPx) gridScale *= 2;
                        while (GRID_METRICS.cell * gridScale > maxPx) gridScale /= 2;
                        return `${GRID_METRICS.cell * gridScale}px ${GRID_METRICS.cell * gridScale}px`;
                    })(),
                    backgroundPosition: (() => {
                        let gridScale = zoom;
                        const minPx = 8;
                        const maxPx = 24;
                        while (GRID_METRICS.cell * gridScale < minPx) gridScale *= 2;
                        while (GRID_METRICS.cell * gridScale > maxPx) gridScale /= 2;
                        const ratio = gridScale / zoom;
                        return `${pan.x * ratio}px ${pan.y * ratio}px`;
                    })()
                }}
            />

            {/* Cosmogenesis Source Node moved to transform layer */}

            {/* Transform Layer (Camera) */}
            <div
                className={`transform-layer absolute inset-0 origin-top-left ${isSmooth ? 'camera-smooth' : ''} ${undoSmooth ? 'undo-smooth' : ''}`}
                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            >
                {/* Regions Layer (Area overlays) */}
                {sortedAreas.length > 0 && (
                    <div className="absolute inset-0 pointer-events-none">
                        {sortedAreas.map((area, areaIndex) => {
                            let focusVisibility: 'visible' | 'ghost' | 'hidden' = 'visible';
                            if (fieldScopeId && focusVisibleNodeIds && focusGhostNodeIds) {
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
                                const center = getAreaCenter(area);
                                const cx = center?.cx ?? 0;
                                const cy = center?.cy ?? 0;
                                const anchorTransition = anchorAnimatingIds.has(area.id)
                                    ? 'left 240ms ease-out, top 240ms ease-out'
                                    : undefined;
                                return (
                                    <React.Fragment key={area.id}>
                                        {area.rings?.map(ring => {
                                            const basePct = Math.max(0, Math.min(100, (area.circle.r / ring.r) * 100));
                                            const color = area.color ?? 'rgba(255,255,255,0.08)';
                                            const colorStrong = color.replace('0.08', '0.18');
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
                                                        borderColor: area.borderColor ?? 'rgba(255,255,255,0.25)',
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
                                                x: cx - area.circle.r,
                                                y: cy - area.circle.r,
                                                w: area.circle.r * 2,
                                                h: area.circle.r * 2
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
                                                const maskImage = `radial-gradient(circle ${area.circle.r}px at ${area.circle.r}px ${area.circle.r}px, #fff 98%, transparent 100%)`;
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
                                                            backgroundColor: area.color ?? 'rgba(255,255,255,0.06)',
                                                            backgroundImage: `radial-gradient(circle at center, ${
                                                                area.color ?? 'rgba(255,255,255,0.08)'
                                                            } 0%, rgba(0,0,0,0) 70%)`,
                                                            opacity: (area.opacity ?? 0.5) * ghostOpacity,
                                                            borderColor: area.borderColor ?? 'rgba(255,255,255,0.25)',
                                                            borderStyle: area.border?.style ?? 'solid',
                                                            borderWidth: (area.border?.width ?? 1.5) * (isSelected ? 1.25 : isHovered ? 1.12 : 1),
                                                            boxShadow: isSelected
                                                                ? '0 0 10px rgba(255,255,255,0.12)'
                                                                : isHovered
                                                                    ? '0 0 8px rgba(255,255,255,0.1)'
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
                                        backgroundColor: area.color ?? 'rgba(255,255,255,0.06)',
                                        backgroundImage: `radial-gradient(ellipse at center, ${
                                            area.color ?? 'rgba(255,255,255,0.08)'
                                        } 0%, rgba(0,0,0,0) 70%)`,
                                        opacity: (area.opacity ?? 0.5) * ghostOpacity,
                                        borderColor: area.borderColor ?? 'rgba(255,255,255,0.25)',
                                        borderStyle: area.border?.style ?? 'solid',
                                        borderWidth: (area.border?.width ?? 1.5) * (isSelected ? 1.25 : isHovered ? 1.12 : 1),
                                        boxShadow: isSelected
                                            ? '0 0 10px rgba(255,255,255,0.12)'
                                            : isHovered
                                                ? '0 0 8px rgba(255,255,255,0.1)'
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
                            const isPrimarySelected = selectedAreaId === area.id;
                            const isEditing = editingRegionId === area.id;
                            const rect = area.shape === 'rect' ? getAreaRectBounds(area) : undefined;
                            const circle = area.shape === 'circle' ? area.circle : undefined;
                            const center = area.shape === 'circle' ? getAreaCenter(area) : null;
                            const radius = area.shape === 'circle' && circle ? getCircleBoundsRadius(area) : 0;
                            const areaTitle = area.title ?? 'Area';
                            const displayAreaTitle = areaTitle.length > 12 ? areaTitle.slice(0, 12) : areaTitle;
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
                                        onDoubleClick={(e) => {
                                            e.stopPropagation();
                                            if (focusedAreaId === area.id) {
                                                clearFocusedArea();
                                            } else {
                                                focusArea(area.id);
                                            }
                                        }}
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
                                                className="px-2 py-0.5 rounded-full bg-black/60 border border-white/20 text-[10px] uppercase tracking-[0.2em] text-white/70 outline-none w-32"
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
                                                        backgroundColor: 'rgb(255,255,255)'
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
                        className="absolute flex items-start justify-center z-50 pointer-events-auto"
                        style={{
                            left: 0, top: 0, width: 0, height: 0,
                        }}
                    >
                        {/* Centered container for visual elements */}
                        <div
                            className="absolute flex flex-col items-center cursor-pointer group"
                            style={{ transform: 'translate(-50%, -50%)' }}
                        >
                            {/* Visual Source: The DOT is the center */}
                            <div className="relative flex items-center justify-center w-16 h-16">
                                {/* Spreading Ring */}
                                <div className="absolute inset-0 rounded-full border border-white/20 animate-source-pulse-spread" />

                                {/* Center Dot */}
                                <div className="w-2.5 h-2.5 bg-white rounded-full animate-source-dot-pulse relative z-10" />
                            </div>

                            {/* Label Container: Positioned absolutely below the dot to avoid shifting the center */}
                            <div
                                className="absolute top-[100%] flex flex-col items-center gap-1.5 pointer-events-none"
                                style={{ paddingTop: `${GRID_METRICS.cell * 2 - 40}px` }}
                            >
                                <span className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-mono select-none group-hover:text-white/60 transition-colors">
                                    Source
                                </span>
                                <span className="text-[8px] uppercase tracking-[0.15em] text-white/20 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0 whitespace-nowrap">
                                    Double-click to materialize
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <InteractionLayer />

                {/* Edges Layer (SVG) */}
                <svg className="absolute inset-0 pointer-events-auto overflow-visible w-full h-full z-0">
                    {renderedEdges.map(edge => (
                        <EdgeRenderer key={edge.id} edge={edge} />
                    ))}
                </svg>

                {/* Nodes Layer (Html) */}
                <div className="nodes-layer absolute inset-0 pointer-events-none z-10">
                    {nodes.map(node => (
                        <NodeRenderer key={node.id} node={node} />
                    ))}
                </div>

            </div>

            {fieldScopeId && (
                <div
                    className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto z-50"
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center gap-3 rounded-full bg-black/70 border border-white/10 px-4 py-2 backdrop-blur-md">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-white/70">
                            Focus Mode
                        </span>
                        <button
                            type="button"
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                stateEngine.setFieldScope(null);
                                selectionState.clear();
                                useAreaStore.getState().clearSelectedAreas();
                                useEdgeSelectionStore.getState().clear();
                            }}
                            className="text-white/70 hover:text-white"
                            title="Exit focus (Esc)"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                                <path d="M6 6l12 12M18 6l-12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* HUD: Stats & Status (Bottom-Left) */}
            <div className="absolute bottom-4 left-4 pointer-events-auto flex flex-col items-start gap-2 z-50">
                {activeTool === TOOLS.LINK && (
                    <div className="pointer-events-none flex items-center gap-2 pr-3 py-1.5 pl-4 opacity-70">
                        <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
                        <span className="text-[9px] uppercase tracking-[0.4em] text-white/40 font-medium">
                            Connection...
                        </span>
                    </div>
                )}
                <div className="pointer-events-none flex gap-4 items-center pr-3 py-1.5 pl-4 opacity-60 hover:opacity-100 transition-opacity">
                    <div className="flex items-baseline gap-1">
                        <span className="text-xs font-medium text-white/80">{nodes.length}</span>
                        <span className="text-[8px] uppercase tracking-widest text-white/40">Nodes</span>
                    </div>
                    <div className="w-[1px] h-3 bg-white/10" />
                    <div className="flex items-baseline gap-1">
                        <span className="text-xs font-medium text-white/80">{edges.length}</span>
                        <span className="text-[8px] uppercase tracking-widest text-white/40">Edges</span>
                    </div>
                </div>
                <div
                    className="pointer-events-auto flex items-center gap-2 pr-3 py-1.5 pl-4 opacity-70 hover:opacity-100 transition-opacity"
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={() => {
                            setZoomPulse('fit');
                            window.setTimeout(() => setZoomPulse(null), 180);
                            fitToContent();
                        }}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors ${zoomPulse === 'fit' ? 'bg-white/20 text-white' : ''} -ml-1`}
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
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors ${zoomPulse === 'out' ? 'bg-white/20 text-white' : ''}`}
                        aria-label="Zoom out"
                    >
                        −
                    </button>
                    <button
                        onClick={() => handleZoomClick('reset')}
                        className={`min-w-[48px] text-[10px] uppercase tracking-[0.2em] text-white/70 hover:text-white ${zoomPulse === 'reset' ? 'text-white' : ''}`}
                        aria-label="Reset zoom"
                    >
                        {Math.round(zoom * 100)}%
                    </button>
                    <button
                        onClick={() => handleZoomClick('in')}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors ${zoomPulse === 'in' ? 'bg-white/20 text-white' : ''}`}
                        aria-label="Zoom in"
                    >
                        +
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CanvasView;
