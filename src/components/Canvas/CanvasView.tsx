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
import { asNodeId, type Edge, type NodeId } from '../../core/types';

const CanvasView = () => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const nodes = useGraphStore(state => state.nodes);
    const edges = useGraphStore(state => state.edges);
    const activeTool = useAppStore(state => state.activeTool);
    const { pan, zoom, zoomAt, centerOn } = useCameraStore();
    const [isSmooth, setIsSmooth] = React.useState(false);
    const lastHoverEdgeId = useRef<string | null>(null);

    const isSpacePressed = useRef(false);

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
        const edgeEl = target?.closest('[data-edge-id]');
        const nodeEl = target?.closest('[data-node-id]');
        const targetType: 'node' | 'edge' | 'empty' = nodeEl ? 'node' : edgeEl ? 'edge' : 'empty';

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
            targetId: nodeEl
                ? nodeEl.getAttribute('data-node-id')
                : edgeEl
                    ? edgeEl.getAttribute('data-edge-id')
                    : null
        };

        // Capture pointer to ensure Move/Up fire even if leaving window/container
        e.currentTarget.setPointerCapture(e.pointerId);

        gestureRouter.handlePointerDown(gesture);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const proj = getProjection(e);
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
        if (e.ctrlKey) {
            const rect = containerRef.current.getBoundingClientRect();
            zoomAt(e.clientX, e.clientY, e.deltaY, rect);
            return;
        }
        useCameraStore.getState().updatePan(-e.deltaX, -e.deltaY);
    };

    // We need to attach wheel listeners non-passively for zooming inhibition if needed
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        // Disable native pinch-zoom gestures
        const preventDefault = (e: Event) => e.preventDefault();
        el.addEventListener('gesturestart', preventDefault);
        el.addEventListener('gesturechange', preventDefault);

        // Global hotkey listener for Router & local state
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') isSpacePressed.current = true;
            gestureRouter.handleKeyDown(e);
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') isSpacePressed.current = false;
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

        return () => {
            el.removeEventListener('gesturestart', preventDefault);
            el.removeEventListener('gesturechange', preventDefault);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            unsubFocus();
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="w-full h-full bg-os-dark overflow-hidden relative touch-none select-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={() => {
                lastHoverEdgeId.current = null;
                useEdgeSelectionStore.getState().setHover(null);
            }}
            onDoubleClick={handleDoubleClick}
            onWheel={handleWheel}
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* Dot Matrix Background */}
            <div
                className="absolute inset-0 pointer-events-none opacity-23"
                data-grid="dot-matrix"
                style={{
                    backgroundImage: `radial-gradient(circle at 0% 0%, rgba(255,255,255,0.5) ${(
                        GRID_METRICS.dotRadius * zoom
                    )}px, transparent ${(
                        GRID_METRICS.dotRadius * zoom
                    )}px)`,
                    backgroundSize: `${GRID_METRICS.cell * zoom}px ${GRID_METRICS.cell * zoom}px`,
                    backgroundPosition: `${pan.x}px ${pan.y}px`
                }}
            />

            {/* Cosmogenesis Source Node moved to transform layer */}

            {/* Transform Layer (Camera) */}
            <div
                className={`transform-layer absolute inset-0 origin-top-left ${isSmooth ? 'camera-smooth' : ''}`}
                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            >
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

            {/* HUD: Stats & Status (Bottom-Left) */}
            <div className="absolute bottom-4 left-4 pointer-events-none flex flex-col items-start gap-1 z-50">
                {activeTool === TOOLS.LINK && (
                    <div className="flex items-center gap-2 mb-2 px-2 py-1 rounded-full bg-white/5 border border-white/5">
                        <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
                        <span className="text-[9px] uppercase tracking-[0.4em] text-white/40 font-medium">
                            Connection...
                        </span>
                    </div>
                )}
                <div className="flex gap-4 items-center px-3 py-1.5 glass-panel opacity-60 hover:opacity-100 transition-opacity">
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
            </div>
        </div>
    );
};

export default CanvasView;
