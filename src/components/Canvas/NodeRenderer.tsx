/**
 * NodeRenderer.jsx
 * Renders a single Node.
 * CRYSTAL VERSION: No layout shifts, pure transform positioning.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useSelectionStore } from '../../store/useSelectionStore';
import { useGraphStore } from '../../store/useGraphStore';
import { useAppStore } from '../../store/useAppStore';
import { eventBus, EVENTS } from '../../core/events/EventBus';
import GlyphIcon from '../Icon/GlyphIcon';
import { NODE_SIZES } from '../../utils/layoutMetrics';
import { getGlyphById } from '../../utils/customGlyphs';
import type { NodeBase, NodeData } from '../../core/types';

interface NodeRendererProps {
    node: NodeBase;
}

const NodeRenderer = ({ node }: NodeRendererProps) => {
    const isSelected = useSelectionStore(state => state.selectedIds.includes(node.id));
    const updateNode = useGraphStore(state => state.updateNode);
    const allNodes = useGraphStore(state => state.nodes);
    const contextMenuMode = useAppStore(state => state.contextMenuMode);
    const [isEditing, setIsEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Dynamic Size & Style based on Hierarchy
    const isCluster = node.type === 'cluster';
    const isCore = node.type === 'core';
    const isArchecore = node.id === 'archecore';
    const nodeData = node.data as NodeData;
    const labelText = typeof nodeData?.label === 'string' ? nodeData.label.trim() : '';
    const displayLabel = labelText.length > 12 ? labelText.slice(0, 12) : labelText;
    const iconValueRaw = typeof nodeData?.icon_value === 'string' ? nodeData.icon_value.trim() : '';
    const iconValue = iconValueRaw === '•' ? '' : iconValueRaw;
    const focusGhostLevel = node.meta?.focusGhostLevel ?? (node.meta?.focusGhost ? 1 : 0);
    const isFocusGhost = focusGhostLevel > 0;
    const parentClusterId = node.meta?.parentClusterId;
    const parentCluster = parentClusterId ? allNodes.find(item => item.id === parentClusterId) : null;
    const isParentFolded = Boolean(parentCluster?.meta?.isFolded);
    const isHidden = Boolean(node.meta?.isHidden || (node.meta?.focusHidden && !isFocusGhost) || isParentFolded);
    const [isHover, setIsHover] = useState(false);
    const bodyColor = nodeData?.color_body ?? nodeData?.color ?? 'rgba(255,255,255,0.06)';
    const strokeColor = nodeData?.color_stroke ?? nodeData?.color ?? 'rgba(255,255,255,0.4)';
    const glowColor = nodeData?.color_glow ?? 'rgba(255,255,255,0.08)';
    const hoverStrokeColor = nodeData?.color_glow ?? 'rgba(255,255,255,0.7)';
    const glyphColor = nodeData?.color_glyph ?? 'rgba(255,255,255,0.9)';
    // TODO: add glyph symmetry checks for non-centered unicode glyphs (builder backlog).
    const glyphScale = nodeData?.glyph_scale ?? 1;
    const glyphOffsetX = nodeData?.glyph_offset_x ?? 0;
    const glyphOffsetY = nodeData?.glyph_offset_y ?? 0;

    const sizePx = isCore ? NODE_SIZES.root : isCluster ? NODE_SIZES.cluster : NODE_SIZES.base;
    const glyphSize = sizePx * 0.6;
    const dashInset = Math.round(sizePx * 0.17);
    const orbit1Inset = Math.round(sizePx * 0.29);
    const orbit2Inset = Math.round(sizePx * 0.42);
    const radialLabelAngle = -150 * (Math.PI / 180);
    const radialLabelRadius = (sizePx / 2) + 48;
    const radialLabelOffset = {
        x: Math.cos(radialLabelAngle) * radialLabelRadius,
        y: Math.sin(radialLabelAngle) * radialLabelRadius
    };

    const ringClasses = isArchecore
        ? 'border shadow-[0_0_30px_rgba(255,255,255,0.12)]'
        : isCore
            ? 'border'
            : isCluster
                ? 'border'
                : 'border';
    const coreAnimated = Boolean(node.meta?.coreAnimated);
    const shouldAnimateCore = isCore && !coreAnimated;
    const bloomClass = shouldAnimateCore ? 'animate-core-materialize' : (isCore ? '' : 'animate-bloom');
    const glyphAppearClass = shouldAnimateCore ? 'core-glyph-appear' : '';

    const customGlyph = iconValue ? getGlyphById(iconValue) : undefined;
    const resolvedGlyphId = customGlyph
        ? iconValue
        : (iconValue ? '' : (isArchecore ? 'archecore' : isCore ? 'core' : isCluster ? 'cluster' : ''));

    // Focus input on edit mode
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    // Listener for Context Menu Rename
    useEffect(() => {
        const unsub = eventBus.on(EVENTS.UI_REQ_EDIT_LABEL, ({ payload }) => {
            if (payload.nodeId === node.id && contextMenuMode === 'radial') {
                setIsEditing(true);
            }
        });
        return unsub;
    }, [node.id, contextMenuMode]);

    const handleLabelCommit = () => {
        if (!inputRef.current) return;
        const newVal = inputRef.current.value.trim();
        if (newVal !== labelText) {
            updateNode(node.id, { data: { ...node.data, label: newVal || 'Empty' } });
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        e.stopPropagation(); // Prevent global hotkeys (like Delete) while typing
        if (e.key === 'Enter') {
            handleLabelCommit();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
        }
    };

    return (
        <div
            className={`absolute top-0 left-0 ${(isFocusGhost || isHidden) ? 'pointer-events-none' : 'pointer-events-auto'}`}
            data-node-id={node.id}
            data-node-type={node.type}
                style={{
                    transform: `translate3d(${node.position.x}px, ${node.position.y}px, 0)`
                }}
            >
            <div
                className={`relative -translate-x-1/2 -translate-y-1/2 ${bloomClass}`}
                style={{ width: `${sizePx}px`, height: `${sizePx}px` }}
                onAnimationEnd={(e) => {
                    if (!shouldAnimateCore) return;
                    if (e.animationName !== 'core-materialize') return;
                    updateNode(node.id, { meta: { ...(node.meta ?? {}), coreAnimated: true } });
                }}
            >
                <div
                    className={`
                        relative flex items-center justify-center
                        rounded-full
                        cursor-pointer
                        will-change-transform will-change-filter
                        transition-all duration-300 ease-out
                        ${isHidden ? 'node-hidden' : ''}

                    /* Glass Structure */
                    backdrop-blur-[1px] ${ringClasses}
                    
                    /* Shadows: Deep Ambient + Soft Inner */
                    shadow-[0_6px_30px_-2px_rgba(0,0,0,0.5),inset_0_0_18px_rgba(255,255,255,0.09)]
                    
                    /* Hover/Select State (Purely Visual) */
                    ${isSelected ? 'scale-105 animate-breathe border-white/50' : 'hover:scale-105 hover:border-white/40 hover:shadow-[0_0_20px_rgba(255,255,255,0.12)]'}
                `}
                    onPointerEnter={() => setIsHover(true)}
                    onPointerLeave={() => setIsHover(false)}
                    style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: isFocusGhost ? 'transparent' : bodyColor,
                        borderColor: isFocusGhost
                            ? (focusGhostLevel > 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.3)')
                            : (isSelected || isHover ? hoverStrokeColor : strokeColor),
                        borderStyle: isFocusGhost ? 'dashed' : undefined,
                        boxShadow: isFocusGhost
                            ? 'none'
                            : `0 6px 30px -2px rgba(0,0,0,0.5), inset 0 0 18px rgba(255,255,255,0.09), 0 0 ${isSelected ? 14 : 6}px ${glowColor}`,
                        opacity: isHidden ? 0 : (isFocusGhost ? (focusGhostLevel > 1 ? 0.35 : 0.55) : 1),
                        transition: isCore ? 'border-color 220ms ease' : undefined
                    }}
                >
                    {/* Orbitals for Core & Selected Nodes */}
                    {isSelected && (
                        <>
                            <div className="orbit-sector orbit-sector-1" style={{ inset: `-${orbit1Inset}px` }} />
                            <div className="orbit-sector orbit-sector-2" style={{ inset: `-${orbit2Inset}px` }} />
                            <div
                                className="absolute rounded-full border border-dashed border-white/20 animate-orbit-slow pointer-events-none"
                                style={{ inset: `-${dashInset}px` }}
                            />
                        </>
                    )}

                    {/* Content */}
                    {(isCluster || isCore || iconValue || resolvedGlyphId) && (
                        <span className={`
                        font-bold tracking-widest text-white/90 select-none pointer-events-none font-sans drop-shadow-md flex items-center justify-center leading-none
                        ${glyphAppearClass}
                    `}>
                            {resolvedGlyphId ? (
                                <GlyphIcon
                                    id={resolvedGlyphId}
                                    size={glyphSize * glyphScale}
                                    className="text-white/90"
                                    style={{ color: isFocusGhost ? (focusGhostLevel > 1 ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.5)') : glyphColor, transform: `translate(${glyphOffsetX}px, ${glyphOffsetY}px)` }}
                                />
                            ) : (
                                <span style={{ fontSize: `${glyphSize * glyphScale}px`, lineHeight: 1, display: 'block', color: isFocusGhost ? (focusGhostLevel > 1 ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.5)') : glyphColor, transform: `translate(${glyphOffsetX}px, ${glyphOffsetY}px)` }}>
                                    {iconValue || '○'}
                                </span>
                            )}
                        </span>
                    )}

                </div>
            </div>
        </div>
    );
};

export default NodeRenderer;
