/**
 * InteractionLayer.jsx
 * Renders transient interaction visuals (Marquee box, Link lines).
 * Listens to UI_INTERACTION_* events.
 */
import React, { useEffect, useState } from 'react';
import { eventBus, type BusEvent } from '../../core/events/EventBus';
import { useGraphStore } from '../../store/useGraphStore';
import type { Edge, NodeBase } from '../../core/types';
import { NODE_SIZES } from '../../utils/layoutMetrics';

const InteractionLayer = () => {
    const [box, setBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const [regionBox, setRegionBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const [regionCircle, setRegionCircle] = useState<{ cx: number; cy: number; r: number } | null>(null);
    const [linkDraft, setLinkDraft] = useState<{ x1: number; y1: number; x2: number; y2: number; associative?: boolean } | null>(null);
    const [signals, setSignals] = useState<Array<{ id: number; from: { x: number; y: number }; to: { x: number; y: number }; t: number }>>([]);

    const edges = useGraphStore(state => state.edges) as Edge[];
    const nodes = useGraphStore(state => state.nodes) as NodeBase[];

    useEffect(() => {
        let lastTime = Date.now();
        let frameId: number;
        let acc = 0;
        const STEP_MS = 33; // ~30fps is enough for these signals and reduces UI thrash.

        const loop = () => {
            const now = Date.now();
            const elapsed = now - lastTime;
            lastTime = now;
            acc += elapsed;

            if (acc >= STEP_MS) {
                const dt = (acc / 1000);
                acc = 0;

                setSignals(prev => {
                    if (prev.length === 0) return prev;
                    return prev
                        .map(s => ({ ...s, t: s.t + dt * 1.2 })) // speed 1.2 units per sec (1.5x Faster)
                        .filter(s => s.t < 1);
                });
            }

            frameId = requestAnimationFrame(loop);
        };
        frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId);
    }, []);

    useEffect(() => {
        // Dedup ref
        const lastSignal = { time: 0, x: 0, y: 0, id: '', sourceId: '' };

        const onSignal = (e: BusEvent<'UI_SIGNAL'>) => {
            const payload = e.payload;
            const now = Date.now();

            // Generic Dedup (250ms window for identical signal)
            const isSame = (
                payload.x === lastSignal.x &&
                payload.y === lastSignal.y &&
                (payload.id || '') === lastSignal.id &&
                (payload.sourceId || '') === lastSignal.sourceId
            );
            if (isSame && (now - lastSignal.time < 250)) return;

            // Update debounce record
            lastSignal.time = now;
            lastSignal.x = payload.x ?? 0;
            lastSignal.y = payload.y ?? 0;
            lastSignal.id = payload.id ?? '';
            lastSignal.sourceId = payload.sourceId ?? '';

            // Edge Signals
            if (payload.type === 'EMIT_EDGE_SIGNALS' || payload.id) {
                const nodeId = payload.id;
                if (!nodeId) return;

                // CRITICAL: Must grab fresh edges from store directly
                const freshEdges = useGraphStore.getState().edges as Edge[];

                const inEdges = freshEdges.filter(edge =>
                    edge.target === nodeId &&
                    (payload.sourceId ? edge.source === payload.sourceId : true)
                );

                inEdges.forEach(edge => {
                    const freshNodes = useGraphStore.getState().nodes as NodeBase[];
                    const fromNode = freshNodes.find(n => n.id === edge.source); // A
                    const toNode = freshNodes.find(n => n.id === edge.target);   // B
                    if (!fromNode || !toNode) return;

                    // Clipping Geometry
                    const dx = toNode.position.x - fromNode.position.x;
                    const dy = toNode.position.y - fromNode.position.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 1) return;

                    const radius = (NODE_SIZES.base / 2) + 5; // Start from edge
                    const ux = dx / dist;
                    const uy = dy / dist;

                    const aEdge = {
                        x: fromNode.position.x + ux * radius,
                        y: fromNode.position.y + uy * radius
                    };
                    const bEdge = {
                        x: toNode.position.x - ux * radius,
                        y: toNode.position.y - uy * radius
                    };

                    // Send Signal A -> B (first signal from sender)
                    setSignals(prev => [...prev, {
                        id: Math.random(),
                        from: aEdge,
                        to: bEdge,
                        t: 0
                    }]);

                    // 2. Schedule Return Signal B -> A
                    setTimeout(() => {
                        setSignals(prev => [...prev, {
                            id: Math.random() + 1,
                            from: bEdge,
                            to: aEdge,
                            t: 0
                        }]);
                    }, 850);
                });
            }
        };

        const unsubSig = eventBus.on('UI_SIGNAL', onSignal);
        const onStart = (e: BusEvent<'UI_INTERACTION_START'>) => {
            const payload = e.payload;
            if (payload.type === 'BOX_SELECT') {
                if (payload.x === undefined || payload.y === undefined) return;
                setBox({ x: payload.x, y: payload.y, width: 0, height: 0 });
            }
            if (payload.type === 'REGION_DRAW') {
                if (payload.x === undefined || payload.y === undefined) return;
                if (payload.shape === 'circle') {
                    setRegionCircle({ cx: payload.x, cy: payload.y, r: 0 });
                    setRegionBox(null);
                } else {
                    setRegionBox({ x: payload.x, y: payload.y, width: 0, height: 0 });
                    setRegionCircle(null);
                }
            }
            if (payload.type === 'LINK_DRAG') {
                // Initialize logic if needed
            }
        };

        const onUpdate = (e: BusEvent<'UI_INTERACTION_UPDATE'>) => {
            const payload = e.payload;
            if (payload.type === 'BOX_SELECT') {
                if (!payload.rect) return;
                setBox(payload.rect);
            }
            if (payload.type === 'REGION_DRAW') {
                if (payload.shape === 'circle' && payload.circle) {
                    setRegionCircle(payload.circle);
                    setRegionBox(null);
                    return;
                }
                if (!payload.rect) return;
                setRegionBox(payload.rect);
            }
            if (payload.type === 'LINK_DRAG') {
                if (!payload.line) return;
                setLinkDraft({
                    ...payload.line,
                    ...(payload.associative !== undefined ? { associative: payload.associative } : {})
                });
            }
        };

        const onEnd = () => {
            setBox(null);
            setRegionBox(null);
            setRegionCircle(null);
            setLinkDraft(null);
        };

        const unsub1 = eventBus.on('UI_INTERACTION_START', onStart);
        const unsub2 = eventBus.on('UI_INTERACTION_UPDATE', onUpdate);
        const unsub3 = eventBus.on('UI_INTERACTION_END', onEnd);

        return () => { unsub1(); unsub2(); unsub3(); unsubSig(); };
    }, []);

    if (!box && !regionBox && !regionCircle && !linkDraft && signals.length === 0) return null;

    return (
        <div className="absolute inset-0 pointer-events-none z-[var(--z-overlay)]">
            {box && (
                <div
                    className="absolute border border-[var(--semantic-color-text-secondary)]/40 bg-[var(--semantic-color-text-primary)]/5 backdrop-blur-[1px]"
                    style={{
                        left: box.x,
                        top: box.y,
                        width: box.width,
                        height: box.height
                    }}
                />
            )}

            {regionBox && (
                <div
                    className="absolute border border-dashed border-[var(--semantic-color-text-secondary)]/40 bg-[var(--semantic-color-text-primary)]/5 backdrop-blur-[1px]"
                    style={{
                        left: regionBox.x,
                        top: regionBox.y,
                        width: regionBox.width,
                        height: regionBox.height
                    }}
                />
            )}

            {regionCircle && (
                <div
                    className="absolute rounded-[var(--primitive-radius-pill)] border border-dashed border-[var(--semantic-color-text-secondary)]/40 bg-[var(--semantic-color-text-primary)]/5 backdrop-blur-[1px]"
                    style={{
                        left: regionCircle.cx - regionCircle.r,
                        top: regionCircle.cy - regionCircle.r,
                        width: regionCircle.r * 2,
                        height: regionCircle.r * 2
                    }}
                />
            )}

            {linkDraft && (
                <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
                    <line
                        x1={linkDraft.x1} y1={linkDraft.y1}
                        x2={linkDraft.x2} y2={linkDraft.y2}
                        stroke="var(--semantic-color-text-primary)"
                        strokeWidth="1.5"
                        strokeDasharray={linkDraft.associative ? "4 4" : "0"}
                        className="opacity-60"
                        pointerEvents="none"
                    />
                </svg>
            )}

            {/* Edge Signals */}
            <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
                {signals.map(s => {
                    const x = s.from.x + (s.to.x - s.from.x) * s.t;
                    const y = s.from.y + (s.to.y - s.from.y) * s.t;

                    // Absorption Animation (Fade & Shrink at end)
                    const fadeStart = 0.85;
                    const isFading = s.t > fadeStart;
                    const progress = isFading ? (s.t - fadeStart) / (1 - fadeStart) : 0;
                    const opacity = 1 - progress;
                    const scale = 1 - (progress * 0.9); // Shrink to 10%

                    return (
                        <circle
                            key={s.id}
                            cx={x} cy={y} r={3 * scale}
                            fill="var(--semantic-color-text-primary)"
                            fillOpacity={opacity}
                            opacity={0.9}
                        />
                    );
                })}
            </svg>
        </div>
    );
};

export default InteractionLayer;
