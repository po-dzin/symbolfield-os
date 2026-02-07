/**
 * GestureRouter.js
 * Implements the "No magic clicks" pipeline:
 * Gesture -> Intent -> Action -> Event
 * 
 * References: UI_INTERACTION_PIPELINE_SoT_v0.5
 */

import { eventBus, EVENTS } from '../events/EventBus';
import { stateEngine, TOOLS } from '../state/StateEngine';
import { graphEngine } from '../graph/GraphEngine';
import { selectionState } from '../state/SelectionState';
import { useCameraStore } from '../../store/useCameraStore';
import { useEdgeSelectionStore } from '../../store/useEdgeSelectionStore';
import { useAreaStore } from '../../store/useAreaStore';
import { useAppStore } from '../../store/useAppStore';
import { asEdgeId, asNodeId, type NodeId } from '../types';
import { GRID_METRICS, NODE_SIZES } from '../../utils/layoutMetrics';
import { snapPointToGrid, snapValueToGrid } from '../../utils/gridSnap';

type TargetType = 'node' | 'edge' | 'empty';

interface PointerModifiers {
    shift?: boolean;
    ctrl?: boolean;
    alt?: boolean;
    meta?: boolean;
    space?: boolean;
    doubleClick?: boolean;
}

interface PointerGesture {
    x: number;
    y: number;
    screenX: number;
    screenY: number;
    button?: number;
    modifiers: PointerModifiers;
    targetType: TargetType;
    targetId?: string | null;
    targetPart?: string | null;
}

interface MoveGesture {
    x: number;
    y: number;
    screenX: number;
    screenY: number;
    modifiers: PointerModifiers;
}

type ActiveInteraction = {
    type: string;
    [key: string]: unknown;
} | null;

class GestureRouter {
    private activeInteraction: ActiveInteraction;
    private pendingLinkSource: NodeId | string | null;
    private pendingLinkAssociative: boolean;
    private activeEdgeId: string | null;
    private lastPointer: { x: number; y: number; has: boolean };
    private lastClick: { time: number; targetId: string | null; targetType: 'node' | null };

    constructor() {
        this.activeInteraction = null; // { type, startX, startY, ...data }
        this.pendingLinkSource = null; // Click-to-link source in L mode
        this.pendingLinkAssociative = false;
        this.activeEdgeId = null;
        this.lastPointer = { x: 0, y: 0, has: false };
        this.lastClick = { time: 0, targetId: null, targetType: null };
    }

    private _isGridSnapEnabled() {
        return useAppStore.getState().gridSnapEnabled;
    }

    private _snapPoint(x: number, y: number) {
        const stepMul = stateEngine.getState().gridStepMul ?? 1;
        const cell = GRID_METRICS.cell * stepMul;
        return this._isGridSnapEnabled() ? snapPointToGrid({ x, y }, cell) : { x, y };
    }

    private _getNodeRadius(node: { type?: string }) {
        if (node.type === 'core') return NODE_SIZES.root / 2;
        if (node.type === 'cluster') return NODE_SIZES.cluster / 2;
        return NODE_SIZES.base / 2;
    }

    private _isOverlapping(x: number, y: number, radius: number, others: Array<{ x: number; y: number; r: number }>) {
        for (const other of others) {
            const dx = x - other.x;
            const dy = y - other.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = radius + other.r;
            if (dist < (minDist - 0.5)) return true;
        }
        return false;
    }

    private _findFreePosition(
        x: number,
        y: number,
        radius: number,
        others: Array<{ x: number; y: number; r: number }>,
        step: number
    ) {
        if (!this._isOverlapping(x, y, radius, others)) {
            return { x, y };
        }
        let nearest: { x: number; y: number; r: number } | null = null;
        let nearestDist = Infinity;
        for (const other of others) {
            const dx = x - other.x;
            const dy = y - other.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = radius + other.r;
            if (dist < minDist && dist < nearestDist) {
                nearest = other;
                nearestDist = dist;
            }
        }
        if (nearest) {
            const dx = x - nearest.x;
            const dy = y - nearest.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = radius + nearest.r;
            const ux = dist > 0.001 ? dx / dist : 1;
            const uy = dist > 0.001 ? dy / dist : 0;
            const candX = nearest.x + (ux * minDist);
            const candY = nearest.y + (uy * minDist);
            if (!this._isOverlapping(candX, candY, radius, others)) {
                return { x: candX, y: candY };
            }
        }
        const offsets = [
            [0, -1], [1, 0], [0, 1], [-1, 0],
            [1, -1], [1, 1], [-1, 1], [-1, -1]
        ];
        for (let ring = 1; ring <= 12; ring += 1) {
            for (const offset of offsets) {
                const ox = offset[0];
                const oy = offset[1];
                if (ox === undefined || oy === undefined) continue;
                const candX = x + (ox * step * ring);
                const candY = y + (oy * step * ring);
                if (!this._isOverlapping(candX, candY, radius, others)) {
                    return { x: candX, y: candY };
                }
            }
        }
        return { x, y };
    }

