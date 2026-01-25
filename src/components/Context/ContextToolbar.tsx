/**
 * ContextToolbar.jsx
 * Floating toolbar that appears when a selection exists.
 * Anchor: Near the primary selected node (or bottom-center default for v0.5).
 */

import React, { useEffect, useRef, useState } from 'react';
import { useSelectionStore } from '../../store/useSelectionStore';
import { useAppStore } from '../../store/useAppStore';
import { useGraphStore } from '../../store/useGraphStore';
import { foldCluster, unfoldCluster } from '../../utils/clusterFold';
import { useEdgeSelectionStore } from '../../store/useEdgeSelectionStore';
import { useAreaStore } from '../../store/useAreaStore';
import { eventBus, EVENTS } from '../../core/events/EventBus';
import { graphEngine } from '../../core/graph/GraphEngine';
import { asNodeId, type Edge, type NodeBase, type NodeId } from '../../core/types';
import GlyphPicker from './GlyphPicker';
import ColorPicker from './ColorPicker';
import GlyphIcon from '../Icon/GlyphIcon';
import { GRID_METRICS, NODE_SIZES } from '../../utils/layoutMetrics';
import { useCameraStore } from '../../store/useCameraStore';
import { getGlyphById } from '../../utils/customGlyphs';
import type { NodeData } from '../../core/types';
import { gestureRouter } from '../../core/interaction/GestureRouter';

