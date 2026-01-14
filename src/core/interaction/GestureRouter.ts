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
import { asEdgeId, asNodeId, type NodeId } from '../types';
import { GRID_METRICS, NODE_SIZES } from '../../utils/layoutMetrics';

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
    private lastClick: { time: number; targetId: string | null };

    constructor() {
        this.activeInteraction = null; // { type, startX, startY, ...data }
        this.pendingLinkSource = null; // Click-to-link source in L mode
        this.pendingLinkAssociative = false;
        this.activeEdgeId = null;
        this.lastPointer = { x: 0, y: 0, has: false };
        this.lastClick = { time: 0, targetId: null };
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
            } else {
                useEdgeSelectionStore.getState().toggle(edgeId);
            }
            return;
        }
        if (gesture.targetType === 'node' && !gesture.modifiers.shift) {
            useEdgeSelectionStore.getState().clear();
            this.activeEdgeId = null;
        }
        if (gesture.targetType === 'node' && gesture.targetId) {
            const now = Date.now();
            const isDoubleTap = now - this.lastClick.time < 350 && this.lastClick.targetId === gesture.targetId;
            this.lastClick = { time: now, targetId: gesture.targetId };
            if (isDoubleTap && context.activeTool === TOOLS.POINTER) {
                this._executeAction({ type: 'ENTER_NOW', nodeId: toNodeId(gesture.targetId) });
                return;
            }
        }
        if (context.activeTool === TOOLS.LINK && gesture.targetType === 'node') {
            const targetId = gesture.targetId;
            if (this.pendingLinkSource && targetId && this.pendingLinkSource !== targetId) {
                const type = (gesture.modifiers.alt || this.pendingLinkAssociative) ? 'associative' : 'default';
                graphEngine.addEdge(toNodeId(this.pendingLinkSource), toNodeId(targetId), type);
                eventBus.emit('UI_SIGNAL', { x: gesture.x, y: gesture.y, id: targetId });
                this.pendingLinkSource = null;
                this.pendingLinkAssociative = false;
                return;
            }
        }

        if (context.activeTool === TOOLS.LINK && gesture.targetType === 'empty' && this.pendingLinkSource) {
            // Click-to-Create-and-Link (User Request)
            const newNode = graphEngine.addNode({
                position: { x: gesture.x, y: gesture.y },
                data: { label: 'Empty' }
            });
            const type = (gesture.modifiers.alt || this.pendingLinkAssociative) ? 'associative' : 'default';
            graphEngine.addEdge(toNodeId(this.pendingLinkSource), newNode.id, type);

            // Emit signal (wrapped to ensure store updates first)
            setTimeout(() => {
                eventBus.emit('UI_SIGNAL', { x: gesture.x, y: gesture.y, id: newNode.id });
            }, 0);

            this.pendingLinkSource = null;
            this.pendingLinkAssociative = false;
            return;
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
        else if (interaction.type === 'DRAG_NODES') {
            const zoom = useCameraStore.getState().zoom;
            const dx = (gesture.screenX - interaction.lastScreenX) / zoom;
            const dy = (gesture.screenY - interaction.lastScreenY) / zoom;

            interaction.lastScreenX = gesture.screenX;
            interaction.lastScreenY = gesture.screenY;

            interaction.nodeIds.forEach((id: NodeId) => {
                const node = graphEngine.getNode(id);
                if (node && node.type !== 'root' && node.type !== 'core') {
                    graphEngine.updateNode(id, {
                        position: { x: node.position.x + dx, y: node.position.y + dy }
                    });
                }
            });
        }
        else if (interaction.type === 'PAN') {
            const dx = gesture.screenX - interaction.lastScreenX;
            const dy = gesture.screenY - interaction.lastScreenY;
            interaction.lastScreenX = gesture.screenX;
            interaction.lastScreenY = gesture.screenY;

            useCameraStore.getState().updatePan(dx, dy);
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
            const radius = 22;
            let x1 = interaction.startX;
            let y1 = interaction.startY;

            if (lDist > radius) {
                const ux = lx / lDist;
                const uy = ly / lDist;
                x1 += ux * radius;
                y1 += uy * radius;
            } else {
                // Inside node: start line at mouse position (effectively hiding it)
                x1 = x;
                y1 = y;
            }

            eventBus.emit('UI_INTERACTION_UPDATE', {
                type: 'LINK_DRAG',
                line: { x1, y1, x2: x, y2: y },
                associative: interaction.associative
            });
        }
    }

    handlePointerUp(gesture: PointerGesture) {
        if (!this.activeInteraction) return;

        const interaction = this.activeInteraction as Record<string, any>;
        const toNodeId = (id: NodeId | string) => (typeof id === 'string' ? asNodeId(id) : id);

        if (interaction.type === 'LINK_DRAG') {
            const targetId = gesture.targetId;
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
            } else if (!targetId) {
                // Link to Empty Field: Create new node and link it
                const newNode = graphEngine.addNode({
                    position: { x: gesture.x, y: gesture.y },
                    data: { label: 'Empty' }
                });
                graphEngine.addEdge(toNodeId(sourceId), newNode.id, associative ? 'associative' : 'default');
                eventBus.emit('UI_SIGNAL', { x: gesture.x, y: gesture.y, id: newNode.id, sourceId: sourceId });
            }
            eventBus.emit('UI_INTERACTION_END', { type: 'LINK_DRAG' });
        }

        if (interaction.type === 'DRAG_NODES') {
            const dx = gesture.screenX - interaction.startX;
            const dy = gesture.screenY - interaction.startY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 5 && interaction.startNodeId) {
                this._executeAction({ type: 'SELECT_SINGLE', nodeId: interaction.startNodeId });
            }
            eventBus.emit('UI_INTERACTION_END', { type: 'DRAG_NODES' });
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

            eventBus.emit('UI_INTERACTION_END', { type: 'BOX_SELECT' });
        }

        this.activeInteraction = null;
    }

    _interpretIntent(gesture: PointerGesture, context: ReturnType<typeof stateEngine.getState>) {
        const { x, y, modifiers, targetType, targetId } = gesture;
        const toNodeId = (id: string) => asNodeId(id);
        const isMulti = modifiers.shift;
        const activeTool = context.activeTool;

        if (activeTool === TOOLS.LINK && targetType === 'node') {
            return { type: 'START_LINK', fromId: targetId, screenX: gesture.screenX, screenY: gesture.screenY, associative: modifiers.alt };
        }

        if (activeTool === TOOLS.REGION && targetType === 'empty') {
            return { type: 'START_REGION_DRAW', x, y };
        }

        if (targetType === 'empty') {
            if (modifiers.doubleClick) return { type: 'CREATE_NODE', x, y };
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

            if (modifiers.doubleClick) return { type: 'ENTER_NOW', nodeId: nodeId };

            if (isMulti) return { type: 'TOGGLE_SELECT', nodeId: nodeId };

            // Drag behavior: always start drag, selection happens on Up if no movement
            const dragNodes = isSelected ? selectionState.getSelection() : [nodeId];
            return {
                type: 'PREPARE_DRAG',
                nodeId: nodeId,
                screenX: gesture.screenX,
                screenY: gesture.screenY,
                dragNodes
            };
        }

        return null;
    }

    _executeAction(intent: { type: string;[key: string]: unknown }) {
        switch (intent.type) {
            case 'SELECT_SINGLE':
                useEdgeSelectionStore.getState().clear();
                selectionState.select(intent.nodeId as NodeId);
                eventBus.emit('UI_FOCUS_NODE', { id: intent.nodeId as NodeId });
                break;

            case 'TOGGLE_SELECT':
                selectionState.toggle(intent.nodeId as NodeId);
                break;

            case 'ENTER_NOW':
                {
                    const node = graphEngine.getNode(intent.nodeId as NodeId);
                    if (node) eventBus.emit('UI_SIGNAL', { x: node.position.x, y: node.position.y, type: 'ENTER_NOW' });
                }
                stateEngine.enterNow(intent.nodeId as NodeId);
                break;

            case 'START_BOX_SELECT':
                this.activeInteraction = { type: 'BOX_SELECT', startX: intent.x, startY: intent.y, append: intent.append };
                {
                    const { type: _type, ...rest } = intent;
                    eventBus.emit('UI_INTERACTION_START', { type: 'BOX_SELECT', ...rest });
                }
                break;

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
                this.activeInteraction = {
                    type: 'DRAG_NODES',
                    nodeIds: intent.dragNodes,
                    startNodeId: intent.nodeId,
                    startX: intent.screenX,
                    startY: intent.screenY,
                    lastScreenX: intent.screenX,
                    lastScreenY: intent.screenY
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
                    const x = intent.x as number;
                    const y = intent.y as number;

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
                    graphEngine.addNode({
                        position: { x, y },
                        data: { label: 'Empty' }
                    });
                    eventBus.emit('UI_SIGNAL', { x, y });
                }
                break;

            case 'GROUP_SELECTION': {
                const nodeIds = intent.nodeIds as NodeId[];
                const nodes = nodeIds
                    .map(id => graphEngine.getNode(id))
                    .filter((n): n is NonNullable<ReturnType<typeof graphEngine.getNode>> =>
                        Boolean(n && n.type !== 'root' && n.type !== 'core')
                    );
                if (nodes.length < 2) break;
                const xs = nodes.map(n => n.position.x);
                const ys = nodes.map(n => n.position.y);
                let clusterX = (Math.min(...xs) + Math.max(...xs)) / 2;
                let clusterY = (Math.min(...ys) + Math.max(...ys)) / 2;
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
        if ((e.key === 'k' || e.key === 'K' || isKey('K')) && isMod) {
            e.preventDefault();
            stateEngine.togglePalette();
            return;
        }
        if ((e.key === ',' || isComma) && isMod) {
            e.preventDefault();
            stateEngine.toggleSettings();
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
            selectionState.setSelection(graphEngine.getNodes().map(n => n.id));
            return;
        }

        // 4. Tools & Creation
        if ((e.key === 'l' || e.key === 'L' || isKey('L')) && !isMod) {
            const current = stateEngine.getState().activeTool;
            stateEngine.setTool(current === TOOLS.LINK ? TOOLS.POINTER : TOOLS.LINK);
            this.pendingLinkSource = null;
            this.pendingLinkAssociative = false;
            return;
        }
        if ((e.key === 'z' || e.key === 'Z' || isKey('Z')) && !isMod) {
            const current = stateEngine.getState().activeTool;
            stateEngine.setTool(current === TOOLS.REGION ? TOOLS.POINTER : TOOLS.REGION);
            this.pendingLinkSource = null;
            this.pendingLinkAssociative = false;
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
            if (selection.length === 1) {
                const selectedId = selection[0];
                if (!selectedId) return;
                const node = graphEngine.getNode(selectedId);
                if (node) eventBus.emit('UI_SIGNAL', { x: node.position.x, y: node.position.y, type: 'ENTER_NOW' });
                stateEngine.enterNow(selectedId);
            }
            return;
        }

        // 6. UI Toggles
        if (e.key === '\\' || isBackslash) {
            eventBus.emit('UI_DRAWER_TOGGLE', { side: 'right' });
            return;
        }

        // 7. Cancellation
        if (e.key === 'Escape' || code === 'Escape') {
            const state = stateEngine.getState();
            if (state.activeTool !== TOOLS.POINTER) {
                stateEngine.setTool(TOOLS.POINTER);
                this.pendingLinkSource = null;
                this.pendingLinkAssociative = false;
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
            if (state.viewContext === 'now') {
                stateEngine.exitNow();
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
            const selection = selectionState.getSelection();
            if (selection.length > 0) {
                selection.forEach(id => {
                    const node = graphEngine.getNode(id);
                    // Protect Core/Root nodes from deletion (User Request)
                    if (node && node.type !== 'core' && node.type !== 'root') {
                        graphEngine.removeNode(id);
                    }
                });
                selectionState.clear();
            }
        }
    }
}

export const gestureRouter = new GestureRouter();