    startLinkPreview(sourceId: NodeId, associative = false) {
        const sourceNode = graphEngine.getNode(sourceId);
        if (!sourceNode) return;
        const getNodeRadius = (node: typeof sourceNode) => {
            if (node.type === 'core') return NODE_SIZES.root / 2;
            if (node.type === 'cluster') return NODE_SIZES.cluster / 2;
            return NODE_SIZES.base / 2;
        };
        this.pendingLinkSource = sourceId;
        this.pendingLinkAssociative = associative;
        this.activeInteraction = {
            type: 'LINK_PREVIEW',
            sourceId,
            startX: sourceNode.position.x,
            startY: sourceNode.position.y,
            associative
        };
        eventBus.emit('UI_INTERACTION_START', { type: 'LINK_DRAG' });
        const targetX = this.lastPointer.has ? this.lastPointer.x : sourceNode.position.x;
        const targetY = this.lastPointer.has ? this.lastPointer.y : sourceNode.position.y;
        const lx = targetX - sourceNode.position.x;
        const ly = targetY - sourceNode.position.y;
        const lDist = Math.sqrt(lx * lx + ly * ly);
        const radius = getNodeRadius(sourceNode);
        let x1 = sourceNode.position.x;
        let y1 = sourceNode.position.y;
        const safeDist = lDist > 0.0001 ? lDist : 1;
        const ux = lDist > 0.0001 ? lx / safeDist : 1;
        const uy = lDist > 0.0001 ? ly / safeDist : 0;
        x1 += ux * radius;
        y1 += uy * radius;
        const edgeDist = radius + 0.01;
        const x2 = lDist > edgeDist ? targetX : x1;
        const y2 = lDist > edgeDist ? targetY : y1;
        eventBus.emit('UI_INTERACTION_UPDATE', {
            type: 'LINK_DRAG',
            line: { x1, y1, x2, y2 },
            associative
        });
    }

    private clearLinkPreview() {
        if (this.activeInteraction?.type === 'LINK_PREVIEW') {
            this.activeInteraction = null;
            eventBus.emit('UI_INTERACTION_END', { type: 'LINK_DRAG' });
        }
    }

    /**
     * Main Entry Point for Pointer Down/Click
     * @param {Object} gesture - { x, y, button, modifiers, targetType, targetId }
     */
    handlePointerDown(gesture: PointerGesture) {
        const context = stateEngine.getState();
        this.activeEdgeId = null;
        const toNodeId = (id: NodeId | string) => (typeof id === 'string' ? asNodeId(id) : id);
        if (gesture.targetType === 'edge') {
            const edgeId = gesture.targetId;
            if (!edgeId) return;
            this.activeEdgeId = edgeId;
            if (!gesture.modifiers.shift) {
                selectionState.clear();
                useEdgeSelectionStore.getState().select(edgeId, false);
                useAreaStore.getState().clearSelectedAreas();
            } else {
                useEdgeSelectionStore.getState().toggle(edgeId);
            }
            return;
        }
        if (gesture.targetType === 'empty' && gesture.button === 0 && !gesture.modifiers.shift) {
            if (context.activeTool === TOOLS.LINK && this.pendingLinkSource) {
                return;
            }
            selectionState.clear();
            useEdgeSelectionStore.getState().clear();
            useAreaStore.getState().clearSelectedAreas();
        }
        if (gesture.targetType === 'node' && !gesture.modifiers.shift) {
            useEdgeSelectionStore.getState().clear();
            this.activeEdgeId = null;
        }
        if (gesture.targetType === 'empty' && gesture.modifiers.doubleClick) {
            const now = Date.now();
            if (this.lastClick.targetType === 'node' && now - this.lastClick.time < 350) {
                return;
            }
        }
        if (gesture.targetType === 'node' && gesture.targetId) {
            // Prevent Enter-Now on Label (reserved for edit)
            if (gesture.targetPart === 'label') {
                return;
            }

            const now = Date.now();
            const isDoubleTap = now - this.lastClick.time < 350 && this.lastClick.targetId === gesture.targetId;
            this.lastClick = { time: now, targetId: gesture.targetId, targetType: 'node' };
            if (isDoubleTap && context.activeTool === TOOLS.POINTER) {
                this._executeAction({ type: 'OPEN_NODE', nodeId: toNodeId(gesture.targetId) });
                return;
            }
        }
        if (context.activeTool === TOOLS.LINK && this.pendingLinkSource && gesture.targetType === 'node') {
            if (gesture.targetId && gesture.targetId === this.pendingLinkSource) {
                return;
            }
            if (gesture.targetId && gesture.targetId !== this.pendingLinkSource) {
                const sourceId = toNodeId(this.pendingLinkSource);
                const targetId = toNodeId(gesture.targetId);
                const associative = this.pendingLinkAssociative || gesture.modifiers.alt;
                graphEngine.addEdge(sourceId, targetId, associative ? 'associative' : 'default');
                const node = graphEngine.getNode(targetId);
                if (node) {
                    eventBus.emit('UI_SIGNAL', { x: node.position.x, y: node.position.y, id: targetId, sourceId });
                }
                this.pendingLinkSource = null;
                this.pendingLinkAssociative = false;
                this.clearLinkPreview();
                return;
            }
        }
        const intent = this._interpretIntent(gesture, context);

        if (intent) {
            this._executeAction(intent);
        }
    }

