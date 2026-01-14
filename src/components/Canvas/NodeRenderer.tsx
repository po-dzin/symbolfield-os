/**
 * NodeRenderer.jsx
 * Renders a single Node.
 * CRYSTAL VERSION: No layout shifts, pure transform positioning.
 */

import React from 'react';
import { useSelectionStore } from '../../store/useSelectionStore';
import { NODE_SIZES } from '../../utils/layoutMetrics';
import type { NodeBase } from '../../core/types';

interface NodeRendererProps {
    node: NodeBase;
}

const NodeRenderer = ({ node }: NodeRendererProps) => {
    const isSelected = useSelectionStore(state => state.selectedIds.includes(node.id));

    // Dynamic Size & Style based on Hierarchy
    const isRoot = node.type === 'root';
    const isCluster = node.type === 'cluster';
    const isCore = node.type === 'core';
    const labelText = typeof node.data?.label === 'string' ? node.data.label.trim() : '';
    const iconValue = typeof node.data?.icon_value === 'string' ? node.data.icon_value.trim() : '';
    const isHidden = node.meta?.isHidden;

    const sizePx = (isRoot || isCore) ? NODE_SIZES.root : isCluster ? NODE_SIZES.cluster : NODE_SIZES.base;
    const glyphSize = sizePx * 0.65;
    const dashInset = Math.round(sizePx * 0.17);
    const orbit1Inset = Math.round(sizePx * 0.29);
    const orbit2Inset = Math.round(sizePx * 0.42);

    const ringClasses = (isRoot || isCore)
        ? 'bg-white/5 border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.12)] root-node-surface'
        : isCluster
            ? 'border border-blue-400/20 bg-blue-400/5'
            : 'border border-white/10 bg-white/5';

    const coreGlowAlpha = 0.4; // From legacy spec

    return (
        <div
            className={`absolute top-0 left-0 ${isHidden ? 'pointer-events-none' : 'pointer-events-auto'}`}
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
                        ${isHidden ? 'node-hidden' : ''}
                        ${(isRoot || isCore) ? 'root-node-surface' : ''}

                    /* Glass Structure */
                    backdrop-blur-xl ${ringClasses}
                    
                    /* Shadows: Deep Ambient + Soft Inner */
                    shadow-[0_4px_24px_-1px_rgba(0,0,0,0.4),inset_0_0_12px_rgba(255,255,255,0.05)]
                    
                    /* Hover/Select State (Purely Visual) */
                    ${isSelected ? 'scale-110 animate-breathe border-white/50' : 'hover:scale-105 hover:border-white/30 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]'}
                `}
                    style={{ width: `${sizePx}px`, height: `${sizePx}px` }}
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
                    {(isRoot || isCluster || isCore || iconValue) && (
                        <span className={`
                        font-bold tracking-widest text-white/90 select-none pointer-events-none font-sans drop-shadow-md
                    `}>
                            <span style={{ fontSize: `${glyphSize}px`, lineHeight: 1 }}>
                                {iconValue
                                    ? iconValue
                                    : (isRoot || isCore)
                                        ? '◉'
                                        : isCluster
                                            ? '◎'
                                            : ''}
                            </span>
                        </span>
                    )}

                    {/* External Label */}
                    {isSelected && labelText && (
                        <div className="absolute top-full mt-6 left-1/2 -translate-x-1/2 flex justify-center pointer-events-none z-50">
                            <div className="px-3 py-1 bg-black/60 border border-white/10 rounded-full backdrop-blur-md text-[10px] tracking-widest text-white/80 uppercase whitespace-nowrap">
                                {labelText}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NodeRenderer;
