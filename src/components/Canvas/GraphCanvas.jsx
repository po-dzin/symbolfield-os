import React, { useRef, useEffect, useState } from 'react';
import Node from './Node';
import RadialMenu from './RadialMenu';
import { useGraphStore } from '../../store/graphStore';
import { useStateStore } from '../../store/stateStore';
import { useWindowStore } from '../../store/windowStore';
import { useHarmonyStore } from '../../store/harmonyStore';

// Easing function for smooth camera animation
const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const GraphCanvas = ({ isEditMode = false }) => {
    const containerRef = useRef(null);
    const {
        nodes,
        edges,
        tempConnection,
        interactionState,
        initializeGraph,
        addNode,
        transformSourceToCore,
        updateTempConnection,
        cancelConnection,
        enterNOW // Import enterNOW action
    } = useGraphStore();
    const { mode } = useStateStore();
    const { isUltraEnabled, harmonics } = useHarmonyStore();
    const edgeThickness = 1.5 * (isUltraEnabled ? harmonics.modifiers.edgeThickness : 1.0);
    const { onboardingTooltip, showOnboardingTooltip } = useWindowStore();

    // Radial Menu State
    const [radialMenu, setRadialMenu] = useState(null);

    // Camera animation state
    const isAnimatingCamera = useRef(false);

    // ============================================================================
    // PURE CSS/JS CAMERA SYSTEM (No react-spring, no useGesture)
    // ============================================================================

    // Camera state (local, not in store to prevent re-renders)
    const [camera, setCamera] = useState({
        x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
        y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
        scale: 1
    });

    // Pan state
    const isPanning = useRef(false);
    const panStart = useRef({ x: 0, y: 0 });
    const cameraStart = useRef({ x: 0, y: 0 });
    const canvasMouseDownRef = useRef(false);
    const isCreatingNode = useRef(false);

    // Mouse event handlers for panning
    const handleMouseDown = (e) => {
        // Only pan on left-click and not while connecting
        if (e.button !== 0) return;

        if (interactionState === 'CONNECTING') {
            canvasMouseDownRef.current = true;
            return;
        }

        // Check if clicking on a node (don't pan if so)
        if (e.target.closest('.graph-node')) return;

        isPanning.current = true;
        panStart.current = { x: e.clientX, y: e.clientY };
        cameraStart.current = { x: camera.x, y: camera.y };
        e.preventDefault();
    };

    const handleMouseMove = (e) => {
        if (!isPanning.current) return;

        const dx = e.clientX - panStart.current.x;
        const dy = e.clientY - panStart.current.y;

        setCamera(prev => ({
            ...prev,
            x: cameraStart.current.x + dx,
            y: cameraStart.current.y + dy
        }));
    };

    const handleMouseUp = (e) => {
        if (isPanning.current) {
            isPanning.current = false;
        }

        // Also cancel connection if in connecting state
        if (interactionState === 'CONNECTING') {
            if (canvasMouseDownRef.current) {
                // This was a click on the canvas! Create connected node.
                createConnectedNode(e);
            } else {
                // This was a drag release (probably from a node). Cancel.
                cancelConnection();
            }
            canvasMouseDownRef.current = false;
        }
    };

    // Helper: Calculate safe position with repulsion from ALL nodes
    const calculateSafePosition = (x, y) => {
        let safeX = x;
        let safeY = y;
        const minDistance = 120; // Safe distance (Node width ~64px + gap)

        // Simple relaxation loop to resolve collisions
        for (let i = 0; i < 3; i++) {
            let adjusted = false;
            nodes.forEach(node => {
                const dx = safeX - node.position.x;
                const dy = safeY - node.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < minDistance) {
                    // Calculate push vector
                    let angle;
                    if (distance === 0) {
                        // Exact overlap: random direction
                        angle = Math.random() * Math.PI * 2;
                    } else {
                        angle = Math.atan2(dy, dx);
                    }

                    // Push out to minDistance
                    safeX = node.position.x + Math.cos(angle) * minDistance;
                    safeY = node.position.y + Math.sin(angle) * minDistance;
                    adjusted = true;
                }
            });
            if (!adjusted) break;
        }

        return { x: safeX, y: safeY };
    };

    const createConnectedNode = (e) => {
        // Prevent duplicate creation
        if (isCreatingNode.current) {
            console.log('⚠️ Node creation already in progress, skipping...');
            return;
        }

        if (!isEditMode) return;
        const { tempConnection } = useGraphStore.getState();
        if (!tempConnection) return;

        isCreatingNode.current = true;

        const coreExists = nodes.some(n => n.entity.type === 'core');
        if (!coreExists) {
            console.log('❌ Cannot create nodes - Core must exist first!');
            isCreatingNode.current = false;
            return;
        }

        const rect = containerRef.current.getBoundingClientRect();
        const initialX = (e.clientX - rect.left - camera.x) / camera.scale;
        const initialY = (e.clientY - rect.top - camera.y) / camera.scale;

        // VALIDATE coordinates
        if (!isFinite(initialX) || !isFinite(initialY)) {
            console.error('❌ Invalid coordinates for Quick Connect:', { initialX, initialY, event: e });
            isCreatingNode.current = false;
            return;
        }

        console.log('⚡ Quick Connect: Creating node at', { x: initialX.toFixed(1), y: initialY.toFixed(1) });

        try {
            // Apply universal repulsion
            const safePos = calculateSafePosition(initialX, initialY);
            addNode(safePos, tempConnection.sourceId);
        } catch (error) {
            console.error('❌ Failed to create connected node:', error);
        } finally {
            // Release lock
            setTimeout(() => {
                isCreatingNode.current = false;
            }, 100);
        }
    };

    // Zoom handler
    const handleWheel = (e) => {
        e.preventDefault();

        const delta = -e.deltaY * 0.001;
        const newScale = Math.max(0.15, Math.min(2.0, camera.scale + delta));

        setCamera(prev => ({
            ...prev,
            scale: newScale
        }));
    };

    // Global Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Undo: Ctrl+Z or Cmd+Z
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                useGraphStore.getState().undo();
            }
            // Redo: Ctrl+Shift+Z or Cmd+Shift+Z
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
                e.preventDefault();
                useGraphStore.getState().redo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Attach global mouse listeners
    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [camera, interactionState, isEditMode, nodes]); // Re-attach when state changes

    // Camera Animation Function
    const animateCameraTo = (targetX, targetY, duration = 500) => {
        if (isAnimatingCamera.current) return;
        isAnimatingCamera.current = true;

        const startX = camera.x;
        const startY = camera.y;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeInOutCubic(progress);

            const newX = startX + (targetX - startX) * eased;
            const newY = startY + (targetY - startY) * eased;

            setCamera(prev => ({
                ...prev,
                x: newX,
                y: newY
            }));

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                isAnimatingCamera.current = false;
            }
        };

        requestAnimationFrame(animate);
    };

    // Source Onboarding Handler  
    const handleSourceOnboarding = (nodeId, position) => {
        console.log('🎬 Starting Source onboarding flow', { nodeId, position });

        // 1. Animate camera to Source position (500ms)
        animateCameraTo(
            window.innerWidth / 2 - position.x,
            window.innerHeight / 2 - position.y,
            500
        );

        // 2. After animation: materialize Core and show tooltip
        setTimeout(() => {
            transformSourceToCore(nodeId);
            console.log('✨ Source materialized into Core (via onboarding)');

            // 3. Show onboarding tooltip
            showOnboardingTooltip('Graph unlocked...', 2000);

            // 4. Auto-open properties for the new Core node
            setTimeout(() => {
                setTimeout(() => {
                    const { openWindow } = useWindowStore.getState();
                    const windowWidth = 256; // 32U
                    openWindow('unified-node-properties', {
                        title: 'PROPERTIES',
                        glyph: '◉',
                        data: { id: nodeId },
                        position: {
                            x: window.innerWidth - windowWidth - 100,
                            y: 60
                        }
                    });
                }, 100);
            }, 100);
        }, 500);
    };

    // ============================================================================
    // END CAMERA SYSTEM
    // ============================================================================

    // Initialize Graph (Spawn Source if empty)
    useEffect(() => {
        initializeGraph();
    }, [initializeGraph]);

    useEffect(() => {
        console.log('🎥 GraphCanvas MOUNTED');
        return () => console.log('🎥 GraphCanvas UNMOUNTED');
    }, []);

    // Adaptive grid color based on mode
    const gridColor = mode === 'LUMA' ? 'rgba(120, 110, 95, 0.25)' : '#5a5654';
    const gridOpacity = mode === 'LUMA' ? 1 : 0.35;
    const edgeColor = mode === 'LUMA' ? 'rgba(50, 90, 90, 0.4)' : 'rgba(117, 205, 205, 0.3)';

    // Handle Global Mouse Move for Connection Line
    const handleConnectionMove = (e) => {
        if (interactionState === 'CONNECTING') {
            const rect = containerRef.current.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left - camera.x) / camera.scale;
            const mouseY = (e.clientY - rect.top - camera.y) / camera.scale;
            updateTempConnection({ x: mouseX, y: mouseY });
        }
    };

    // Handle ESC key to close radial menu and Backspace to delete selected node
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isEditMode) return; // Block all keyboard shortcuts in view mode

            if (e.key === 'Escape' && radialMenu) {
                setRadialMenu(null);
            }

            // Backspace to delete selected node
            if (e.key === 'Backspace' && !radialMenu) {
                const { selection, deleteNode } = useGraphStore.getState();
                if (selection.length > 0) {
                    e.preventDefault();
                    selection.forEach(nodeId => {
                        deleteNode(nodeId);
                    });
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [radialMenu]);

    // Double Click to Create Node OR Enter NOW Mode
    const handleDoubleClick = (e) => {
        console.log('🖱️ Double-click detected', { x: e.clientX, y: e.clientY, shift: e.shiftKey, editMode: isEditMode });

        // 1. Check if we clicked ON a node (Dive into NOW)
        const rect = containerRef.current.getBoundingClientRect();
        const clickX = (e.clientX - rect.left - camera.x) / camera.scale;
        const clickY = (e.clientY - rect.top - camera.y) / camera.scale;

        // Find clicked node (reverse to hit top-most first)
        const clickedNode = [...nodes].reverse().find(node => {
            // Simple interaction radius check (approximate, since Node is HTML)
            // Tune radii to avoid Core eclipsing satellites
            const hitRadius = node.entity.type === 'core' ? 70 : 50;

            const dist = Math.sqrt(Math.pow(clickX - node.position.x, 2) + Math.pow(clickY - node.position.y, 2));
            return dist < hitRadius;
        });

        if (clickedNode) {
            console.log('🤿 Diving into NOW mode for node:', clickedNode.id);
            enterNOW(clickedNode.id);
            return;
        }

        // 2. Otherwise try to create a node (existing logic)

        // Prevent duplicate creation
        if (isCreatingNode.current) {
            console.log('⚠️ Node creation already in progress, skipping...');
            return;
        }

        if (!isEditMode) {
            console.log('⚠️ Double-click ignored: HUD mode (view-only)');
            return;
        }

        if (e.shiftKey) {
            console.log('⚠️ Double-click ignored: Shift key held');
            return;
        }

        // CANNOT create nodes without Core!
        const coreExists = nodes.some(n => n.entity.type === 'core');
        if (!coreExists) {
            console.log('❌ Cannot create nodes - Core must exist first!');
            return;
        }

        isCreatingNode.current = true;

        // Use pre-calculated click coordinates from above
        const initialX = clickX;
        const initialY = clickY;

        // VALIDATE coordinates
        if (!isFinite(initialX) || !isFinite(initialY)) {
            console.error('❌ Invalid coordinates for double-click:', { initialX, initialY, event: e });
            isCreatingNode.current = false;
            return;
        }

        console.log('✨ Double-click: Creating node at', { x: initialX.toFixed(1), y: initialY.toFixed(1) });

        try {
            // Apply universal repulsion
            const safePos = calculateSafePosition(initialX, initialY);

            const newNodeId = addNode(safePos);

            // Auto-open properties window for newly created node
            if (newNodeId) {
                setTimeout(() => {
                    const { openWindow, windows, closeWindow } = useWindowStore.getState();

                    // Singleton: Close other node-properties windows
                    Object.keys(windows).forEach(winId => {
                        if (winId.startsWith('unified-node-properties')) {
                            closeWindow(winId);
                        }
                    });

                    // Open window for new node
                    const windowId = 'unified-node-properties';
                    const windowWidth = 256; // 32U
                    openWindow(windowId, {
                        title: 'PROPERTIES',
                        glyph: 'NODE',
                        data: { id: newNodeId },
                        position: {
                            x: window.innerWidth - windowWidth - 100,
                            y: 60
                        }
                    });
                }, 0);
            }
        } catch (error) {
            console.error('❌ Failed to create node:', error);
        } finally {
            // Release lock after a short delay
            setTimeout(() => {
                isCreatingNode.current = false;
            }, 100);
        }
    };

    // Click Canvas to Create Connected Node (Shift+Click while connecting)
    const handleCanvasClick = (e) => {
        // Deprecated: Logic moved to handleMouseUp for better UX
        // Keeping empty handler if needed for other things
    };

    const handleNodeClick = (node) => {
        if (node.entity.type === 'source') {
            transformSourceToCore(node.id);
        }
    };

    // Off-screen Core Indicator Logic
    const [coreIndicator, setCoreIndicator] = React.useState(null);
    const coreNode = nodes.find(n => n.entity.type === 'core');

    // Network Impulses State
    const [impulses, setImpulses] = React.useState([]);

    // Send greeting signals when edge is created
    const sendGreetingSignals = (edge) => {
        if (!edge) return;

        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        if (!sourceNode || !targetNode) return;

        // Forward signals
        setTimeout(() => {
            const impulseId = `greeting-fwd-1-${edge.id}-${Date.now()}`;
            setImpulses(prev => [...prev, { id: impulseId, edgeId: edge.id, startTime: Date.now(), type: 'greeting', fromSource: true }]);
            setTimeout(() => setImpulses(prev => prev.filter(i => i.id !== impulseId)), 2000);
        }, 100);

        setTimeout(() => {
            const impulseId = `greeting-fwd-2-${edge.id}-${Date.now()}`;
            setImpulses(prev => [...prev, { id: impulseId, edgeId: edge.id, startTime: Date.now(), type: 'greeting', fromSource: true }]);
            setTimeout(() => setImpulses(prev => prev.filter(i => i.id !== impulseId)), 2000);
        }, 400);

        // Backward signals
        setTimeout(() => {
            const impulseId = `greeting-bwd-1-${edge.id}-${Date.now()}`;
            setImpulses(prev => [...prev, { id: impulseId, edgeId: edge.id, startTime: Date.now(), type: 'greeting', fromSource: false }]);
            setTimeout(() => setImpulses(prev => prev.filter(i => i.id !== impulseId)), 2000);
        }, 1300);

        setTimeout(() => {
            const impulseId = `greeting-bwd-2-${edge.id}-${Date.now()}`;
            setImpulses(prev => [...prev, { id: impulseId, edgeId: edge.id, startTime: Date.now(), type: 'greeting', fromSource: false }]);
            setTimeout(() => setImpulses(prev => prev.filter(i => i.id !== impulseId)), 2000);
        }, 1600);
    };

    // Track edges and send greetings for new ones
    const prevEdgesRef = React.useRef([]);
    useEffect(() => {
        const newEdges = edges.filter(e => !prevEdgesRef.current.some(pe => pe.id === e.id));
        newEdges.forEach(edge => sendGreetingSignals(edge));
        prevEdgesRef.current = edges;
    }, [edges]);

    // Send signals on component changes
    const prevComponentsRef = React.useRef(new Map());

    useEffect(() => {
        nodes.forEach(node => {
            if (!prevComponentsRef.current.has(node.id)) {
                prevComponentsRef.current.set(node.id, JSON.stringify(node.components));
            }
        });
    }, []);

    useEffect(() => {
        nodes.forEach(node => {
            const prevComponents = prevComponentsRef.current.get(node.id);
            const currentComponents = JSON.stringify(node.components);

            if (prevComponents && prevComponents !== currentComponents) {
                const nodeEdges = edges.filter(e => e.source === node.id || e.target === node.id);
                nodeEdges.forEach(edge => {
                    const impulseId = `change-${edge.id}-${Date.now()}`;

                    if (impulses.some(i => i.id === impulseId)) return;

                    const fromSource = edge.source === node.id;
                    setImpulses(prev => [...prev, {
                        id: impulseId,
                        edgeId: edge.id,
                        startTime: Date.now(),
                        type: 'change',
                        fromSource
                    }]);
                    setTimeout(() => setImpulses(prev => prev.filter(i => i.id !== impulseId)), 2000);
                });
            }

            prevComponentsRef.current.set(node.id, currentComponents);
        });
    }, [nodes, edges]);

    // Random ambient signals
    useEffect(() => {
        if (!coreNode || edges.length === 0) return;

        const triggerRandomSignal = () => {
            const randomEdge = edges[Math.floor(Math.random() * edges.length)];
            const impulseId = `random-${Date.now()}`;
            setImpulses(prev => [...prev, {
                id: impulseId,
                edgeId: randomEdge.id,
                startTime: Date.now(),
                type: 'ambient',
                fromSource: Math.random() > 0.5
            }]);
            setTimeout(() => setImpulses(prev => prev.filter(i => i.id !== impulseId)), 2000);
        };

        const scheduleNext = () => {
            const delay = 30000 + Math.random() * 30000; // 30-60s
            setTimeout(() => {
                triggerRandomSignal();
                scheduleNext();
            }, delay);
        };

        scheduleNext();
    }, [coreNode, edges.length]);

    // Update Off-screen Indicator
    useEffect(() => {
        if (!coreNode || !containerRef.current) {
            setCoreIndicator(null);
            return;
        }

        const updateIndicator = () => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;

            // Core position in screen coordinates
            const screenX = coreNode.position.x * camera.scale + camera.x;
            const screenY = coreNode.position.y * camera.scale + camera.y;

            // Check if off-screen
            const padding = 50;
            const isOffScreen =
                screenX < -padding ||
                screenX > rect.width + padding ||
                screenY < -padding ||
                screenY > rect.height + padding;

            if (isOffScreen) {
                const cx = rect.width / 2;
                const cy = rect.height / 2;
                const dx = screenX - cx;
                const dy = screenY - cy;
                const angle = Math.atan2(dy, dx);

                let indicatorX = cx + Math.cos(angle) * (Math.min(cx, cy) - 40);
                let indicatorY = cy + Math.sin(angle) * (Math.min(cx, cy) - 40);

                const tan = Math.tan(angle);
                if (Math.abs(dx) > Math.abs(dy)) {
                    const sign = Math.sign(dx);
                    indicatorX = cx + sign * (cx - 40);
                    indicatorY = cy + sign * (cx - 40) * tan;
                    if (Math.abs(indicatorY - cy) > cy - 40) {
                        indicatorY = cy + Math.sign(dy) * (cy - 40);
                        indicatorX = cx + Math.sign(dy) * (cy - 40) / tan;
                    }
                } else {
                    const sign = Math.sign(dy);
                    indicatorY = cy + sign * (cy - 40);
                    indicatorX = cx + sign * (cy - 40) / tan;
                    if (Math.abs(indicatorX - cx) > cx - 40) {
                        indicatorX = cx + Math.sign(dx) * (cx - 40);
                        indicatorY = cy + Math.sign(dx) * (cx - 40) * tan;
                    }
                }

                setCoreIndicator({ x: indicatorX, y: indicatorY, angle: angle * (180 / Math.PI) });
            } else {
                setCoreIndicator(null);
            }
        };

        const interval = setInterval(updateIndicator, 100);
        return () => clearInterval(interval);

    }, [coreNode, camera]);

    return (
        <div
            ref={containerRef}
            className={`w-full h-full overflow-hidden bg-transparent relative ${isEditMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
            onDoubleClick={handleDoubleClick}
            onClick={handleCanvasClick}
            onMouseMove={handleConnectionMove}
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
        >
            {/* Triple Arc Border Indicator - Only visible in Graph mode */}
            {isEditMode && (
                <div className="absolute inset-0 pointer-events-none z-50">
                    <div
                        className="absolute inset-0 rounded-[24px]"
                        style={{
                            boxShadow: `
                                inset 0 0 0 1px rgba(117, 205, 205, 0.15),
                                inset 0 0 0 2px rgba(117, 205, 205, 0.08),
                                inset 0 0 0 3px rgba(117, 205, 205, 0.04)
                            `,
                            animation: 'pulse-glow-soft 4s ease-in-out infinite'
                        }}
                    />
                </div>
            )}

            {/* Background Grid */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: `radial-gradient(circle, ${gridColor} 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                    opacity: gridOpacity
                }}
            />

            {/* PURE CSS TRANSFORM - No animation libraries */}
            <div
                className="w-full h-full transform-gpu origin-top-left"
                style={{
                    transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
                    transition: 'none' // No transitions, instant response
                }}
            >
                {/* Edges Layer */}
                <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none z-0">
                    {/* Existing Edges */}
                    {edges.map(edge => {
                        const sourceNode = nodes.find(n => n.id === edge.source);
                        const targetNode = nodes.find(n => n.id === edge.target);
                        if (!sourceNode || !targetNode) return null;

                        const getNodeRadius = (node) => {
                            if (node.entity.type === 'core') return 64;
                            if (node.entity.type === 'source') return 32;
                            return 32;
                        };

                        const dx = targetNode.position.x - sourceNode.position.x;
                        const dy = targetNode.position.y - sourceNode.position.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance === 0) return null;

                        const sourceRadius = getNodeRadius(sourceNode);
                        const targetRadius = getNodeRadius(targetNode);

                        const x1 = sourceNode.position.x + (dx / distance) * sourceRadius;
                        const y1 = sourceNode.position.y + (dy / distance) * sourceRadius;
                        const x2 = targetNode.position.x - (dx / distance) * targetRadius;
                        const y2 = targetNode.position.y - (dy / distance) * targetRadius;

                        return (
                            <g key={edge.id}>
                                <line
                                    x1={x1}
                                    y1={y1}
                                    x2={x2}
                                    y2={y2}
                                    stroke={edgeColor}
                                    strokeWidth={edgeThickness}
                                    strokeDasharray="5,5"
                                    className="opacity-60"
                                />
                                {/* Impulse Animation */}
                                {impulses.filter(i => i.edgeId === edge.id).map(impulse => {
                                    const startNode = impulse.fromSource ? sourceNode : targetNode;
                                    const endNode = impulse.fromSource ? targetNode : sourceNode;

                                    const startRadius = getNodeRadius(startNode);
                                    const endRadius = getNodeRadius(endNode);

                                    const idx = endNode.position.x - startNode.position.x;
                                    const idy = endNode.position.y - startNode.position.y;
                                    const idist = Math.sqrt(idx * idx + idy * idy);

                                    if (idist === 0) return null;

                                    const startX = startNode.position.x + (idx / idist) * startRadius;
                                    const startY = startNode.position.y + (idy / idist) * startRadius;
                                    const endX = endNode.position.x - (idx / idist) * endRadius;
                                    const endY = endNode.position.y - (idy / idist) * endRadius;

                                    return (
                                        <circle
                                            key={impulse.id}
                                            r="3"
                                            fill="#fff"
                                            className="animate-impulse"
                                            style={{
                                                offsetPath: `path("M${startX},${startY} L${endX},${endY}")`,
                                                animation: 'move-and-dissolve 1s linear forwards'
                                            }}
                                        />
                                    );
                                })}
                            </g>
                        );
                    })}

                    {/* Temp Connection Line */}
                    {interactionState === 'CONNECTING' && tempConnection && (
                        <line
                            x1={tempConnection.sourcePos.x}
                            y1={tempConnection.sourcePos.y}
                            x2={tempConnection.currentPos.x}
                            y2={tempConnection.currentPos.y}
                            stroke={edgeColor}
                            strokeWidth="2"
                            strokeDasharray="4,4"
                            className="animate-pulse"
                        />
                    )}
                </svg>

                {/* Nodes Layer */}
                {nodes.map(node => (
                    <Node
                        key={node.id}
                        node={node}
                        isEditMode={isEditMode}
                        scale={camera.scale}
                        onClick={handleNodeClick}
                        onSourceOnboarding={handleSourceOnboarding}
                        onRightClick={(nodeId, position) => {
                            if (!isEditMode) return; // Block radial menu in HUD mode
                            setRadialMenu({ nodeId, position });
                        }}
                    />
                ))}
            </div>

            {/* Off-screen Core Indicator */}
            {coreIndicator && (
                <div
                    className="absolute w-20 h-20 flex items-center justify-center pointer-events-none"
                    style={{
                        left: coreIndicator.x,
                        top: coreIndicator.y,
                        transform: `translate(-50%, -50%) rotate(${coreIndicator.angle}deg)`,
                        zIndex: 1000
                    }}
                >
                    <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[20px] border-b-white/50 blur-[2px]" />
                    <div className="absolute w-full h-full rounded-full animate-pulse-glow"
                        style={{
                            background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
                            boxShadow: '0 0 20px rgba(255,255,255,0.3)'
                        }}
                    />
                </div>
            )}



            {/* Onboarding Tooltip */}
            {onboardingTooltip && (() => {
                // Find Core node and calculate its screen position
                const coreNode = nodes.find(n => n.entity.type === 'core');
                if (!coreNode) return null;

                // Calculate Core position in screen coordinates
                const screenX = coreNode.position.x * camera.scale + camera.x;
                const screenY = coreNode.position.y * camera.scale + camera.y;

                return (
                    <div
                        className="absolute pointer-events-none
                                   px-6 py-3 bg-black/90 border border-cyan-500/60
                                   text-cyan-300 text-sm tracking-widest font-mono
                                   rounded-md shadow-lg shadow-cyan-500/20
                                   animate-fade-scale"
                        style={{
                            zIndex: 10000,
                            left: `${screenX}px`,
                            top: `${screenY + 96}px`, // 96px below Core (24×4, harmonic)
                            transform: 'translateX(-50%)'
                        }}
                    >
                        {onboardingTooltip.message}
                    </div>
                );
            })()}

            {/* Radial Menu */}
            {radialMenu && (
                <RadialMenu
                    nodeId={radialMenu.nodeId}
                    position={radialMenu.position}
                    onClose={() => setRadialMenu(null)}
                />
            )}
        </div>
    );
};

export default GraphCanvas;