    handlePointerMove(gesture: MoveGesture) {
        this.lastPointer = { x: gesture.x, y: gesture.y, has: true };
        if (!this.activeInteraction) return;

        const { x, y } = gesture;
        const interaction = this.activeInteraction as Record<string, any>;

        if (interaction.type === 'BOX_SELECT') {
            const rect = {
                x: Math.min(interaction.startX, x),
                y: Math.min(interaction.startY, y),
                width: Math.abs(x - interaction.startX),
                height: Math.abs(y - interaction.startY)
            };
            eventBus.emit('UI_INTERACTION_UPDATE', { type: 'BOX_SELECT', rect });
        }
        else if (interaction.type === 'REGION_DRAW') {
            if (interaction.shape === 'circle') {
                const dx = x - interaction.startX;
                const dy = y - interaction.startY;
                const r = Math.sqrt(dx * dx + dy * dy);
                eventBus.emit('UI_INTERACTION_UPDATE', {
                    type: 'REGION_DRAW',
                    shape: 'circle',
                    circle: { cx: interaction.startX, cy: interaction.startY, r }
                });
            } else {
                const rect = {
                    x: Math.min(interaction.startX, x),
                    y: Math.min(interaction.startY, y),
                    width: Math.abs(x - interaction.startX),
                    height: Math.abs(y - interaction.startY)
                };
                eventBus.emit('UI_INTERACTION_UPDATE', { type: 'REGION_DRAW', rect, shape: 'rect' });
            }
        }
        else if (interaction.type === 'DRAG_NODES') {
            const zoom = useCameraStore.getState().zoom;
            const dx = (gesture.screenX - interaction.lastScreenX) / zoom;
            const dy = (gesture.screenY - interaction.lastScreenY) / zoom;

            interaction.lastScreenX = gesture.screenX;
            interaction.lastScreenY = gesture.screenY;

            interaction.nodeIds.forEach((id: NodeId) => {
                const node = graphEngine.getNode(id);
                if (node && node.type !== 'core') {
                    graphEngine.updateNode(id, {
                        position: { x: node.position.x + dx, y: node.position.y + dy }
                    });
                }
            });
            const areaState = useAreaStore.getState();
            if (areaState.selectedAreaIds.length > 0) {
                areaState.selectedAreaIds.forEach(areaId => {
                    const area = areaState.areas.find(item => item.id === areaId);
                    if (!area || area.locked) return;
                    if (area.shape === 'rect' && area.rect) {
                        areaState.updateArea(area.id, {
                            rect: {
                                x: area.rect.x + dx,
                                y: area.rect.y + dy,
                                w: area.rect.w,
                                h: area.rect.h
                            }
                        });
                    }
                    if (area.shape === 'circle' && area.circle) {
                        const cx = area.circle.cx ?? 0;
                        const cy = area.circle.cy ?? 0;
                        areaState.updateArea(area.id, {
                            circle: { cx: cx + dx, cy: cy + dy, r: area.circle.r }
                        });
                    }
                });
            }
        }
        else if (interaction.type === 'PAN') {
            const dx = gesture.screenX - interaction.lastScreenX;
            const dy = gesture.screenY - interaction.lastScreenY;
            interaction.lastScreenX = gesture.screenX;
            interaction.lastScreenY = gesture.screenY;

            useCameraStore.getState().updatePan(dx, dy);
        }
        else if (interaction.type === 'LINK_ARM') {
            const dx = gesture.screenX - interaction.startScreenX;
            const dy = gesture.screenY - interaction.startScreenY;
            if (!interaction.hasDragged && (dx * dx + dy * dy) > 16) {
                interaction.hasDragged = true;
            }
            if (!interaction.hasDragged) {
                return;
            }
            this.activeInteraction = {
                type: 'LINK_DRAG',
                sourceId: interaction.sourceId,
                startX: interaction.startX,
                startY: interaction.startY,
                associative: interaction.associative,
                startScreenX: interaction.startScreenX,
                startScreenY: interaction.startScreenY,
                hasDragged: true
            };
            eventBus.emit('UI_INTERACTION_START', {
                type: 'LINK_DRAG',
                associative: interaction.associative
            });
            return;
        }
        else if (interaction.type === 'LINK_DRAG') {
            const dx = gesture.screenX - interaction.startScreenX;
            const dy = gesture.screenY - interaction.startScreenY;
            if (!interaction.hasDragged && (dx * dx + dy * dy) > 16) {
                interaction.hasDragged = true;
            }

            // Clip visuals to node edge (so line doesn't come from center)
            const lx = x - interaction.startX;
            const ly = y - interaction.startY;
            const lDist = Math.sqrt(lx * lx + ly * ly);
            const sourceNode = graphEngine.getNode(interaction.sourceId as NodeId);
            const radius = sourceNode
                ? (sourceNode.type === 'core')
                    ? NODE_SIZES.root / 2
                    : sourceNode.type === 'cluster'
                        ? NODE_SIZES.cluster / 2
                        : NODE_SIZES.base / 2
                : NODE_SIZES.base / 2;
            let x1 = interaction.startX;
            let y1 = interaction.startY;

            const safeDist = lDist > 0.0001 ? lDist : 1;
            const ux = lDist > 0.0001 ? lx / safeDist : 1;
            const uy = lDist > 0.0001 ? ly / safeDist : 0;
            x1 += ux * radius;
            y1 += uy * radius;

            const edgeDist = radius + 0.01;
            const x2 = lDist > edgeDist ? x : x1;
            const y2 = lDist > edgeDist ? y : y1;
            eventBus.emit('UI_INTERACTION_UPDATE', {
                type: 'LINK_DRAG',
                line: { x1, y1, x2, y2 },
                associative: interaction.associative
            });
        }
        else if (interaction.type === 'LINK_PREVIEW') {
            const lx = x - interaction.startX;
            const ly = y - interaction.startY;
            const lDist = Math.sqrt(lx * lx + ly * ly);
            const sourceNode = graphEngine.getNode(interaction.sourceId as NodeId);
            const radius = sourceNode
                ? (sourceNode.type === 'core')
                    ? NODE_SIZES.root / 2
                    : sourceNode.type === 'cluster'
                        ? NODE_SIZES.cluster / 2
                        : NODE_SIZES.base / 2
                : NODE_SIZES.base / 2;
            let x1 = interaction.startX;
            let y1 = interaction.startY;
            const safeDist = lDist > 0.0001 ? lDist : 1;
            const ux = lDist > 0.0001 ? lx / safeDist : 1;
            const uy = lDist > 0.0001 ? ly / safeDist : 0;
            x1 += ux * radius;
            y1 += uy * radius;
            const edgeDist = radius + 0.01;
            const x2 = lDist > edgeDist ? x : x1;
            const y2 = lDist > edgeDist ? y : y1;
            eventBus.emit('UI_INTERACTION_UPDATE', {
                type: 'LINK_DRAG',
                line: { x1, y1, x2, y2 },
                associative: interaction.associative
            });
        }
    }

