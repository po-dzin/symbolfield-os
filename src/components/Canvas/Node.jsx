import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { useStateStore, TONES } from '../../store/stateStore';
import { useGraphStore } from '../../store/graphStore';
import { useWindowStore } from '../../store/windowStore';
import { useHarmonyStore } from '../../store/harmonyStore';

import { calculateGeometry, calculateColorHarmonics, snapToGrid } from '../../engine/harmonics';
import {
    getAgingFactor,
    getBrightnessFactor,
    getSizeFactor,
    getBlurAmount,
    isJoyful as checkIsJoyful,
    getJoyIntensity,
    getMilestone
} from '../../engine/forgettingCurve';

const Node = ({ node, isEditMode = false, scale = 1, onClick, onRightClick, onSourceOnboarding }) => {
    const { entity, components, state } = node;
    const { mode } = useStateStore();
    const { startConnection, endConnection, transformSourceToCore, updateNodePosition, enterNOW } = useGraphStore();
    const { openWindow } = useWindowStore();
    const { isHarmonicLockEnabled } = useHarmonyStore();

    // Force re-render every 10 seconds for aging animation
    const [, forceUpdate] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            forceUpdate(n => n + 1);
        }, 10000); // Update every 10 seconds
        return () => clearInterval(interval);
    }, []);

    // Resolve Tone
    const toneId = components.tone?.id;
    const { toneId: globalToneId } = useStateStore();

    // Color Logic:
    let activeColor;
    if (entity.type === 'source') {
        // Neutral Stone Gray for Source
        activeColor = mode === 'LUMA' ? '#a8a29e' : '#78716c'; // Warm stone gray
    } else if (!toneId || toneId === 'void') {
        activeColor = mode === 'LUMA' ? '#a0a0a0' : '#4a4a4a'; // Gray for void
    } else if (toneId === 'base') {
        const globalTone = TONES.find(t => t.id === globalToneId) || TONES[0];
        activeColor = mode === 'LUMA' ? globalTone.lumaColor : globalTone.color;
    } else {
        const tone = TONES.find(t => t.id === toneId) || TONES[0];
        activeColor = mode === 'LUMA' ? tone.lumaColor : tone.color;
    }

    // Resolve Glyph
    const glyphId = components.glyph?.id;
    const glyphChar = getGlyphChar(glyphId);

    // Node Types
    const isSource = entity.type === 'source';
    const isCore = entity.type === 'core';
    const isContainer = entity.type === 'container';
    const isVoid = entity.type === 'void'; // Legacy/Fallback

    // Visual Config
    // Core: Small seed (w-24) + LARGE outer ring
    // Container: base size w-16
    const size = isCore ? 'w-24 h-24' : isSource ? 'w-12 h-12' : 'w-12 h-12';
    const fontSize = isCore ? 'text-3xl' : isSource ? 'text-[0px]' : 'text-xl';

    // Hex to RGB for rgba usage
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
    };
    const accentRGB = hexToRgb(activeColor);

    // Drag State
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = React.useRef({ x: 0, y: 0 });
    const nodeStartRef = React.useRef({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        if (!isEditMode) return; // Block interactions in HUD mode

        // Always record start position for click vs drag detection
        dragStartRef.current = { x: e.clientX, y: e.clientY };

        // SOURCE and CORE are FIXED - cannot be dragged
        if (isSource || isCore) {
            e.preventDefault();
            e.stopPropagation(); // CRITICAL: Stop canvas panning
            return;
        }

        // Shift+Click = Connection (handled in handleClick, not here)
        if (e.shiftKey) {
            e.stopPropagation();
            return; // Don't start drag, wait for click event
        }

        // Normal Click = Drag Start
        e.stopPropagation(); // Prevent canvas panning
        setIsDragging(true);
        nodeStartRef.current = { ...node.position };
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;

            const dx = (e.clientX - dragStartRef.current.x) / scale;
            const dy = (e.clientY - dragStartRef.current.y) / scale;

            let newX = nodeStartRef.current.x + dx;
            let newY = nodeStartRef.current.y + dy;

            // Apply Harmonic Lock
            if (isHarmonicLockEnabled) {
                newX = snapToGrid(newX);
                newY = snapToGrid(newY);
            }

            updateNodePosition(node.id, { x: newX, y: newY });
        };

        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
            }
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isHarmonicLockEnabled, scale, node.id, updateNodePosition]);

    // Force Core/Source to exact center (0,0) if they drift
    useEffect(() => {
        if ((isSource || isCore) && (node.position.x !== 0 || node.position.y !== 0)) {
            console.log('📍 Enforcing center position for Core/Source');
            updateNodePosition(node.id, { x: 0, y: 0 });
        }
    }, [isSource, isCore, node.position.x, node.position.y, node.id, updateNodePosition]);

    const handleMouseUp = (e) => {
        // Don't end connection if we are the source (allows click-move-click workflow)
        const { tempConnection } = useGraphStore.getState();
        if (tempConnection?.sourceId === node.id) return;

        endConnection(node.id);
    };

    const handleDoubleClick = (e) => {
        e.stopPropagation();

        // 1. SOURCE NODE (SEED) -> Materialize Core & Enter Graph Mode
        if (isSource) {
            // HUD Mode: Use onboarding flow (camera animation + tooltip)
            if (!isEditMode && onSourceOnboarding) {
                const { setActiveTab } = useWindowStore.getState();
                setActiveTab('Graph');
                console.log('🌱 Switching to Graph Mode (Onboarding)');

                // Trigger onboarding flow (camera + materialization + tooltip)
                setTimeout(() => {
                    onSourceOnboarding(node.id, node.position);
                }, 50);
                return;
            }

            // Graph Mode: Direct materialization (no camera animation)
            if (isEditMode) {
                transformSourceToCore(node.id);
                console.log('✨ Source materialized into Core (direct)');

                // Auto-open properties
                setTimeout(() => {
                    const { openWindow } = useWindowStore.getState();
                    openWindow('unified-node-properties', {
                        title: 'PROPERTIES',
                        glyph: '◉',
                        data: { id: node.id }
                    });
                }, 100);
            }
            return;
        }

        // 2. NORMAL NODE -> ENTER NOW MODE (Dive)
        console.log('🤿 Node Double-Click: Entering NOW Mode for', node.id);
        enterNOW(node.id);
    };

    const handleClick = (e) => {
        e.stopPropagation();

        // Prevent click if we just dragged (simple threshold check could be added if needed, 
        // but for now relying on isDragging state might be tricky since it clears on mouseup.
        // A common pattern is to check distance moved.)
        const dist = Math.hypot(e.clientX - dragStartRef.current.x, e.clientY - dragStartRef.current.y);
        if (dist > 5) return; // It was a drag, not a click

        // SOURCE NODE: Ignore single click (waiting for double-click to materialize)
        if (isSource) {
            console.log('🌱 Source clicked - use double-click to materialize');
            return;
        }

        // Connection Logic (Shift+Click or Ctrl+Click) - only in edit mode
        if ((e.shiftKey || e.ctrlKey) && isEditMode) {
            const { interactionState, tempConnection } = useGraphStore.getState();

            if (interactionState === 'CONNECTING' && tempConnection?.sourceId !== node.id) {
                // Complete connection
                endConnection(node.id);
            } else {
                // Start connection
                startConnection(node.id, node.position);
            }
            return;
        }

        // Activate node (refresh timestamp, trigger joy)
        const { activateNode } = useGraphStore.getState();
        activateNode(node.id);

        // Check if properties window is already open for THIS node
        const { windows, openWindow, focusWindow } = useWindowStore.getState();
        const windowId = 'unified-node-properties';
        const existingWindow = windows[windowId];

        if (existingWindow?.isOpen && existingWindow?.data?.id === node.id) {
            // Window already open for this node - just focus it
            focusWindow(windowId);
        } else {
            // Open or update window with new node data (100px right, 60px top)
            const windowWidth = 256; // 32U
            openWindow(windowId, {
                title: 'PROPERTIES',
                glyph: glyphChar || (isSource ? 'SOURCE' : 'NODE'),
                data: { id: node.id },
                position: {
                    x: window.innerWidth - windowWidth - 100,
                    y: 60
                }
            });
        }

        onClick && onClick(node);
    };

    // Check if ANY window is open for this node (Properties OR Document)
    const { windows } = useWindowStore();
    const isWindowOpen = Object.values(windows).some(w =>
        w.isOpen && w.data?.id === node.id && !w.isMinimized
    );

    const handleContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Calculate node center in screen coordinates
        const rect = e.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        onRightClick && onRightClick(node.id, { x: centerX, y: centerY });
    };

    // Aging System
    const now = Date.now();
    const lastEditedAt = node.state?.lastEditedAt || now;
    // Fallback: if no activatedAt, use lastEditedAt (ensures new nodes glow)
    const activatedAt = node.state?.activatedAt || node.state?.lastEditedAt || now;
    const ageMs = now - lastEditedAt;
    const timeSinceActivation = now - activatedAt;

    // --- FORGETTING CURVE AGING SYSTEM ---
    // Get current time scale for adaptive aging
    const { timeScale = 'DAY' } = useStateStore();

    // Calculate aging using exponential forgetting curve
    const ageFactor = getAgingFactor(ageMs, timeScale);
    const brightnessFactor = getBrightnessFactor(ageFactor);
    const sizeFactor = getSizeFactor(ageFactor);
    const blurAmount = getBlurAmount(ageFactor);

    // Milestone detection for visual pulse
    const milestone = getMilestone(ageMs, timeScale);

    // --- JOY GLOW (Selection-based) ---
    // Track deselect timestamp with ref for synchronous updates
    const deselectTimestampRef = React.useRef(null);
    const prevWindowOpen = React.useRef(isWindowOpen);

    // Update deselect timestamp synchronously during render
    if (isWindowOpen && deselectTimestampRef.current !== null) {
        // Window is open → clear fade immediately
        deselectTimestampRef.current = null;
    } else if (timeSinceActivation < 100 && deselectTimestampRef.current !== null) {
        // Just activated → clear any existing deselect fade
        deselectTimestampRef.current = null;
    } else if (!isWindowOpen && prevWindowOpen.current && deselectTimestampRef.current === null) {
        // Window just closed → start fade
        deselectTimestampRef.current = Date.now();
    }
    prevWindowOpen.current = isWindowOpen;

    // Get current timestamp value
    const deselectTimestamp = deselectTimestampRef.current;

    // Calculate joy state
    let isJoyful = false;
    let joyIntensity = 0;

    // Priority 1: Window Open (always max, overrides everything)
    if (isWindowOpen) {
        isJoyful = true;
        joyIntensity = 1.25;
    }
    // Priority 2: Activation Glow (first 8 seconds)
    else if (timeSinceActivation < 8000) {
        isJoyful = true;
        joyIntensity = 1.25 * (1 - (timeSinceActivation / 8000));
    }
    // Priority 3: Deselect Fade (8 seconds after close)
    else if (deselectTimestamp) {
        const timeSinceDeselect = now - deselectTimestamp;
        if (timeSinceDeselect < 8000) {
            isJoyful = true;
            joyIntensity = 1.25 * (1 - (timeSinceDeselect / 8000));
        }
    }

    // --- HARMONY ENGINE INTEGRATION ---
    const { isUltraEnabled, harmonics: globalHarmonics } = useHarmonyStore();

    // Calculate node-specific harmonics
    const xpTotal = (components.xp?.hp || 0) + (components.xp?.ep || 0) + (components.xp?.mp || 0) + (components.xp?.sp || 0) + (components.xp?.np || 0);
    const geom = calculateGeometry(xpTotal, mode, now);
    const colorHarmonics = calculateColorHarmonics(mode, toneId || 'void', xpTotal);

    // Map Harmony outputs to visual props
    // Harmonic scale relative to base 64px radius
    const harmonicScale = geom.currentRadius / 64;

    // Glow intensity: base * ultra modifier
    const baseGlowIntensity = isEditMode ? 1.0 : 0.65;
    const glowIntensity = baseGlowIntensity * (isUltraEnabled ? globalHarmonics.modifiers.glowIntensity : 1.0);
    const hudContrast = isEditMode ? 1.0 : 0.9;

    // 2.71D Glassy Liquid Pointcloud Crystal Style (MORE BRIGHT)
    const crystalStyle = {
        background: `radial-gradient(circle at 35% 35%, 
            rgba(255, 255, 255, ${1.0 * brightnessFactor}) 0%, 
            rgba(255, 255, 255, ${0.6 * brightnessFactor}) 25%, 
            rgba(${accentRGB}, ${0.3 * brightnessFactor}) 50%, 
            rgba(0, 0, 0, 0.7) 100%)`,
        boxShadow: `
            inset -8px -8px 30px rgba(0,0,0,0.6),
            inset 4px 4px 20px rgba(255,255,255,${0.7 * brightnessFactor}),
            0 0 ${6 * brightnessFactor * glowIntensity}px rgba(${accentRGB}, ${0.4 * brightnessFactor * glowIntensity})
        `,
        backdropFilter: `blur(${8 + blurAmount}px)`,
        filter: `blur(${blurAmount}px) brightness(${brightnessFactor})`,
        transform: `scale(1.0)`, // Full size, no scaling down
        transition: 'all 2s ease-out'
    };





    return (
        <div
            className={clsx(
                "graph-node absolute transform -translate-x-1/2 -translate-y-1/2 group flex items-center justify-center outline-none cursor-pointer",
                milestone && "animate-milestone"
            )}
            style={{
                left: node.position.x,
                top: node.position.y,
                zIndex: isCore ? 50 : (isWindowOpen ? 60 : 10),
                filter: `contrast(${hudContrast})`,
                // Smooth position transition when NOT dragging
                transition: isDragging ? 'none' : 'left 0.15s ease-out, top 0.15s ease-out'
            }}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onContextMenu={handleContextMenu}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            tabIndex={-1} // Prevent focus
        >
            {/* Source Visuals: Refined Pulse & Ripple with Tooltip */}
            {isSource && (
                <div className="relative flex items-center justify-center w-16 h-16 pointer-events-auto group">
                    {/* Pulsing Source Ring (expands to Core size: 142px) */}
                    <div className="absolute inset-0 rounded-full border border-white/20 animate-source-ping-large" />

                    {/* Central Dot (Smaller: 10px, Subtle Glow, Max Brightness) */}
                    <div
                        className="w-[10px] h-[10px] bg-white rounded-full animate-source-pulse pointer-events-none"
                        style={{ boxShadow: '0 0 8px rgba(255, 255, 255, 0.6)' }}
                    />

                    {/* Label (80px from center) */}
                    <div className="absolute top-[80px] text-[10px] tracking-[0.2em] text-white/50 font-mono pointer-events-none select-none">
                        SOURCE
                    </div>

                    {/* Tooltip (Visible on Hover over the 64px zone) */}
                    <div className="absolute bottom-full mb-2 px-3 py-1.5 bg-os-glass-bg border border-white/10 rounded text-xs text-white/70 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50">
                        Double-click to Materialize
                    </div>
                </div>
            )}

            {/* Core Visuals: Rainbow Spectrum with Glass Ring */}
            {isCore && (
                <>
                    {/* Crystallization Animation Wrapper */}
                    <div className="absolute inset-0 flex items-center justify-center animate-crystallize">
                        {/* Rainbow glow aura - 120px (1.25x ratio from 96px ring) */}
                        <div
                            className="absolute rounded-full animate-core-breathe"
                            style={{
                                width: '120px',
                                height: '120px',
                                background: `conic-gradient(from 0deg,
                                    rgba(255, 0, 0, 0.4),
                                    rgba(255, 127, 0, 0.4),
                                    rgba(255, 255, 0, 0.4),
                                    rgba(0, 255, 0, 0.4),
                                    rgba(0, 255, 255, 0.4),
                                    rgba(0, 0, 255, 0.4),
                                    rgba(148, 0, 211, 0.4),
                                    rgba(255, 0, 0, 0.4))`,
                                filter: 'blur(20px)',
                                animation: 'spin-slow 25s linear infinite'
                            }}
                        />

                        {/* OUTER Ring - 96px (12U, 1.5x container) - SOLID 3D GLASS */}
                        <div
                            className="absolute flex items-center justify-center pointer-events-none"
                            style={{
                                width: '96px',
                                height: '96px',
                                left: '50%',
                                top: '50%',
                                transform: 'translate(-50%, -50%)'
                            }}
                        >
                            {/* Main glass ring - always visible */}
                            <div
                                className="absolute inset-0 rounded-full animate-core-breathe animate-core-morph"
                                style={{
                                    background: `radial-gradient(circle at 50% 50%, 
                                        transparent 40%, 
                                        rgba(255, 255, 255, 0.15) 44%,
                                        rgba(255, 255, 255, 0.25) 50%,
                                        rgba(255, 255, 255, 0.15) 56%,
                                        transparent 60%)`,
                                    boxShadow: `
                                        inset 0 0 30px rgba(255, 255, 255, 0.5),
                                        0 0 60px rgba(200, 200, 255, 0.6),
                                        0 0 90px rgba(150, 150, 255, 0.4)
                                    `,
                                    backdropFilter: 'blur(12px)'
                                }}
                            />

                            {/* Glass ring border - visible on hover/selection */}
                            <div
                                className={clsx(
                                    "absolute inset-0 rounded-full transition-opacity pointer-events-none",
                                    isWindowOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                )}
                                style={{
                                    border: `1px solid rgba(255, 255, 255, 0.65)`
                                }}
                            />

                            {/* Rainbow torus - wide boundary, bright */}
                            <div
                                className="absolute inset-0 rounded-full opacity-70"
                                style={{
                                    background: `conic-gradient(from 0deg,
                                        rgba(255, 0, 0, 0.4),
                                        rgba(255, 255, 0, 0.4),
                                        rgba(0, 255, 0, 0.4),
                                        rgba(0, 255, 255, 0.4),
                                        rgba(0, 0, 255, 0.4),
                                        rgba(255, 0, 255, 0.4),
                                        rgba(255, 0, 0, 0.4))`,
                                    animation: 'spin-slow 12s linear infinite',
                                    mixBlendMode: 'screen',
                                    maskImage: 'radial-gradient(circle, transparent 65%, black 75%, black 85%, transparent 95%)'
                                }}
                            />

                            {/* Rotating dashed selection - on hover or when window open (107px = 0.75x) */}
                            <div
                                className={clsx(
                                    "absolute rounded-full animate-spin-slow transition-opacity",
                                    isWindowOpen ? "opacity-100" : "opacity-0"
                                )}
                                style={{
                                    width: '107px',
                                    height: '107px',
                                    left: '50%',
                                    top: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    border: `2px dashed`,
                                    borderColor: 'rgba(255, 255, 255, 0.2)',
                                }}
                            />
                        </div>

                        <div>
                            {/* Large central glyph - Clean rendering without shadows to prevent artifacts */}
                            <span
                                className="relative z-10 block text-4xl text-white font-sans leading-none select-none flex items-center justify-center w-[1em] h-[1em]"
                                style={{ filter: 'none' }}
                            >
                                {glyphChar || '◉'}
                            </span>
                        </div>
                    </div>
                </>
            )}

            {/* Container Visuals: 2.71D Glassy Sphere (Empty) */}
            {isContainer && (
                <>
                    <div
                        className={clsx(
                            "relative flex items-center justify-center rounded-full animate-liquid",
                            size
                        )}
                        style={{
                            ...crystalStyle,
                            opacity: 0.8 * brightnessFactor,
                            // Joy Glow: smooth transitions
                            filter: isJoyful
                                ? `${crystalStyle.filter} brightness(${1 + joyIntensity * 0.3})`
                                : crystalStyle.filter,
                            boxShadow: isJoyful
                                ? `${crystalStyle.boxShadow}, 0 0 ${30 * joyIntensity}px ${12 * joyIntensity}px rgba(${accentRGB}, ${0.8 * joyIntensity})`
                                : crystalStyle.boxShadow,
                            transition: isDragging
                                ? 'none'  // No transition when dragging
                                : isWindowOpen
                                    ? 'filter 1s ease-out, box-shadow 1s ease-out, opacity 0.3s ease-out'  // Quick ramp up (1s)
                                    : 'filter 8s ease-out, box-shadow 8s ease-out, opacity 0.3s ease-out'  // Slow fade down (8s)
                        }}
                    >
                        {/* Lidar Scan Effect Overlay (Subtler) */}
                        <div
                            className="absolute inset-0 rounded-full opacity-20 mix-blend-overlay animate-lidar"
                            style={{
                                background: `linear-gradient(180deg, transparent 40%, rgba(${accentRGB}, 0.8) 50%, transparent 60%)`,
                                backgroundSize: '100% 200%',
                                animationDuration: '8s'
                            }}
                        />
                        {/* Empty */}
                    </div>
                    {/* Hover Effect - Solid border (stays on selection) */}
                    <div className={clsx(
                        "absolute inset-0 rounded-full border border-white/40 transition-opacity scale-110",
                        isWindowOpen ? "opacity-100" : "opacity-0"
                    )} />
                </>
            )}

            {/* Legacy/Void Visuals */}
            {isVoid && (
                <div
                    className={clsx(
                        "relative flex items-center justify-center backdrop-blur-md transition-all duration-300 rounded-full",
                        size
                    )}
                    style={{
                        background: 'rgba(10,10,10,0.6)',
                        border: `1.5px solid ${activeColor}`
                    }}
                >
                    <span className={clsx("font-light leading-none", fontSize)} style={{ color: activeColor }}>
                        {glyphChar}
                    </span>
                </div>
            )}

            {/* Connection Port (Visible on Hover or when window open) */}
            {!isSource && (
                <div
                    className={clsx(
                        "absolute inset-0 -m-2 border border-dashed border-white/20 rounded-full transition-opacity pointer-events-none",
                        isWindowOpen ? "opacity-100" : "opacity-0"
                    )}
                />
            )}
        </div>
    );
};

// Helper to map IDs to chars
const getGlyphChar = (id) => {
    const map = {
        'core': '◉', // Base core glyph
        'crystal': '⬡',
        'void': '○'
    };
    return map[id] || null;
};

export default Node;
