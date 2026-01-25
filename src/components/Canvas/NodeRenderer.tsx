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
    const isRoot = node.type === 'root';
    const isCluster = node.type === 'cluster';
    const isCore = node.type === 'core';
    const nodeData = node.data as NodeData;
    const labelText = typeof nodeData?.label === 'string' ? nodeData.label.trim() : '';
    const displayLabel = labelText.length > 12 ? labelText.slice(0, 12) : labelText;
    const iconValueRaw = typeof nodeData?.icon_value === 'string' ? nodeData.icon_value.trim() : '';
    const iconValue = iconValueRaw === '•' ? '' : iconValueRaw;
    const isFocusGhost = Boolean(node.meta?.focusGhost);
    const parentClusterId = node.meta?.parentClusterId;
    const parentCluster = parentClusterId ? allNodes.find(item => item.id === parentClusterId) : null;
    const isParentFolded = Boolean(parentCluster?.meta?.isFolded);
    const isHidden = Boolean(node.meta?.isHidden || (node.meta?.focusHidden && !isFocusGhost) || isParentFolded);
    const bodyColor = nodeData?.color_body ?? nodeData?.color ?? 'rgba(255,255,255,0.06)';
    const strokeColor = nodeData?.color_stroke ?? nodeData?.color ?? 'rgba(255,255,255,0.4)';
    const glowColor = nodeData?.color_glow ?? 'rgba(255,255,255,0.08)';
    const glyphColor = nodeData?.color_glyph ?? 'rgba(255,255,255,0.9)';
    // TODO: add glyph symmetry checks for non-centered unicode glyphs (builder backlog).
    const glyphScale = nodeData?.glyph_scale ?? 1;
    const glyphOffsetX = nodeData?.glyph_offset_x ?? 0;
    const glyphOffsetY = nodeData?.glyph_offset_y ?? 0;

    const sizePx = (isRoot || isCore) ? NODE_SIZES.root : isCluster ? NODE_SIZES.cluster : NODE_SIZES.base;
    const glyphSize = sizePx * 0.6;
    const dashInset = Math.round(sizePx * 0.17);
    const orbit1Inset = Math.round(sizePx * 0.29);
    const orbit2Inset = Math.round(sizePx * 0.42);

    const ringClasses = isRoot
        ? 'border shadow-[0_0_30px_rgba(255,255,255,0.12)] root-node-surface'
        : isCore
            ? 'border'
            : isCluster
                ? 'border'
                : 'border';

    const customGlyph = iconValue ? getGlyphById(iconValue) : undefined;
    const resolvedGlyphId = customGlyph
        ? iconValue
        : (iconValue ? '' : (isRoot ? 'archecore' : isCore ? 'core' : isCluster ? 'cluster' : ''));

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
            className={`absolute top-0 left-0 ${isFocusGhost ? 'pointer-events-none' : 'pointer-events-auto'}`}
            data-node-id={node.id}
            data-node-type={node.type}
            style={{
                transform: `translate(${node.position.x}px, ${node.position.y}px)`
            }}
        >
            <div className="animate-bloom">
                <div
                    className={`
                        relative flex items-center justify-center
                        rounded-full
                        cursor-pointer
                        will-change-transform will-change-filter
                        transition-all duration-300 ease-out
                        -translate-x-1/2 -translate-y-1/2
                        ${(isRoot || isCore) ? 'root-node-surface' : ''}
                        ${isHidden ? 'node-hidden' : ''}

                    /* Glass Structure */
                    backdrop-blur-[1px] ${ringClasses}
                    
                    /* Shadows: Deep Ambient + Soft Inner */
                    shadow-[0_6px_30px_-2px_rgba(0,0,0,0.5),inset_0_0_18px_rgba(255,255,255,0.09)]
                    
                    /* Hover/Select State (Purely Visual) */
                    ${isSelected ? 'scale-110 animate-breathe border-white/50' : 'hover:scale-105 hover:border-white/30 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]'}
                `}
                    style={{
                        width: `${sizePx}px`,
                        height: `${sizePx}px`,
                        backgroundColor: isFocusGhost ? 'transparent' : bodyColor,
                        borderColor: isFocusGhost ? 'rgba(255,255,255,0.3)' : strokeColor,
                        borderStyle: isFocusGhost ? 'dashed' : undefined,
                        boxShadow: isFocusGhost
                            ? 'none'
                            : `0 6px 30px -2px rgba(0,0,0,0.5), inset 0 0 18px rgba(255,255,255,0.09), 0 0 ${isSelected ? 14 : 6}px ${glowColor}`,
                        opacity: isHidden ? 0 : (isFocusGhost ? 0.55 : 1)
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
                    {(isRoot || isCluster || isCore || iconValue || resolvedGlyphId) && (
                        <span className={`
                        font-bold tracking-widest text-white/90 select-none pointer-events-none font-sans drop-shadow-md flex items-center justify-center leading-none
                    `}>
                            {resolvedGlyphId ? (
                                <GlyphIcon
                                    id={resolvedGlyphId}
                                    size={glyphSize * glyphScale}
                                    className="text-white/90"
                                    style={{ color: isFocusGhost ? 'rgba(255,255,255,0.5)' : glyphColor, transform: `translate(${glyphOffsetX}px, ${glyphOffsetY}px)` }}
                                />
                            ) : (
                                <span style={{ fontSize: `${glyphSize * glyphScale}px`, lineHeight: 1, display: 'block', color: isFocusGhost ? 'rgba(255,255,255,0.5)' : glyphColor, transform: `translate(${glyphOffsetX}px, ${glyphOffsetY}px)` }}>
                                    {iconValue || '○'}
                                </span>
                            )}
                        </span>
                    )}

                    {/* Label in radial mode */}
                    {isSelected && contextMenuMode === 'radial' ? (
                        <div
                            className="absolute top-full mt-6 left-1/2 -translate-x-1/2 flex justify-center z-50 pointer-events-auto"
                            data-part="label"
                            onPointerDown={(e) => {
                                e.stopPropagation();
                            }}
                        >
                            {isEditing ? (
                                <input
                                    ref={inputRef}
                                    type="text"
                                    defaultValue={labelText}
                                    onBlur={handleLabelCommit}
                                    onKeyDown={handleKeyDown}
                                    className="px-3 py-1 bg-black/80 border border-white/30 rounded-full backdrop-blur-md text-[10px] tracking-widest text-white uppercase text-center outline-none min-w-[60px] select-text cursor-text"
                                    autoFocus
                                />
                            ) : (
                                <div
                                    className="px-3 py-1 bg-black/60 border border-white/10 rounded-full backdrop-blur-md text-[10px] tracking-widest text-white/80 uppercase whitespace-nowrap select-none hover:bg-white/10 hover:border-white/30 transition-colors cursor-text max-w-[12ch] truncate"
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        setIsEditing(true);
                                    }}
                                >
                                    {displayLabel}
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default NodeRenderer;