    handlePointerUp(gesture: PointerGesture) {
        if (!this.activeInteraction) return;

        const interaction = this.activeInteraction as Record<string, any>;
        const toNodeId = (id: NodeId | string) => (typeof id === 'string' ? asNodeId(id) : id);

        if (interaction.type === 'LINK_ARM') {
            this._executeAction({ type: 'SELECT_SINGLE', nodeId: interaction.sourceId });
            this.clearLinkPreview();
        }
        if (interaction.type === 'LINK_DRAG') {
            const targetId = gesture.targetType === 'node' ? gesture.targetId : null;
            const sourceId = interaction.sourceId as NodeId;
            const associative = !!interaction.associative || !!gesture.modifiers.alt;

            if (targetId && targetId !== sourceId) {
                const selection = selectionState.getSelection();
                const sources = (selection.includes(sourceId) && selection.length > 1)
                    ? selection
                    : [sourceId];

                sources.forEach(sid => {
                    if (sid !== targetId) {
                        graphEngine.addEdge(toNodeId(sid), toNodeId(targetId), associative ? 'associative' : 'default');
                        const node = graphEngine.getNode(toNodeId(targetId));
                        if (node) eventBus.emit('UI_SIGNAL', { x: node.position.x, y: node.position.y, id: targetId, sourceId: sid });
                    }
                });
            } else if (!targetId && gesture.targetType === 'empty') {
                // Link to Empty Field: Create new node and link it
                const snapped = this._snapPoint(gesture.x, gesture.y);
                const others = graphEngine.getNodes()
                    .map(node => ({ x: node.position.x, y: node.position.y, r: this._getNodeRadius(node) }));
                const step = this._isGridSnapEnabled() ? GRID_METRICS.cell : NODE_SIZES.base / 2;
                const placed = this._findFreePosition(snapped.x, snapped.y, NODE_SIZES.base / 2, others, step);
                const newNode = graphEngine.addNode({
                    position: { x: placed.x, y: placed.y },
                    data: { label: 'Empty' }
                });
                graphEngine.addEdge(toNodeId(sourceId), newNode.id, associative ? 'associative' : 'default');
                eventBus.emit('UI_SIGNAL', { x: placed.x, y: placed.y, id: newNode.id, sourceId: sourceId });
            }
            eventBus.emit('UI_INTERACTION_END', { type: 'LINK_DRAG' });
        }
        if (interaction.type === 'LINK_PREVIEW') {
            if (gesture.targetType === 'empty' && interaction.sourceId) {
                const snapped = this._snapPoint(gesture.x, gesture.y);
                const others = graphEngine.getNodes()
                    .map(node => ({ x: node.position.x, y: node.position.y, r: this._getNodeRadius(node) }));
                const step = this._isGridSnapEnabled() ? GRID_METRICS.cell : NODE_SIZES.base / 2;
                const placed = this._findFreePosition(snapped.x, snapped.y, NODE_SIZES.base / 2, others, step);
                const newNode = graphEngine.addNode({
                    position: { x: placed.x, y: placed.y },
                    data: { label: 'Empty' }
                });
                const associative = !!interaction.associative || !!gesture.modifiers.alt;
                graphEngine.addEdge(toNodeId(interaction.sourceId as NodeId), newNode.id, associative ? 'associative' : 'default');
                eventBus.emit('UI_SIGNAL', { x: placed.x, y: placed.y, id: newNode.id, sourceId: interaction.sourceId });
                this.pendingLinkSource = null;
                this.pendingLinkAssociative = false;
            }
            this.activeInteraction = null;
            eventBus.emit('UI_INTERACTION_END', { type: 'LINK_DRAG' });
        }

        if (interaction.type === 'DRAG_NODES') {
            const dx = gesture.screenX - interaction.startX;
            const dy = gesture.screenY - interaction.startY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const nodeIds = interaction.nodeIds as NodeId[];
            const startPositions = interaction.startPositions as Record<string, { x: number; y: number }> | undefined;

            if (dist < 5 && interaction.startNodeId) {
                this._executeAction({ type: 'SELECT_SINGLE', nodeId: interaction.startNodeId });
            }
            if (dist >= 5) {
                const staticNodes = graphEngine.getNodes()
                    .filter(node => !nodeIds?.includes(node.id))
                    .map(node => ({ x: node.position.x, y: node.position.y, r: this._getNodeRadius(node) }));
                const resolved: Array<{ x: number; y: number; r: number }> = [];
                const step = this._isGridSnapEnabled() ? GRID_METRICS.cell : NODE_SIZES.base / 2;
                nodeIds?.forEach((id) => {
                    const node = graphEngine.getNode(id);
                    if (!node || node.type === 'core') return;
                    const snapped = this._snapPoint(node.position.x, node.position.y);
                    const radius = this._getNodeRadius(node);
                    const placed = this._findFreePosition(
                        snapped.x,
                        snapped.y,
                        radius,
                        [...staticNodes, ...resolved],
                        step
                    );
                    resolved.push({ x: placed.x, y: placed.y, r: radius });
                    if (placed.x !== node.position.x || placed.y !== node.position.y) {
                        graphEngine.updateNode(id, { position: placed });
                    }
                });
            }
            const endPositions: Record<string, { x: number; y: number }> = {};
            nodeIds?.forEach((id) => {
                const node = graphEngine.getNode(id);
                if (node) {
                    endPositions[id] = { x: node.position.x, y: node.position.y };
                }
            });
            eventBus.emit('UI_INTERACTION_END', {
                type: 'DRAG_NODES',
                ...(nodeIds ? { nodeIds } : {}),
                ...(startPositions ? { startPositions } : {}),
                endPositions,
                moved: dist >= 5
            });
        }

        if (interaction.type === 'BOX_SELECT') {
            const { x, y } = gesture;
            const startX = interaction.startX;
            const startY = interaction.startY;
            const rect = {
                x: Math.min(startX, x),
                y: Math.min(startY, y),
                w: Math.abs(x - startX),
                h: Math.abs(y - startY)
            };

            const hitNodes: NodeId[] = [];
            graphEngine.getNodes().forEach(n => {
                if (n.meta?.focusHidden) return;
                if (n.position.x >= rect.x && n.position.x <= rect.x + rect.w &&
                    n.position.y >= rect.y && n.position.y <= rect.y + rect.h) {
                    hitNodes.push(n.id);
                }
            });

            if (interaction.append) {
                const current = selectionState.getSelection();
                const set = new Set([...current, ...hitNodes]);
                selectionState.setSelection(Array.from(set));
            } else {
                selectionState.setSelection(hitNodes);
            }

            // Also select edges if both ends are selected
            const finalNodeSelection = new Set(selectionState.getSelection());
            const edges = graphEngine.getEdges();
            const hitEdges: string[] = [];

            edges.forEach(edge => {
                if (finalNodeSelection.has(edge.source) && finalNodeSelection.has(edge.target)) {
                    hitEdges.push(edge.id);
                }
            });

            if (interaction.append) {
                const currentEdges = useEdgeSelectionStore.getState().selectedEdgeIds;
                const edgeSet = new Set([...currentEdges, ...hitEdges]);
                useEdgeSelectionStore.getState().setSelection(Array.from(edgeSet));
            } else {
                useEdgeSelectionStore.getState().setSelection(hitEdges);
            }

            const areas = useAreaStore.getState().areas;
            const hitAreas: string[] = [];
            areas.forEach(area => {
                if (area.shape === 'rect' && area.rect) {
                    const ax1 = area.rect.x;
                    const ay1 = area.rect.y;
                    const ax2 = area.rect.x + area.rect.w;
                    const ay2 = area.rect.y + area.rect.h;
                    const intersects = rect.x <= ax2 && rect.x + rect.w >= ax1 && rect.y <= ay2 && rect.y + rect.h >= ay1;
                    if (intersects) hitAreas.push(area.id);
                } else if (area.shape === 'circle' && area.circle) {
                    const cx = area.circle.cx ?? 0;
                    const cy = area.circle.cy ?? 0;
                    const r = area.circle.r;
                    const ax1 = cx - r;
                    const ay1 = cy - r;
                    const ax2 = cx + r;
                    const ay2 = cy + r;
                    const intersects = rect.x <= ax2 && rect.x + rect.w >= ax1 && rect.y <= ay2 && rect.y + rect.h >= ay1;
                    if (intersects) hitAreas.push(area.id);
                }
            });

            if (interaction.append) {
                const currentAreas = useAreaStore.getState().selectedAreaIds;
                const areaSet = new Set([...currentAreas, ...hitAreas]);
                useAreaStore.getState().setSelectedAreaIds(Array.from(areaSet));
            } else {
                useAreaStore.getState().setSelectedAreaIds(hitAreas);
            }

            eventBus.emit('UI_INTERACTION_END', { type: 'BOX_SELECT' });
        }

        if (interaction.type === 'REGION_DRAW') {
            const { x, y } = gesture;
            const startX = interaction.startX;
            const startY = interaction.startY;
            if (interaction.shape === 'circle') {
                const dx = x - startX;
                const dy = y - startY;
                const r = Math.sqrt(dx * dx + dy * dy);
                if (r > 6) {
                    useAreaStore.getState().addAreaCircle({ cx: startX, cy: startY, r });
                }
            } else {
                const rect = {
                    x: Math.min(startX, x),
                    y: Math.min(startY, y),
                    width: Math.abs(x - startX),
                    height: Math.abs(y - startY)
                };

                if (rect.width > 8 && rect.height > 8) {
                    useAreaStore.getState().addAreaRect({ x: rect.x, y: rect.y, w: rect.width, h: rect.height });
                }
            }
            stateEngine.setTool(TOOLS.POINTER);
            eventBus.emit('UI_INTERACTION_END', { type: 'REGION_DRAW' });
        }

        this.activeInteraction = null;
    }