const ContextToolbar = () => {
    const selectedIds = useSelectionStore(state => state.selectedIds);
    const clearSelection = useSelectionStore(state => state.clear);
    const enterNow = useAppStore(state => state.enterNow);
    const fieldScopeId = useAppStore(state => state.fieldScopeId);
    const setFieldScope = useAppStore(state => state.setFieldScope);
    const contextMenuMode = useAppStore(state => state.contextMenuMode);
    const setTool = useAppStore(state => state.setTool);
    const activeTool = useAppStore(state => state.activeTool);
    const nodes = useGraphStore(state => state.nodes) as NodeBase[];
    const updateNode = useGraphStore(state => state.updateNode);
    const edges = useGraphStore(state => state.edges) as Edge[];
    const removeEdge = useGraphStore(state => state.removeEdge);
    const removeNode = useGraphStore(state => state.removeNode);
    const addAreaRect = useAreaStore(state => state.addAreaRect);
    const selectedAreaIds = useAreaStore(state => state.selectedAreaIds);
    const areas = useAreaStore(state => state.areas);
    const removeArea = useAreaStore(state => state.removeArea);
    const updateArea = useAreaStore(state => state.updateArea);
    const [showLinks, setShowLinks] = useState(false);
    const [showGlyphPicker, setShowGlyphPicker] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showAreaStyle, setShowAreaStyle] = useState(false);
    const [showActionMenu, setShowActionMenu] = useState(false);
    const toolbarRef = useRef<HTMLDivElement | null>(null);
    const actionMenuAnchorRef = useRef<HTMLButtonElement | null>(null);
    const [actionMenuPos, setActionMenuPos] = useState<{ x: number; y: number } | null>(null);
    const [actionMenuAlign, setActionMenuAlign] = useState<'left' | 'right'>('right');
    const [viewport, setViewport] = useState({ width: 0, height: 0 });
    const [isEditingLabel, setIsEditingLabel] = useState(false);
    const [labelDraft, setLabelDraft] = useState('');
    const pan = useCameraStore(state => state.pan);
    const zoom = useCameraStore(state => state.zoom);
    const setPan = useCameraStore(state => state.setPan);
    const setZoom = useCameraStore(state => state.setZoom);
    const focusedAreaId = useAreaStore(state => state.focusedAreaId);
    const setFocusedAreaId = useAreaStore(state => state.setFocusedAreaId);
    const clearFocusedArea = useAreaStore(state => state.clearFocusedArea);
    const selectedEdgeIds = useEdgeSelectionStore(state => state.selectedEdgeIds);
    const primaryId = selectedIds[selectedIds.length - 1] ?? null;
    const primaryAreaId = selectedAreaIds[selectedAreaIds.length - 1] ?? null;
    const totalSelected = selectedIds.length + selectedAreaIds.length + selectedEdgeIds.length;
    const hasNodes = selectedIds.length > 0;
    const hasAreas = selectedAreaIds.length > 0;
    const hasEdges = selectedEdgeIds.length > 0;
    const closeAllMenus = () => {
        setShowGlyphPicker(false);
        setShowColorPicker(false);
        setShowLinks(false);
        setShowAreaStyle(false);
        setShowActionMenu(false);
    };

    const updateActionMenuPos = () => {
        const rect = actionMenuAnchorRef.current?.getBoundingClientRect();
        const toolbarRect = toolbarRef.current?.getBoundingClientRect();
        if (!rect || !toolbarRect) return;
        const padding = 16;
        const menuWidth = 210;
        const rightX = rect.right + 12;
        const leftX = rect.left - 12;
        const canFitRight = rightX + menuWidth <= window.innerWidth - padding;
        const canFitLeft = leftX - menuWidth >= padding;
        if (canFitRight || !canFitLeft) {
            setActionMenuAlign('right');
            setActionMenuPos({
                x: Math.min(rightX, window.innerWidth - padding) - toolbarRect.left,
                y: rect.top + rect.height / 2 - toolbarRect.top
            });
            return;
        }
        setActionMenuAlign('left');
        setActionMenuPos({
            x: Math.max(leftX, padding) - toolbarRect.left,
            y: rect.top + rect.height / 2 - toolbarRect.top
        });
    };

    useEffect(() => {
        const updateViewport = () => {
            setViewport({ width: window.innerWidth, height: window.innerHeight });
        };
        updateViewport();
        window.addEventListener('resize', updateViewport);
        return () => window.removeEventListener('resize', updateViewport);
    }, []);

    const count = totalSelected;
    const primaryNode = primaryId ? nodes.find(n => n.id === primaryId) : undefined;
    const primaryArea = primaryAreaId ? areas.find(area => area.id === primaryAreaId) : undefined;
    const connectedEdges = primaryId ? edges.filter(edge => edge.source === primaryId || edge.target === primaryId) : [];

    const isCluster = primaryNode?.type === 'cluster';
    const isFolded = !!primaryNode?.meta?.isFolded;
    const primaryNodeData = primaryNode?.data as NodeData | undefined;
    const primaryLabel = typeof primaryNodeData?.label === 'string' ? primaryNodeData.label : 'Empty';
    const primaryAreaLabel = primaryArea?.title ?? 'Area';
    const displayPrimaryLabel = primaryLabel.length > 12 ? primaryLabel.slice(0, 12) : primaryLabel;
    const displayPrimaryAreaLabel = primaryAreaLabel.length > 12 ? primaryAreaLabel.slice(0, 12) : primaryAreaLabel;
    const primaryCircleArea = primaryArea?.shape === 'circle' ? primaryArea : undefined;
    const anchoredAreasForNode = primaryId
        ? areas.filter(area => area.anchor.type === 'node' && area.anchor.nodeId === primaryId)
        : [];
    const canAnchorToNode = !!primaryArea && (primaryArea.anchor.type === 'node' || selectedIds.length === 1);
    const canDetachAreasFromNode = selectedIds.length === 1 && !hasAreas && !hasEdges && anchoredAreasForNode.length > 0;
    const nodeBodyColor = primaryNodeData?.color_body ?? primaryNodeData?.color ?? 'rgba(255,255,255,0.06)';
    const nodeStrokeColor = primaryNodeData?.color_stroke ?? primaryNodeData?.color ?? 'rgba(255,255,255,0.4)';
    const nodeGlowColor = primaryNodeData?.color_glow ?? nodeStrokeColor;
    const nodeGlyphColor = primaryNodeData?.color_glyph ?? 'rgba(255,255,255,0.9)';
    const nodeIconValueRaw = typeof primaryNodeData?.icon_value === 'string' ? primaryNodeData.icon_value.trim() : '';
    const nodeIconValue = nodeIconValueRaw === '•' ? '' : nodeIconValueRaw;
    const nodeGlyphIsCustom = nodeIconValue ? getGlyphById(nodeIconValue) : undefined;
    const nodeGlyphFallback = primaryNode?.type === 'root'
        ? 'archecore'
        : primaryNode?.type === 'core'
            ? 'core'
            : primaryNode?.type === 'cluster'
                ? 'cluster'
                : '';
    const nodeGlyphDisplay = nodeGlyphIsCustom ? nodeIconValue : nodeIconValue;
    const nodeGlyphResolved = nodeGlyphDisplay || nodeGlyphFallback;
    const areaPalette = [
        { fill: 'rgba(255,255,255,0.12)', stroke: 'rgba(255,255,255,0.45)' },
        { fill: 'rgba(248,113,113,0.2)', stroke: 'rgba(248,113,113,0.6)' },
        { fill: 'rgba(251,146,60,0.2)', stroke: 'rgba(251,146,60,0.6)' },
        { fill: 'rgba(250,204,21,0.18)', stroke: 'rgba(250,204,21,0.55)' },
        { fill: 'rgba(74,222,128,0.2)', stroke: 'rgba(74,222,128,0.6)' },
        { fill: 'rgba(34,211,238,0.2)', stroke: 'rgba(34,211,238,0.6)' },
        { fill: 'rgba(96,165,250,0.2)', stroke: 'rgba(96,165,250,0.6)' },
        { fill: 'rgba(167,139,250,0.2)', stroke: 'rgba(167,139,250,0.6)' }
    ];
    const areaBorderWidths = [1, 1.5, 2, 2.5, 3];

    useEffect(() => {
        closeAllMenus();
        setIsEditingLabel(false);
        setLabelDraft(primaryLabel);
    }, [primaryId, selectedIds.length, primaryLabel]);

    useEffect(() => {
        const handleOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            if (target.closest('[data-context-menu]')) return;
            closeAllMenus();
        };
        window.addEventListener('mousedown', handleOutside);
        return () => window.removeEventListener('mousedown', handleOutside);
    }, []);

    const getAreaCenter = (area: NonNullable<typeof primaryArea>) => {
        if (area.shape !== 'circle') return null;
        if (area.anchor.type === 'node') {
            const anchorNode = graphEngine.getNode(asNodeId(area.anchor.nodeId));
            if (anchorNode) {
                return { cx: anchorNode.position.x, cy: anchorNode.position.y };
            }
        }
        return { cx: area.circle?.cx ?? 0, cy: area.circle?.cy ?? 0 };
    };

    const getCircleBoundsRadius = (area: NonNullable<typeof primaryArea>) => {
        if (area.shape !== 'circle' || !area.circle) return 0;
        const ringMax = area.rings?.reduce((max, ring) => Math.max(max, ring.r), area.circle.r) ?? area.circle.r;
        return Math.max(area.circle.r, ringMax);
    };

    const handleGlyphSelect = (glyph: string) => {
        if (!primaryNode) return;
        updateNode(primaryId, { data: { ...primaryNode.data, icon_value: glyph } });
        setShowGlyphPicker(false);
    };
    const handleToggleFocusMode = () => {
        if (!primaryNode || primaryNode.type !== 'cluster') return;
        if (fieldScopeId === primaryNode.id) {
            setFieldScope(null);
        } else {
            setFieldScope(primaryNode.id);
        }
    };
    const handleColorSelect = (role: 'body' | 'stroke' | 'glow' | 'glyph', color: string) => {
        if (!primaryNode) return;
        const data = primaryNode.data as NodeData;
        const nextData = { ...data };
        if (role === 'body') nextData.color_body = color;
        if (role === 'stroke') nextData.color_stroke = color;
        if (role === 'glow') nextData.color_glow = color;
        if (role === 'glyph') nextData.color_glyph = color;
        updateNode(primaryId, { data: nextData });
        setShowColorPicker(false);
    };

    const getClusterChildren = (clusterId: NodeId) => (
        nodes.filter(node => node.meta?.parentClusterId === clusterId)
    );

    const releaseClusterChildren = (clusterId: NodeId) => {
        getClusterChildren(clusterId).forEach(child => {
            updateNode(child.id, {
                meta: {
                    ...child.meta,
                    parentClusterId: null,
                    isHidden: false
                }
            });
        });
    };

    const deleteClusterChildren = (clusterId: NodeId) => {
        getClusterChildren(clusterId).forEach(child => {
            removeNode(child.id);
        });
    };

    const requestClusterAction = () => {
        const label = 'Delete';
        const response = window.prompt(
            `${label} cluster?\n` +
            `1 — ${label} cluster and delete children\n` +
            `2 — ${label} cluster and keep children (release to field)\n` +
            `Cancel — abort`,
            '2'
        );
        if (!response) return null;
        const choice = response.trim();
        if (choice === '1') return 'with';
        if (choice === '2') return 'keep';
        return null;
    };
    const handleUngroup = () => {
        if (!primaryNode || primaryNode.type !== 'cluster') return;
        releaseClusterChildren(primaryId);
        removeNode(primaryId);
        clearSelection();
    };

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
            .filter((n): n is NonNullable<ReturnType<typeof graphEngine.getNode>> =>
                Boolean(n && n.type !== 'root' && n.type !== 'core')
            );
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
            meta: { isFolded: false }
        });
        groupNodes.forEach(n => {
            graphEngine.updateNode(n.id, { meta: { parentClusterId: cluster.id } });
            graphEngine.addEdge(cluster.id, n.id, 'default');
        });
        useEdgeSelectionStore.getState().clear();
        eventBus.emit('UI_SIGNAL', { x: clusterX, y: clusterY, type: 'GROUP_CREATED' });
        useSelectionStore.getState().select(cluster.id);
    };
    const handleAreaFromSelection = () => {
        const selectionNodes = selectedIds
            .map(id => nodes.find(node => node.id === id))
            .filter((node): node is NodeBase => Boolean(node && node.type !== 'root' && node.type !== 'core'));
        const selectionAreas = selectedAreaIds
            .map(id => areas.find(area => area.id === id))
            .filter((area): area is NonNullable<typeof area> => Boolean(area));
        if (selectionNodes.length === 0 && selectionAreas.length === 0) return;
        const padding = GRID_METRICS.cell;
        const nodeBounds = selectionNodes.map(node => {
            const radius = node.type === 'root' || node.type === 'core'
                ? NODE_SIZES.root / 2
                : node.type === 'cluster'
                    ? NODE_SIZES.cluster / 2
                    : NODE_SIZES.base / 2;
            return {
                minX: node.position.x - radius,
                maxX: node.position.x + radius,
                minY: node.position.y - radius,
                maxY: node.position.y + radius
            };
        });
        const areaBounds = selectionAreas.map(area => {
            if (area.shape === 'circle' && area.circle) {
                const cx = area.circle.cx ?? 0;
                const cy = area.circle.cy ?? 0;
                return {
                    minX: cx - area.circle.r,
                    maxX: cx + area.circle.r,
                    minY: cy - area.circle.r,
                    maxY: cy + area.circle.r
                };
            }
            if (area.shape === 'rect' && area.rect) {
                return {
                    minX: area.rect.x,
                    maxX: area.rect.x + area.rect.w,
                    minY: area.rect.y,
                    maxY: area.rect.y + area.rect.h
                };
            }
            return null;
        }).filter((item): item is { minX: number; maxX: number; minY: number; maxY: number } => Boolean(item));
        const allBounds = [...nodeBounds, ...areaBounds];
        const minX = Math.min(...allBounds.map(b => b.minX)) - padding;
        const maxX = Math.max(...allBounds.map(b => b.maxX)) + padding;
        const minY = Math.min(...allBounds.map(b => b.minY)) - padding;
        const maxY = Math.max(...allBounds.map(b => b.maxY)) + padding;
        const minZ = Math.min(0, ...areas.map(area => area.zIndex ?? 0));
        addAreaRect({
            x: minX,
            y: minY,
            w: Math.max(40, maxX - minX),
            h: Math.max(40, maxY - minY)
        }, { zIndex: minZ - 1 });
        clearSelection();
    };

    const handleAnchorToNode = () => {
        if (!primaryArea) return;
        const isAnchored = primaryArea.anchor.type === 'node';
        const activeNodeId = selectedIds.length === 1 ? selectedIds[0] : null;
        const anchorNodeId = isAnchored ? primaryArea.anchor.nodeId : null;
        const anchorNode = anchorNodeId ? graphEngine.getNode(anchorNodeId) : null;
        const targetNode = activeNodeId ? graphEngine.getNode(activeNodeId) : null;

        if (isAnchored) {
            if (primaryArea.shape === 'circle' && primaryArea.circle) {
                updateArea(primaryArea.id, {
                    anchor: { type: 'canvas' },
                    circle: {
                        cx: anchorNode?.position.x ?? primaryArea.circle.cx,
                        cy: anchorNode?.position.y ?? primaryArea.circle.cy,
                        r: primaryArea.circle.r
                    }
                });
            }
            if (primaryArea.shape === 'rect' && primaryArea.rect) {
                const rectCenterX = anchorNode?.position.x ?? (primaryArea.rect.x + primaryArea.rect.w / 2);
                const rectCenterY = anchorNode?.position.y ?? (primaryArea.rect.y + primaryArea.rect.h / 2);
                updateArea(primaryArea.id, {
                    anchor: { type: 'canvas' },
                    rect: {
                        x: rectCenterX - primaryArea.rect.w / 2,
                        y: rectCenterY - primaryArea.rect.h / 2,
                        w: primaryArea.rect.w,
                        h: primaryArea.rect.h
                    }
                });
            }
            return;
        }

        if (!targetNode) return;
        if (primaryArea.shape === 'circle' && primaryArea.circle) {
            updateArea(primaryArea.id, {
                anchor: { type: 'node', nodeId: targetNode.id, attach: 'center', follow: 'position', offset: { dx: 0, dy: 0 } },
                circle: {
                    cx: targetNode.position.x,
                    cy: targetNode.position.y,
                    r: primaryArea.circle.r
                }
            });
            return;
        }
        if (primaryArea.shape === 'rect' && primaryArea.rect) {
            updateArea(primaryArea.id, {
                anchor: { type: 'node', nodeId: targetNode.id, attach: 'center', follow: 'position', offset: { dx: 0, dy: 0 } },
                rect: {
                    ...primaryArea.rect,
                    x: targetNode.position.x - primaryArea.rect.w / 2,
                    y: targetNode.position.y - primaryArea.rect.h / 2
                }
            });
        }
    };

    const handleDetachAreasFromNode = () => {
        if (selectedIds.length !== 1) return;
        const nodeId = selectedIds[0];
        const anchorNode = graphEngine.getNode(asNodeId(nodeId));
        anchoredAreasForNode.forEach(area => {
            if (area.shape === 'circle' && area.circle) {
                updateArea(area.id, {
                    anchor: { type: 'canvas' },
                    circle: {
                        cx: anchorNode?.position.x ?? area.circle.cx,
                        cy: anchorNode?.position.y ?? area.circle.cy,
                        r: area.circle.r
                    }
                });
            }
            if (area.shape === 'rect' && area.rect) {
                const rectCenterX = anchorNode?.position.x ?? (area.rect.x + area.rect.w / 2);
                const rectCenterY = anchorNode?.position.y ?? (area.rect.y + area.rect.h / 2);
                updateArea(area.id, {
                    anchor: { type: 'canvas' },
                    rect: {
                        x: rectCenterX - area.rect.w / 2,
                        y: rectCenterY - area.rect.h / 2,
                        w: area.rect.w,
                        h: area.rect.h
                    }
                });
            }
        });
    };
    const handleCycleAreaColor = () => {
        if (!primaryArea) return;
        const currentIndex = areaPalette.findIndex(
            palette => palette.fill === primaryArea.color && palette.stroke === primaryArea.borderColor
        );
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % areaPalette.length : 0;
        const next = areaPalette[nextIndex];
        updateArea(primaryArea.id, { color: next.fill, borderColor: next.stroke });
    };
    const handleAreaStyleSelect = (fill: string, stroke: string) => {
        if (!primaryArea) return;
        updateArea(primaryArea.id, {
            color: fill,
            borderColor: stroke,
            border: primaryArea.border ?? { width: 1.5, style: 'solid' }
        });
    };
    const handleAlignAreaToGrid = () => {
        if (!primaryArea || primaryArea.shape !== 'rect' || !primaryArea.rect) return;
        const cell = GRID_METRICS.cell;
        const snap = (value: number) => Math.round(value / cell) * cell;
        updateArea(primaryArea.id, {
            rect: {
                x: snap(primaryArea.rect.x),
                y: snap(primaryArea.rect.y),
                w: Math.max(cell, snap(primaryArea.rect.w)),
                h: Math.max(cell, snap(primaryArea.rect.h))
            }
        });
    };
    const handleFocusArea = () => {
        if (!primaryArea) return;
        if (focusedAreaId === primaryArea.id) {
            clearFocusedArea();
            return;
        }
        const canvas = document.getElementById('sf-canvas');
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        let bounds = { x: 0, y: 0, w: 0, h: 0 };
        if (primaryArea.shape === 'rect' && primaryArea.rect) {
            bounds = primaryArea.rect;
        } else if (primaryArea.shape === 'circle' && primaryArea.circle) {
            const center = getAreaCenter(primaryArea);
            const radius = getCircleBoundsRadius(primaryArea);
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
        setFocusedAreaId(primaryArea.id);
    };
    const handleSendAreaToBack = () => {
        if (!primaryArea) return;
        const minZ = Math.min(0, ...areas.map(area => area.zIndex ?? 0));
        updateArea(primaryArea.id, { zIndex: minZ - 1 });
    };
    const handleBringAreaToFront = () => {
        if (!primaryArea) return;
        const maxZ = Math.max(0, ...areas.map(area => area.zIndex ?? 0));
        updateArea(primaryArea.id, { zIndex: maxZ + 1 });
    };
    const handleBringAreaForward = () => {
        if (!primaryArea) return;
        const ordered = [...areas].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
        const idx = ordered.findIndex(area => area.id === primaryArea.id);
        if (idx < 0 || idx === ordered.length - 1) return;
        const current = ordered[idx];
        const next = ordered[idx + 1];
        updateArea(current.id, { zIndex: next.zIndex ?? 0 });
        updateArea(next.id, { zIndex: current.zIndex ?? 0 });
    };
    const handleSendAreaBackward = () => {
        if (!primaryArea) return;
        const ordered = [...areas].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
        const idx = ordered.findIndex(area => area.id === primaryArea.id);
        if (idx <= 0) return;
        const current = ordered[idx];
        const prev = ordered[idx - 1];
        updateArea(current.id, { zIndex: prev.zIndex ?? 0 });
        updateArea(prev.id, { zIndex: current.zIndex ?? 0 });
    };
    const handleAddRing = () => {
        if (!primaryCircleArea) return;
        const rings = primaryCircleArea.rings ? [...primaryCircleArea.rings] : [];
        const baseRadius = primaryCircleArea.circle?.r ?? 80;
        const maxRing = rings.reduce((max, ring) => Math.max(max, ring.r), baseRadius);
        rings.push({ id: crypto.randomUUID(), r: maxRing + GRID_METRICS.cell });
        updateArea(primaryCircleArea.id, { rings });
    };
    const handleRemoveRing = () => {
        if (!primaryCircleArea || !primaryCircleArea.rings || primaryCircleArea.rings.length === 0) return;
        updateArea(primaryCircleArea.id, { rings: primaryCircleArea.rings.slice(0, -1) });
    };
    const handleDelete = () => {
        const selectedClusters = selectedIds
            .map(id => nodes.find(node => node.id === id))
            .filter((node): node is NodeBase => Boolean(node && node.type === 'cluster'));
        if (selectedClusters.length > 0) {
            const choice = requestClusterAction();
            if (!choice) return;
            selectedClusters.forEach(cluster => {
                if (choice === 'with') {
                    deleteClusterChildren(cluster.id);
                } else {
                    releaseClusterChildren(cluster.id);
                }
                removeNode(cluster.id);
            });
            const remaining = selectedIds.filter(id => !selectedClusters.some(cluster => cluster.id === id));
            remaining.forEach(id => removeNode(id));
            clearSelection();
            return;
        }
        selectedEdgeIds.forEach((id: string) => removeEdge(id));
        selectedIds.forEach((id: NodeId) => removeNode(id));
        selectedAreaIds.forEach((id: string) => removeArea(id));
        clearSelection();
        useEdgeSelectionStore.getState().clear();
    };

    const toolbarPosition = React.useMemo(() => {
        if (viewport.width === 0 || viewport.height === 0) {
            return {
                left: '50%',
                bottom: '64px',
                transform: 'translateX(-50%)'
            } as React.CSSProperties;
        }
        const offset = GRID_METRICS.cell * 0.6;
        let worldX = 0;
        let worldY = 0;
        if (count > 1) {
            let minX = Infinity;
            let minY = Infinity;
            let maxX = -Infinity;
            let maxY = -Infinity;
            const includePoint = (x: number, y: number) => {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            };
            selectedIds.forEach(id => {
                const node = nodes.find(item => item.id === id);
                if (!node) return;
                const radius = (node.type === 'root' || node.type === 'core')
                    ? NODE_SIZES.root / 2
                    : node.type === 'cluster'
                        ? NODE_SIZES.cluster / 2
                        : NODE_SIZES.base / 2;
                includePoint(node.position.x - radius, node.position.y - radius);
                includePoint(node.position.x + radius, node.position.y + radius);
            });
            selectedAreaIds.forEach(id => {
                const area = areas.find(item => item.id === id);
                if (!area) return;
                if (area.shape === 'rect' && area.rect) {
                    includePoint(area.rect.x, area.rect.y);
                    includePoint(area.rect.x + area.rect.w, area.rect.y + area.rect.h);
                } else if (area.shape === 'circle' && area.circle) {
                    const center = getAreaCenter(area);
                    const radius = getCircleBoundsRadius(area);
                    const cx = center?.cx ?? 0;
                    const cy = center?.cy ?? 0;
                    includePoint(cx - radius, cy - radius);
                    includePoint(cx + radius, cy + radius);
                }
            });
            selectedEdgeIds.forEach(id => {
                const edge = edges.find(item => item.id === id);
                if (!edge) return;
                const source = nodes.find(n => n.id === edge.source);
                const target = nodes.find(n => n.id === edge.target);
                if (source && target) {
                    includePoint(source.position.x, source.position.y);
                    includePoint(target.position.x, target.position.y);
                }
            });
            if (!isFinite(minX)) {
                return {
                    left: '50%',
                    bottom: '64px',
                    transform: 'translateX(-50%)'
                } as React.CSSProperties;
            }
            worldX = (minX + maxX) / 2;
            worldY = minY - offset;
        } else if (hasNodes && primaryNode) {
            const radius = (primaryNode.type === 'root' || primaryNode.type === 'core')
                ? NODE_SIZES.root / 2
                : primaryNode.type === 'cluster'
                    ? NODE_SIZES.cluster / 2
                    : NODE_SIZES.base / 2;
            worldX = primaryNode.position.x;
            worldY = primaryNode.position.y - radius - offset;
        } else if (hasAreas && primaryArea) {
            if (primaryArea.shape === 'rect' && primaryArea.rect) {
                worldX = primaryArea.rect.x + primaryArea.rect.w / 2;
                worldY = primaryArea.rect.y - offset;
            } else if (primaryArea.shape === 'circle' && primaryArea.circle) {
                const center = getAreaCenter(primaryArea);
                const radius = getCircleBoundsRadius(primaryArea);
                worldX = center?.cx ?? 0;
                worldY = (center?.cy ?? 0) - radius - offset;
            }
        } else if (hasEdges && selectedEdgeIds.length === 1) {
            const edge = edges.find(item => item.id === selectedEdgeIds[0]);
            if (edge) {
                const source = nodes.find(n => n.id === edge.source);
                const target = nodes.find(n => n.id === edge.target);
                if (source && target) {
                    worldX = (source.position.x + target.position.x) / 2;
                    worldY = (source.position.y + target.position.y) / 2 - offset;
                }
            }
        }
        const screenX = worldX * zoom + pan.x;
        const screenY = worldY * zoom + pan.y;
        const padding = 16;
        const clampedX = Math.max(padding, Math.min(viewport.width - padding, screenX));
        const clampedY = Math.max(padding, Math.min(viewport.height - padding, screenY));
        return {
            left: `${clampedX}px`,
            top: `${clampedY}px`,
            transform: 'translate(-50%, -100%)'
        } as React.CSSProperties;
    }, [count, viewport, hasNodes, hasAreas, hasEdges, primaryNode, primaryArea, selectedEdgeIds, selectedAreaIds, selectedIds, edges, nodes, zoom, pan]);

    useEffect(() => {
        if (!showActionMenu) return;
        updateActionMenuPos();
        const handleResize = () => updateActionMenuPos();
        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleResize, true);
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleResize, true);
        };
    }, [showActionMenu, toolbarPosition]);

    if (totalSelected === 0 || contextMenuMode === 'radial' || nodes.length === 0) return null;

    return (
        <div ref={toolbarRef} className="absolute z-[var(--z-ui)] animate-materialize" style={toolbarPosition}>
            <div className="glass-panel py-1.5 px-3 flex items-center gap-4 cursor-default context-toolbar relative">

                {/* Info Section */}
                <div className="flex items-center gap-2 pl-4 pr-4 border-r border-white/10 overflow-hidden max-w-[300px]">
                    {count === 1 && hasNodes && !hasAreas && !hasEdges ? (
                        isEditingLabel && contextMenuMode === 'bar' ? (
                            <input
                                value={labelDraft}
                                onChange={(e) => setLabelDraft(e.target.value)}
                                onBlur={() => {
                                    const next = labelDraft.trim() || 'Empty';
                                    if (primaryNode && next !== primaryLabel) {
                                        updateNode(primaryNode.id, { data: { ...primaryNode.data, label: next } });
                                    }
                                    setIsEditingLabel(false);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const next = labelDraft.trim() || 'Empty';
                                        if (primaryNode && next !== primaryLabel) {
                                            updateNode(primaryNode.id, { data: { ...primaryNode.data, label: next } });
                                        }
                                        setIsEditingLabel(false);
                                    }
                                    if (e.key === 'Escape') {
                                        setIsEditingLabel(false);
                                        setLabelDraft(primaryLabel);
                                    }
                                }}
                                className="text-sm font-bold text-white tracking-tight max-w-[12ch] bg-white/5 border border-white/15 rounded-lg px-2 py-1 outline-none"
                                autoFocus
                            />
                        ) : (
                            <button
                                data-testid="context-label"
                                className="text-sm font-bold text-white tracking-tight truncate max-w-[12ch] cursor-pointer"
                                title="Double-click to rename"
                                onClick={() => {
                                    if (typeof window !== 'undefined' && (window as any).__E2E__) {
                                        setIsEditingLabel(true);
                                        setLabelDraft(primaryLabel);
                                    }
                                }}
                                onDoubleClick={() => {
                                    if (contextMenuMode === 'bar') {
                                        setIsEditingLabel(true);
                                        setLabelDraft(primaryLabel);
                                        return;
                                    }
                                    eventBus.emit(EVENTS.UI_REQ_EDIT_LABEL, { nodeId: primaryId });
                                }}
                            >
                                <span className="context-label cursor-text">{displayPrimaryLabel}</span>
                            </button>
                        )
                    ) : count === 1 && hasAreas && !hasNodes && !hasEdges ? (
                        <span className="text-[10px] text-white/80 uppercase tracking-[0.2em] font-medium truncate max-w-[12ch]">
                            {displayPrimaryAreaLabel}
                        </span>
                    ) : count === 1 && hasEdges && !hasNodes && !hasAreas ? (
                        <span className="text-[10px] text-white/80 uppercase tracking-[0.2em] font-medium">
                            Edge selected
                        </span>
                    ) : (
                        <span className="text-[10px] text-white/80 uppercase tracking-[0.2em] font-medium">
                            {count} selected
                        </span>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-1">
                    {count === 1 && hasNodes && !hasAreas && !hasEdges && (
                        <>
                            <button
                                onClick={() => {
                                    if (primaryNode?.type === 'cluster') {
                                        handleToggleFocusMode();
                                        return;
                                    }
                                    enterNow(primaryId);
                                }}
                                className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-xl text-lg leading-none transition-colors"
                                title={primaryNode?.type === 'cluster' ? (fieldScopeId === primaryId ? 'Exit Cluster' : 'Enter Cluster') : `Enter ${primaryNode?.type === 'portal' ? 'Portal' : 'Node'}`}
                            >
                                ↵
                            </button>
                            <button
                                onClick={() => {
                                    setTool('link');
                                    if (primaryId) {
                                        gestureRouter.startLinkPreview(asNodeId(primaryId));
                                    }
                                }}
                                className={`w-10 h-10 flex items-center justify-center rounded-xl text-lg leading-none transition-colors ${activeTool === 'link' ? 'bg-text-primary text-color-os-dark shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'text-white/80 hover:bg-white/10'}`}
                                title="Create Link"
                            >
                                    <GlyphIcon id="link-action" size={20} className={activeTool === 'link' ? 'text-color-os-dark' : 'text-white/80'} />
                                </button>
                            <button
                                onClick={() => {
                                    const next = !showGlyphPicker;
                                    closeAllMenus();
                                    setShowGlyphPicker(next);
                                }}
                                className={`w-10 h-10 flex items-center justify-center rounded-xl text-lg leading-none transition-colors relative border border-transparent focus:outline-none ${showGlyphPicker ? 'bg-text-primary text-color-os-dark shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'text-white/80 hover:bg-white/10'}`}
                                title="Pick Glyph"
                                data-context-menu
                            >
                                {nodeGlyphIsCustom || getGlyphById(nodeGlyphResolved) ? (
                                    <GlyphIcon id={nodeGlyphResolved} size={20} className={showGlyphPicker ? 'text-color-os-dark' : 'text-white/90'} style={{ color: showGlyphPicker ? undefined : nodeGlyphColor }} />
                                ) : (
                                    <span className="text-[18px] leading-none" style={{ color: showGlyphPicker ? undefined : nodeGlyphColor }}>
                                        {nodeGlyphResolved || '○'}
                                    </span>
                                )}
                                {showGlyphPicker && (
                                    <GlyphPicker
                                        onSelect={handleGlyphSelect}
                                        onClose={() => setShowGlyphPicker(false)}
                                        currentGlyph={nodeIconValue}
                                    />
                                )}
                            </button>
                            <button
                                onClick={() => {
                                    const next = !showColorPicker;
                                    closeAllMenus();
                                    setShowColorPicker(next);
                                }}
                                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors relative border border-transparent focus:outline-none ${showColorPicker ? 'bg-text-primary text-color-os-dark shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'text-white/80 hover:bg-white/10'}`}
                                title="Colors"
                                data-context-menu
                            >
                                <span className="w-3.5 h-3.5 rounded-full border border-white/30" style={{ backgroundColor: nodeBodyColor }} />
                                {showColorPicker && (
                                    <ColorPicker
                                        onSelect={handleColorSelect}
                                        onClose={() => setShowColorPicker(false)}
                                        currentColors={{
                                            body: nodeBodyColor,
                                            stroke: nodeStrokeColor,
                                            glow: nodeGlowColor,
                                            glyph: nodeGlyphColor
                                        }}
                                    />
                                )}
                            </button>
                            {canDetachAreasFromNode && (
                                <button
                                    onClick={handleDetachAreasFromNode}
                                    className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-xl text-lg leading-none transition-colors text-white/80"
                                    title="Detach areas from node"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="4" />
                                        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                                    </svg>
                                </button>
                            )}
                        {isCluster && (
                            <button
                                onClick={handleFoldToggle}
                                className="w-10 h-10 flex items-center justify-center hover:bg-white/10 hover:scale-110 rounded-xl text-base leading-none transition-all text-white/80"
                                title={isFolded ? 'Unfold Cluster' : 'Fold Cluster'}
                            >
                                <svg width="20" height="20" viewBox="0 0 28 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="8" />
                                    {isFolded ? (
                                        <>
                                            <path d="M28 12H12" />
                                            <path d="M14 10L12 12L14 14" />
                                        </>
                                    ) : (
                                        <>
                                            <path d="M12 12H28" />
                                            <path d="M26 10L28 12L26 14" />
                                        </>
                                    )}
                                </svg>
                            </button>
                        )}
                        {isCluster && (
                            <button
                                onClick={handleUngroup}
                                className="w-10 h-10 flex items-center justify-center hover:bg-white/10 hover:scale-110 rounded-xl text-base leading-none transition-all text-white/80"
                                title="Collapse Cluster"
                                aria-label="Collapse Cluster"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="6.5" />
                                    <path d="M12 7v10" />
                                </svg>
                            </button>
                        )}
                        </>
                    )}
                    {count === 1 && hasAreas && !hasNodes && !hasEdges && (
                        <>
                            <button
                                onClick={() => {
                                    const next = !showAreaStyle;
                                    closeAllMenus();
                                    setShowAreaStyle(next);
                                }}
                                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors relative border border-transparent focus:outline-none ${showAreaStyle ? 'bg-text-primary text-color-os-dark shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'text-white/80 hover:bg-white/10'}`}
                                title="Style"
                                data-context-menu
                            >
                                <span
                                    className="w-3 h-3 rounded-full border border-white/30"
                                    style={{ backgroundColor: primaryArea?.color ?? 'rgba(255,255,255,0.06)' }}
                                />
                                {showAreaStyle && primaryArea && (
                                    <div
                                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-[280px] bg-black/90 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md flex flex-col z-[200]"
                                        onClick={(e) => e.stopPropagation()}
                                        data-context-menu
                                    >
                                        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                                            <div className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-bold">
                                                Style
                                            </div>
                                            <button
                                                onClick={() => setShowAreaStyle(false)}
                                                className="text-[9px] uppercase tracking-wider text-white/50"
                                            >
                                                Close
                                            </button>
                                        </div>
                                        <div className="px-3 py-2 flex flex-col gap-3">
                                            <div className="flex items-center gap-3">
                                                <span className="text-[9px] uppercase tracking-[0.2em] text-white/40 w-[68px]">
                                                    Color
                                                </span>
                                                <div className="flex-1 grid grid-cols-8 gap-2">
                                                    {areaPalette.map(palette => {
                                                        const isActive = primaryArea.color === palette.fill && primaryArea.borderColor === palette.stroke;
                                                        return (
                                                            <button
                                                                key={palette.fill}
                                                                className={`w-4 h-4 rounded-full ${isActive ? 'ring-1 ring-white/70' : 'border border-white/10'}`}
                                                                style={{ backgroundColor: palette.fill }}
                                                                onClick={() => handleAreaStyleSelect(palette.fill, palette.stroke)}
                                                                title="Fill + border"
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[9px] uppercase tracking-[0.2em] text-white/40 w-[68px]">
                                                    Opacity
                                                </span>
                                                <input
                                                    type="range"
                                                    min={0.1}
                                                    max={1}
                                                    step={0.05}
                                                    value={primaryArea.opacity ?? 0.5}
                                                    onChange={(e) => updateArea(primaryArea.id, { opacity: Number(e.target.value) })}
                                                    className="flex-1"
                                                />
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[9px] uppercase tracking-[0.2em] text-white/40 w-[68px]">
                                                    Border
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => updateArea(primaryArea.id, { border: { ...(primaryArea.border ?? { width: 1.5, style: 'solid' }), style: 'solid' } })}
                                                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${primaryArea.border?.style !== 'dashed' ? 'bg-white/15 text-white' : 'text-white/50 hover:bg-white/10'}`}
                                                        title="Solid"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                                                            <path d="M3 8H13" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => updateArea(primaryArea.id, { border: { ...(primaryArea.border ?? { width: 1.5, style: 'solid' }), style: 'dashed' } })}
                                                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${primaryArea.border?.style === 'dashed' ? 'bg-white/15 text-white' : 'text-white/50 hover:bg-white/10'}`}
                                                        title="Dashed"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2.2 2.2">
                                                            <path d="M3 8H13" />
                                                        </svg>
                                                    </button>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="relative h-6 flex items-center">
                                                        <div className="absolute left-0 right-0 h-[1px] bg-white/20" />
                                                        <div className="relative flex w-full items-center justify-between">
                                                            {areaBorderWidths.map(width => {
                                                                const isActive = (primaryArea.border?.width ?? 1.5) === width;
                                                                return (
                                                                    <button
                                                                        key={width}
                                                                        onClick={() => updateArea(primaryArea.id, { border: { ...(primaryArea.border ?? { width: 1.5, style: 'solid' }), width } })}
                                                                        className={`w-3 h-3 rounded-full ${isActive ? 'bg-white/80' : 'bg-white/20 hover:bg-white/40'}`}
                                                                        title={`Border ${width}`}
                                                                    />
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </button>
                            {primaryArea?.shape === 'rect' && (
                                <>
                                    <button
                                        onClick={handleAlignAreaToGrid}
                                        className="w-10 h-10 flex items-center justify-center hover:bg-white/10 hover:scale-110 rounded-xl transition-all text-white/80"
                                        title="Align to grid"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                                            <path d="M1 4.5H11M1 7.5H11M4.5 1V11M7.5 1V11" />
                                        </svg>
                                    </button>
                                </>
                            )}
                            <button
                                onClick={handleFocusArea}
                                className="w-10 h-10 flex items-center justify-center hover:bg-white/10 hover:scale-110 rounded-xl transition-all text-white/80"
                                title={focusedAreaId === primaryArea?.id ? 'Exit area' : 'Enter area'}
                            >
                                ↵
                            </button>
                            {canAnchorToNode && (
                                <button
                                    onClick={handleAnchorToNode}
                                    className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${primaryArea?.anchor.type === 'node' ? 'bg-text-primary text-color-os-dark shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'text-white/80 hover:bg-white/10'}`}
                                    title={primaryArea?.anchor.type === 'node' ? 'Detach area from node' : 'Anchor area to node'}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="4" />
                                        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                                    </svg>
                                </button>
                            )}
                            <button
                                onClick={() => updateArea(primaryArea.id, { locked: !primaryArea.locked })}
                                className="w-10 h-10 flex items-center justify-center hover:bg-white/10 hover:scale-110 rounded-xl transition-all text-white/80"
                                title={primaryArea.locked ? 'Unlock area' : 'Lock area'}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                                    {primaryArea.locked ? (
                                        <>
                                            <rect x="5" y="11" width="14" height="9" rx="2" />
                                            <path d="M8 11V8a4 4 0 1 1 8 0v3" />
                                        </>
                                    ) : (
                                        <>
                                            <rect x="5" y="11" width="14" height="9" rx="2" />
                                            <path d="M9 11V8a3 3 0 0 1 6 0" />
                                        </>
                                    )}
                                </svg>
                            </button>
                            {primaryCircleArea && (
                                <>
                                    <button
                                        onClick={handleAddRing}
                                        className="w-10 h-10 flex items-center justify-center hover:bg-white/10 hover:scale-110 rounded-xl transition-all text-white/80"
                                        title="Add ring"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                                            <circle cx="12" cy="12" r="6" />
                                            <path d="M12 8v8M8 12h8" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={handleRemoveRing}
                                        className="w-10 h-10 flex items-center justify-center hover:bg-white/10 hover:scale-110 rounded-xl transition-all text-white/80"
                                        title="Remove ring"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                                            <circle cx="12" cy="12" r="6" />
                                            <path d="M8 12h8" />
                                        </svg>
                                    </button>
                                </>
                            )}
                        </>
                    )}
                    {count > 1 && hasNodes && (
                        <>
                            <button
                                onClick={handleAreaFromSelection}
                                className="w-10 h-10 flex items-center justify-center hover:bg-white/10 hover:scale-110 rounded-xl text-lg leading-none transition-all text-white/80"
                                title="Area from selection"
                            >
                                <GlyphIcon id="area" size={20} className="text-white/80" />
                            </button>
                            {canAnchorToNode && (
                                <button
                                    onClick={handleAnchorToNode}
                                    className="w-10 h-10 flex items-center justify-center hover:bg-white/10 hover:scale-110 rounded-xl text-lg leading-none transition-all text-white/80"
                                    title={primaryArea?.anchor.type === 'node' ? 'Detach area from node' : 'Anchor area to node'}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="4" />
                                        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                                    </svg>
                                </button>
                            )}
                            {!hasAreas && !hasEdges && (
                                <button
                                    onClick={handleGroup}
                                    className="w-10 h-10 flex items-center justify-center hover:bg-white/10 hover:scale-110 rounded-xl text-lg leading-none transition-all text-white/80"
                                    title="Group Selection"
                                >
                                    <GlyphIcon id="cluster" size={20} className="text-white/80" />
                                </button>
                            )}
                        </>
                    )}
                    {count > 0 && (
                        <div className="relative shrink-0" data-context-menu>
                            <button
                                ref={actionMenuAnchorRef}
                                onClick={() => {
                                    const next = !showActionMenu;
                                    closeAllMenus();
                                    if (next) {
                                        updateActionMenuPos();
                                    }
                                    setShowActionMenu(next);
                                }}
                                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors border border-transparent focus:outline-none ${showActionMenu ? 'bg-text-primary text-color-os-dark shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'text-white/80 hover:bg-white/10'}`}
                                title="Actions"
                                data-context-menu
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <circle cx="6" cy="12" r="1.6" />
                                    <circle cx="12" cy="12" r="1.6" />
                                    <circle cx="18" cy="12" r="1.6" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>

                {/* Close */}
            </div>

            {showActionMenu && actionMenuPos && (
                <div
                    className="absolute z-[var(--z-ui)] glass-panel px-2 py-2 min-w-[190px] border-0 flex flex-col gap-1"
                    style={{
                        left: actionMenuPos.x,
                        top: actionMenuPos.y,
                        transform: actionMenuAlign === 'left' ? 'translate(-100%, -50%)' : 'translateY(-50%)'
                    }}
                    data-context-menu
                >
                    {connectedEdges.length > 0 && (
                        <>
                            <button
                                onClick={() => setShowLinks(prev => !prev)}
                                className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-sm ${showLinks ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5'}`}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                                    <circle cx="6.5" cy="7" r="1.6" fill="currentColor" stroke="none" />
                                    <circle cx="6.5" cy="12" r="1.6" fill="currentColor" stroke="none" />
                                    <circle cx="6.5" cy="17" r="1.6" fill="currentColor" stroke="none" />
                                    <path d="M10 7h8M10 12h8M10 17h8" />
                                </svg>
                                Links
                            </button>
                            <div className="h-px bg-white/10 my-1" />
                        </>
                    )}
                    {primaryArea && hasAreas && !hasNodes && !hasEdges && (
                        <>
                            <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 px-2 pt-1">
                                Layer
                            </div>
                            <button
                                onClick={handleBringAreaToFront}
                                className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-sm text-white/70 hover:bg-white/5"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 6h12" />
                                    <path d="M6 16l6-6l6 6" />
                                </svg>
                                Bring to front
                            </button>
                            <button
                                onClick={handleBringAreaForward}
                                className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-sm text-white/70 hover:bg-white/5"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 16l6-6l6 6" />
                                </svg>
                                Bring forward
                            </button>
                            <button
                                onClick={handleSendAreaBackward}
                                className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-sm text-white/70 hover:bg-white/5"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 8l6 6l6-6" />
                                </svg>
                                Send backward
                            </button>
                            <button
                                onClick={handleSendAreaToBack}
                                className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-sm text-white/70 hover:bg-white/5"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 18h12" />
                                    <path d="M6 10l6 6l6-6" />
                                </svg>
                                Send to back
                            </button>
                            <div className="h-px bg-white/10 my-1" />
                        </>
                    )}
                    <button
                        onClick={handleDelete}
                        className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-sm text-red-300 hover:bg-red-500/15"
                    >
                        <GlyphIcon id="delete" size={18} className="text-red-300" />
                        Delete
                    </button>
                    {showLinks && connectedEdges.length > 0 && (
                        <div className="absolute top-1/2 left-full ml-3 -translate-y-1/2 glass-panel px-2 py-2 min-w-[210px] border-0 flex flex-col gap-1" data-context-menu>
                            <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 px-2 pb-1">
                                Links
                            </div>
                            <div className="flex flex-col gap-1 max-h-52 overflow-auto px-1">
                                {connectedEdges.map(edge => {
                                    const otherId = edge.source === primaryId ? edge.target : edge.source;
                                    const otherNode = nodes.find(n => n.id === otherId);
                                    const label = typeof otherNode?.data?.label === 'string' ? otherNode.data.label : otherId;
                                    return (
                                        <div key={edge.id} className="flex items-center justify-between gap-2 px-1 py-1 rounded hover:bg-white/5">
                                            <span className="text-xs text-white/70 truncate">
                                                {label}
                                            </span>
                                            <button
                                                onClick={() => removeEdge(edge.id)}
                                                className="text-xs text-white/40 hover:text-white/80"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {showLinks && connectedEdges.length > 0 && null}
        </div>
    );
};

export default ContextToolbar;