    _interpretIntent(gesture: PointerGesture, context: ReturnType<typeof stateEngine.getState>) {
        const { x, y, modifiers, targetType, targetId } = gesture;
        const toNodeId = (id: string) => asNodeId(id);
        const isMulti = modifiers.shift;
        const activeTool = context.activeTool;

        if (activeTool === TOOLS.LINK && targetType === 'node') {
            return { type: 'PREPARE_LINK', fromId: targetId, screenX: gesture.screenX, screenY: gesture.screenY, associative: modifiers.alt };
        }

        if (activeTool === TOOLS.AREA && targetType === 'empty') {
            return { type: 'START_REGION_DRAW', x, y, shape: modifiers.shift ? 'circle' : 'rect' };
        }

        if (targetType === 'empty') {
            if (activeTool === TOOLS.LINK && this.pendingLinkSource) {
                return null;
            }
            if (modifiers.doubleClick && !modifiers.shift) return { type: 'CREATE_NODE', x, y };
            if (modifiers.space) return { type: 'PAN_CAMERA_START', x, y, screenX: gesture.screenX, screenY: gesture.screenY };

            // Default to Box Select in Pointer mode
            if (activeTool === TOOLS.POINTER) return { type: 'START_BOX_SELECT', x, y, append: isMulti };

            return { type: 'PAN_CAMERA_START', x, y, screenX: gesture.screenX, screenY: gesture.screenY };
        }

        if (targetType === 'node') {
            if (!targetId) return null;
            const nodeId = toNodeId(targetId);
            const isSelected = selectionState.isSelected(nodeId);

            if (activeTool === TOOLS.LINK) {
                return { type: 'START_LINK', fromId: nodeId, associative: modifiers.alt, screenX: gesture.screenX, screenY: gesture.screenY };
            }

            if (modifiers.doubleClick) return { type: 'OPEN_NODE', nodeId: nodeId };

            if (isMulti) return { type: 'TOGGLE_SELECT', nodeId: nodeId };

            // Drag behavior: always start drag, selection happens on Up if no movement
            const dragNodes = isSelected ? selectionState.getSelection() : [nodeId];
            return {
                type: 'PREPARE_DRAG',
                nodeId: nodeId,
                screenX: gesture.screenX,
                screenY: gesture.screenY,
                dragNodes,
                clearAreas: !isSelected && !isMulti
            };
        }

        return null;
    }

    _executeAction(intent: { type: string;[key: string]: unknown }) {
        switch (intent.type) {
            case 'SELECT_SINGLE':
                useEdgeSelectionStore.getState().clear();
                selectionState.select(intent.nodeId as NodeId);
                useAreaStore.getState().clearSelectedAreas();
                eventBus.emit('UI_FOCUS_NODE', { id: intent.nodeId as NodeId });
                break;

            case 'TOGGLE_SELECT':
                selectionState.toggle(intent.nodeId as NodeId);
                break;

            case 'OPEN_NODE':
                {
                    const node = graphEngine.getNode(intent.nodeId as NodeId);
                    if (node) eventBus.emit('UI_SIGNAL', { x: node.position.x, y: node.position.y, type: 'OPEN_NODE' });
                }
                stateEngine.enterNode(intent.nodeId as NodeId);
                break;

            case 'START_BOX_SELECT':
                this.activeInteraction = { type: 'BOX_SELECT', startX: intent.x, startY: intent.y, append: intent.append };
                {
                    const { type: _type, ...rest } = intent;
                    eventBus.emit('UI_INTERACTION_START', { type: 'BOX_SELECT', ...rest });
                }
                break;
            case 'START_REGION_DRAW':
                this.activeInteraction = { type: 'REGION_DRAW', startX: intent.x, startY: intent.y, shape: intent.shape ?? 'rect' };
                {
                    const { type: _type, ...rest } = intent;
                    eventBus.emit('UI_INTERACTION_START', { type: 'REGION_DRAW', ...rest });
                }
                break;

            case 'PREPARE_LINK': {
                const sourceNode = graphEngine.getNode(intent.fromId as NodeId);
                if (sourceNode) {
                    this.activeInteraction = {
                        type: 'LINK_ARM',
                        sourceId: intent.fromId,
                        startX: sourceNode.position.x,
                        startY: sourceNode.position.y,
                        associative: intent.associative,
                        startScreenX: intent.screenX,
                        startScreenY: intent.screenY,
                        hasDragged: false
                    };
                }
                break;
            }

            case 'START_LINK': {
                const sourceNode = graphEngine.getNode(intent.fromId as NodeId);
                if (sourceNode) {
                    this.activeInteraction = {
                        type: 'LINK_DRAG',
                        sourceId: intent.fromId,
                        startX: sourceNode.position.x,
                        startY: sourceNode.position.y,
                        associative: intent.associative,
                        startScreenX: intent.screenX,
                        startScreenY: intent.screenY,
                        hasDragged: false
                    };
                    {
                        const { type: _type, ...rest } = intent;
                        eventBus.emit('UI_INTERACTION_START', { type: 'LINK_DRAG', ...rest });
                    }
                }
                break;
            }

            case 'PREPARE_DRAG':
                if (intent.clearAreas) {
                    useAreaStore.getState().clearSelectedAreas();
                    useEdgeSelectionStore.getState().clear();
                }
                const startPositions: Record<string, { x: number; y: number }> = {};
                (intent.dragNodes as NodeId[]).forEach((id) => {
                    const node = graphEngine.getNode(id);
                    if (node) {
                        startPositions[id] = { x: node.position.x, y: node.position.y };
                    }
                });
                eventBus.emit('UI_INTERACTION_START', {
                    type: 'DRAG_NODES',
                    nodeIds: intent.dragNodes as NodeId[],
                    startPositions
                });
                this.activeInteraction = {
                    type: 'DRAG_NODES',
                    nodeIds: intent.dragNodes,
                    startNodeId: intent.nodeId,
                    startX: intent.screenX,
                    startY: intent.screenY,
                    lastScreenX: intent.screenX,
                    lastScreenY: intent.screenY,
                    startPositions
                };
                break;

            case 'PAN_CAMERA_START':
                this.activeInteraction = {
                    type: 'PAN',
                    lastScreenX: intent.screenX,
                    lastScreenY: intent.screenY
                };
                {
                    const { type: _type, ...rest } = intent;
                    eventBus.emit('UI_INTERACTION_START', { type: 'PAN', ...rest });
                }
                break;

            case 'CREATE_NODE':
                {
                    const xRaw = intent.x as number;
                    const yRaw = intent.y as number;
                    const snapped = this._snapPoint(xRaw, yRaw);
                    const x = snapped.x;
                    const y = snapped.y;
                    const focusId = stateEngine.getState().fieldScopeId;
                    const focusNode = focusId ? graphEngine.getNode(focusId) : null;
                    const focusClusterId = focusNode?.type === 'cluster' ? focusId : null;

                    // IF we are near (0,0) and graph is empty, this IS Source materialization.
                    // We should let CanvasView handle it or use initialize logic here.
                    const nodesRaw = graphEngine.getNodes();
                    if (nodesRaw.length === 0) {
                        const isAtOrigin = Math.abs(x) < 40 && Math.abs(y) < 40;
                        if (isAtOrigin) {
                            const created = graphEngine.addNode({
                                position: { x, y },
                                type: 'core',
                                data: { label: 'Core' }
                            });
                            if (created) selectionState.select(created.id);
                            eventBus.emit('UI_SIGNAL', { x, y });
                        }
                        return;
                    }

                    const hitNode = graphEngine.findNodeAt(x, y, (NODE_SIZES.base / 2) + (GRID_METRICS.cell / 2));
                    if (hitNode) {
                        return;
                    }
                    const others = graphEngine.getNodes()
                        .map(node => ({ x: node.position.x, y: node.position.y, r: this._getNodeRadius(node) }));
                    const step = this._isGridSnapEnabled() ? GRID_METRICS.cell : NODE_SIZES.base / 2;
                    const placed = this._findFreePosition(x, y, NODE_SIZES.base / 2, others, step);
                    const createdNode = graphEngine.addNode({
                        position: { x: placed.x, y: placed.y },
                        data: { label: 'Empty' },
                        ...(focusClusterId ? { meta: { parentClusterId: focusClusterId } } : {})
                    });
                    if (createdNode && focusClusterId) {
                        graphEngine.addEdge(asNodeId(focusClusterId), createdNode.id, 'associative');
                    }
                    eventBus.emit('UI_SIGNAL', { x: placed.x, y: placed.y });
                }
                break;

            case 'GROUP_SELECTION': {
                const nodeIds = intent.nodeIds as NodeId[];
                const nodes = nodeIds
                    .map(id => graphEngine.getNode(id))
                    .filter((n): n is NonNullable<ReturnType<typeof graphEngine.getNode>> =>
                        Boolean(n && n.type !== 'core')
                    );
                if (nodes.length < 2) break;
                const xs = nodes.map(n => n.position.x);
                const ys = nodes.map(n => n.position.y);
                let clusterX = (Math.min(...xs) + Math.max(...xs)) / 2;
                let clusterY = (Math.min(...ys) + Math.max(...ys)) / 2;
                if (this._isGridSnapEnabled()) {
                    clusterX = snapValueToGrid(clusterX);
                    clusterY = snapValueToGrid(clusterY);
                }
                const guardRadius = (NODE_SIZES.base / 2) + (GRID_METRICS.cell / 2);
                if (graphEngine.findNodeAt(clusterX, clusterY, guardRadius)) {
                    const step = GRID_METRICS.cell;
                    const offsets = [
                        [0, -1], [1, 0], [0, 1], [-1, 0],
                        [1, -1], [1, 1], [-1, 1], [-1, -1]
                    ];
                    let placed = false;
                    for (let ring = 1; ring <= 6 && !placed; ring += 1) {
                        for (const offset of offsets) {
                            const ox = offset[0];
                            const oy = offset[1];
                            if (ox === undefined || oy === undefined) continue;
                            const candX = clusterX + (ox * step * ring);
                            const candY = clusterY + (oy * step * ring);
                            if (!graphEngine.findNodeAt(candX, candY, guardRadius)) {
                                clusterX = candX;
                                clusterY = candY;
                                placed = true;
                                break;
                            }
                        }
                    }
                }

                const cluster = graphEngine.addNode({
                    id: asNodeId(`cluster-${Date.now()}`),
                    type: 'cluster',
                    position: { x: clusterX, y: clusterY },
                    data: { label: 'Cluster' },
                    meta: { isFolded: true }
                });
                nodes.forEach(n => {
                    graphEngine.updateNode(n.id, { meta: { parentClusterId: cluster.id, isHidden: true } });
                    graphEngine.addEdge(cluster.id, n.id, 'default');
                    if (n.type === 'cluster' && n.meta?.isFolded !== true) {
                        graphEngine.updateNode(n.id, { meta: { isFolded: true } });
                    }
                });
                useEdgeSelectionStore.getState().clear();
                selectionState.select(cluster.id);
                eventBus.emit('UI_SIGNAL', { x: clusterX, y: clusterY, type: 'GROUP_CREATED' });
                break;
            }
        }
    }

    handleKeyDown(e: KeyboardEvent) {
        const isMod = e.metaKey || e.ctrlKey;
        const isShift = e.shiftKey;
        const code = e.code;
        const isKey = (k: string) => code === `Key${k}`;
        const isEnter = code === 'Enter' || code === 'NumpadEnter';
        const isBackslash = code === 'Backslash';
        const isComma = code === 'Comma';

        // 1. Command / Search
        if ((e.key === ',' || isComma) && isMod) {
            e.preventDefault();
            if (stateEngine.getState().viewContext !== 'home') {
                stateEngine.toggleSettings();
            }
            return;
        }

        // 2. Undo / Redo
        if ((e.key === 'z' || e.key === 'Z' || isKey('Z')) && isMod) {
            e.preventDefault();
            if (isShift) eventBus.emit('GRAPH_REDO');
            else eventBus.emit('GRAPH_UNDO');
            return;
        }
        if ((e.key === 'y' || e.key === 'Y' || isKey('Y')) && isMod) {
            e.preventDefault();
            eventBus.emit('GRAPH_REDO');
            return;
        }

        // 3. Selection Actions
        if ((e.key === 'a' || e.key === 'A' || isKey('A')) && isMod) {
            e.preventDefault();
            useEdgeSelectionStore.getState().clear();
            selectionState.setSelection(graphEngine.getNodes().filter(n => !n.meta?.focusHidden).map(n => n.id));
            return;
        }

        // 4. Tools & Creation
        if ((e.key === 'l' || e.key === 'L' || isKey('L')) && !isMod) {
            const current = stateEngine.getState().activeTool;
            stateEngine.setTool(current === TOOLS.LINK ? TOOLS.POINTER : TOOLS.LINK);
            this.pendingLinkSource = null;
            this.pendingLinkAssociative = false;
            if (current === TOOLS.LINK) {
                this.clearLinkPreview();
            } else {
                const selection = selectionState.getSelection();
                if (selection.length === 1) {
                    const sourceId = selection[0];
                    if (sourceId) {
                        this.startLinkPreview(sourceId);
                    }
                }
            }
            return;
        }
        if ((e.key === 'p' || e.key === 'P' || isKey('P')) && !isMod) {
            stateEngine.setTool(TOOLS.POINTER);
            this.pendingLinkSource = null;
            this.pendingLinkAssociative = false;
            this.clearLinkPreview();
            return;
        }
        if ((e.key === 'a' || e.key === 'A' || isKey('A')) && !isMod) {
            const current = stateEngine.getState().activeTool;
            stateEngine.setTool(current === TOOLS.AREA ? TOOLS.POINTER : TOOLS.AREA);
            this.pendingLinkSource = null;
            this.pendingLinkAssociative = false;
            this.clearLinkPreview();
            return;
        }
        if (e.key === 'n' || e.key === 'N' || isKey('N')) {
            // Block creation if graph is empty (must materialize Source first)
            if (graphEngine.getNodes().length === 0) return;

            // Create node at last pointer (fallback: camera center)
            const camera = useCameraStore.getState();
            const x = this.lastPointer.has ? this.lastPointer.x : (-camera.pan.x / camera.zoom);
            const y = this.lastPointer.has ? this.lastPointer.y : (-camera.pan.y / camera.zoom);
            this._executeAction({ type: 'CREATE_NODE', x, y });
            return;
        }

        // 5. Grouping (Canonical: Shift + Enter)
        if (isEnter && isShift) {
            const selection = selectionState.getSelection();
            if (selection.length >= 2) {
                this._executeAction({ type: 'GROUP_SELECTION', nodeIds: selection });
            }
            return;
        }
        if ((e.key === 'g' || e.key === 'G' || isKey('G')) && !isMod) {
            const selection = selectionState.getSelection();
            if (selection.length >= 2) {
                this._executeAction({ type: 'GROUP_SELECTION', nodeIds: selection });
            }
            return;
        }
        if (isEnter && !isShift) {
            const selection = selectionState.getSelection();
            if (selection.length === 0) {
                const areaState = useAreaStore.getState();
                if (areaState.selectedAreaId && areaState.focusedAreaId !== areaState.selectedAreaId) {
                    areaState.setFocusedAreaId(areaState.selectedAreaId);
                    return;
                }
            }
            if (selection.length === 1) {
                const selectedId = selection[0];
                if (!selectedId) return;
                const node = graphEngine.getNode(selectedId);
                if (node?.type === 'cluster') {
                    const currentScope = stateEngine.getState().fieldScopeId;
                    if (currentScope === node.id) {
                        stateEngine.setFieldScope(null);
                    } else {
                        stateEngine.setFieldScope(node.id);
                    }
                    return;
                }
                if (node) eventBus.emit('UI_SIGNAL', { x: node.position.x, y: node.position.y, type: 'OPEN_NODE' });
                stateEngine.enterNode(selectedId);
            }
            return;
        }

        // 6. UI Toggles
        if (e.key.toLowerCase() === 'r' && !isShift && !e.altKey && !e.metaKey && !e.ctrlKey) {
            stateEngine.toggleContextMenuMode();
            return;
        }
        if (e.key === '\\' || isBackslash) {
            eventBus.emit('UI_DRAWER_TOGGLE', { side: 'right' });
            return;
        }

        // 7. Cancellation
        if (e.key === 'Escape' || code === 'Escape') {
            const state = stateEngine.getState();
            if (useAreaStore.getState().focusedAreaId) {
                useAreaStore.getState().clearFocusedArea();
                return;
            }
            if (state.activeTool !== TOOLS.POINTER) {
                stateEngine.setTool(TOOLS.POINTER);
                this.pendingLinkSource = null;
                this.pendingLinkAssociative = false;
                this.clearLinkPreview();
                return;
            }
            if (state.paletteOpen) {
                stateEngine.closePalette();
                return;
            }
            if (state.settingsOpen) {
                stateEngine.closeSettings();
                return;
            }
            if (state.viewContext === 'node') {
                stateEngine.exitNode();
                return;
            }
            if (useAreaStore.getState().selectedAreaIds.length > 0) {
                useAreaStore.getState().clearSelectedAreas();
                return;
            }
            if (useEdgeSelectionStore.getState().selectedEdgeIds.length > 0) {
                useEdgeSelectionStore.getState().clear();
                return;
            }
            if (!selectionState.isEmpty()) {
                selectionState.clear();
                return;
            }
        }

        // 8. Deletion
        if (e.key === 'Delete' || e.key === 'Backspace' || code === 'Delete' || code === 'Backspace') {
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
            const getClusterChildren = (clusterId: NodeId) => (
                graphEngine.getNodes().filter(node => node.meta?.parentClusterId === clusterId)
            );
            const releaseClusterChildren = (clusterId: NodeId) => {
                getClusterChildren(clusterId).forEach(child => {
                    graphEngine.updateNode(child.id, {
                        meta: {
                            ...(child.meta ?? {}),
                            parentClusterId: null,
                            isHidden: false
                        }
                    });
                });
            };
            const deleteClusterChildren = (clusterId: NodeId) => {
                getClusterChildren(clusterId).forEach(child => {
                    graphEngine.removeNode(child.id);
                });
            };
            const edgeSelection = useEdgeSelectionStore.getState().selectedEdgeIds;
            if (edgeSelection.length > 0) {
                edgeSelection.forEach((id: string) => graphEngine.removeEdge(asEdgeId(id)));
                useEdgeSelectionStore.getState().clear();
                return;
            }
            if (this.activeEdgeId) {
                graphEngine.removeEdge(asEdgeId(this.activeEdgeId));
                this.activeEdgeId = null;
                return;
            }
            const selectedAreaIds = useAreaStore.getState().selectedAreaIds;
            if (selectedAreaIds.length > 0) {
                selectedAreaIds.forEach(id => useAreaStore.getState().removeArea(id));
                useAreaStore.getState().clearSelectedAreas();
            }
            const selection = selectionState.getSelection();
            if (selection.length > 0) {
                const selectedClusters = selection
                    .map(id => graphEngine.getNode(id))
                    .filter((node): node is NonNullable<ReturnType<typeof graphEngine.getNode>> =>
                        Boolean(node && node.type === 'cluster')
                    );
                if (selectedClusters.length > 0) {
                    const choice = requestClusterAction();
                    if (!choice) return;
                    selectedClusters.forEach(cluster => {
                        if (choice === 'with') {
                            deleteClusterChildren(cluster.id);
                        } else {
                            releaseClusterChildren(cluster.id);
                        }
                        graphEngine.removeNode(cluster.id);
                    });
                }
                selection.forEach(id => {
                    const node = graphEngine.getNode(id);
                    // Protect Core nodes from deletion (User Request)
                    if (node && node.type !== 'core' && node.type !== 'cluster') {
                        graphEngine.removeNode(id);
                    }
                });
                selectionState.clear();
                return;
            }
        }
    }
}

export const gestureRouter = new GestureRouter();
