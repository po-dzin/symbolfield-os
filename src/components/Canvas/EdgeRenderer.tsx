/**
 * EdgeRenderer.jsx
 * Renders a link (edge) between two nodes.
 * Needs to look up node positions.
 */

import React from 'react';
import { useGraphStore } from '../../store/useGraphStore';
import { useEdgeSelectionStore } from '../../store/useEdgeSelectionStore';
import { useSelectionStore } from '../../store/useSelectionStore';
import { useCameraStore } from '../../store/useCameraStore';
import type { Edge } from '../../core/types';
import { NODE_SIZES } from '../../utils/layoutMetrics';

interface EdgeRendererProps {
    edge: Edge & { type?: string };
}

const EdgeRenderer = ({ edge }: EdgeRendererProps) => {
    // We need direct access to nodes to get positions
    // In a real app we might pass a lookup map or use a selector
    // For v0.5 MVP, we'll grab from useGraphStore but this is O(N) inside render map which is bad.
    // Optimization: The parent (CanvasView) knows nodes, or EdgeRenderer subscribes to specific nodes.
    // Hack for now: CanvasView should calculate coords before rendering EdgeRenderer? 
    // OR: EdgeRenderer uses a `useNodePosition(id)` hook.

    // Let's implement the `useNodesLookup` pattern instead.
    // But to keep it simple and standard:
    const nodes = useGraphStore(state => state.nodes);
    const selectedEdgeIds = useEdgeSelectionStore(state => state.selectedEdgeIds);
    const hoverEdgeId = useEdgeSelectionStore(state => state.hoverEdgeId);
    const zoom = useCameraStore(state => state.zoom);

    // Selection state for nodes to account for scaling
    const selectedNodeIds = useSelectionStore(state => state.selectedIds);

    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);

    if (!sourceNode || !targetNode) return null;
    const sourceHidden = sourceNode.meta?.isHidden;
    const targetHidden = targetNode.meta?.isHidden;
    if (sourceHidden || targetHidden) return null;
    const sourceFocusHidden = sourceNode.meta?.focusHidden;
    const targetFocusHidden = targetNode.meta?.focusHidden;
    const sourceGhostLevelRaw = (sourceNode.meta as Record<string, unknown> | undefined)?.focusGhostLevel;
    const targetGhostLevelRaw = (targetNode.meta as Record<string, unknown> | undefined)?.focusGhostLevel;
    const sourceGhostLevel = typeof sourceGhostLevelRaw === 'number'
        ? sourceGhostLevelRaw
        : ((sourceNode.meta as Record<string, unknown> | undefined)?.focusGhost ? 1 : 0);
    const targetGhostLevel = typeof targetGhostLevelRaw === 'number'
        ? targetGhostLevelRaw
        : ((targetNode.meta as Record<string, unknown> | undefined)?.focusGhost ? 1 : 0);
    const sourceGhost = sourceGhostLevel > 0;
    const targetGhost = targetGhostLevel > 0;

    if ((sourceFocusHidden && !sourceGhost) || (targetFocusHidden && !targetGhost)) return null;
    if (sourceGhost && targetGhost) return null;

    const isGhostLink = sourceGhost || targetGhost;
    const ghostLevel = Math.max(sourceGhostLevel, targetGhostLevel);

    // Center coords
    const cx1 = sourceNode.position.x;
    const cy1 = sourceNode.position.y;
    const cx2 = targetNode.position.x;
    const cy2 = targetNode.position.y;

    // Radius lookup
    const isSourceSelected = selectedNodeIds.includes(sourceNode.id);
    const isTargetSelected = selectedNodeIds.includes(targetNode.id);

    const getRadius = (node: any, isSelected: boolean) => {
        const baseSize = (node.type === 'core')
            ? NODE_SIZES.root
            : node.type === 'cluster'
                ? NODE_SIZES.cluster
                : NODE_SIZES.base;

        // 1.1x scaling when selected, plus a 1px buffer
        const scale = isSelected ? 1.1 : 1.0;
        return (baseSize / 2) * scale + 1;
    };

    const r1 = getRadius(sourceNode, isSourceSelected);
    const r2 = getRadius(targetNode, isTargetSelected);

    // Calculate distance
    const dx = cx2 - cx1;
    const dy = cy2 - cy1;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= r1 + r2) return null; // Avoid drawing inside or overlapping

    // Unit vector or ratio
    const ratio1 = r1 / distance;
    const ratio2 = r2 / distance;

    const x1 = cx1 + dx * ratio1;
    const y1 = cy1 + dy * ratio1;
    const x2 = cx2 - dx * ratio2;
    const y2 = cy2 - dy * ratio2;

    const isSelected = selectedEdgeIds.includes(edge.id);
    const isHovered = hoverEdgeId === edge.id;
    const blurScale = Math.max(0.5, 1 / Math.max(zoom, 0.25));
    const baseBlur = isSelected ? 5 : isHovered ? 4.5 : 4;
    const glowBlur = Math.max(1.2, baseBlur * blurScale);

    return (
        <g>
            {/* 0. Hit Area (Invisible, Thick) */}
            {!isGhostLink && (
                <line
                    data-edge-id={edge.id}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="transparent"
                    strokeWidth="20"
                    style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                />
            )}

            {/* 1. Base Laser Line */}
            <line
                data-edge-id={edge.id}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={isGhostLink
                    ? (ghostLevel > 1
                        ? "color-mix(in srgb, var(--semantic-color-graph-edge), transparent 62%)"
                        : "color-mix(in srgb, var(--semantic-color-graph-edge), transparent 48%)")
                    : isSelected
                        ? "var(--semantic-color-graph-edge-active)"
                        : isHovered
                            ? "var(--semantic-color-graph-edge-strong)"
                            : edge.type === 'associative'
                                ? "var(--semantic-color-graph-edge)"
                                : "var(--semantic-color-graph-edge-strong)"
                }
                strokeWidth={isGhostLink ? "1.2" : isSelected ? "2.2" : isHovered ? "2.0" : "1.5"}
                strokeLinecap="round"
                strokeDasharray={isGhostLink || edge.type === 'associative' ? "4 4" : "0"}
                style={{ pointerEvents: isGhostLink ? 'none' : 'stroke' }}
            />

            {/* 2. Glow Blur (The "Laser" Effect) - Not for associative (make them subtler?) */}
            {!isGhostLink && edge.type !== 'associative' && (
                <line
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={isSelected
                        ? "color-mix(in srgb, var(--semantic-color-graph-edge-active), transparent 70%)"
                        : isHovered
                            ? "color-mix(in srgb, var(--semantic-color-graph-edge-strong), transparent 72%)"
                            : "color-mix(in srgb, var(--semantic-color-graph-edge), transparent 78%)"}
                    strokeWidth={isSelected ? "8" : isHovered ? "7" : "6"}
                    style={{ filter: `blur(${glowBlur}px)` }}
                    pointerEvents="none"
                />
            )}
        </g>
    );
};

export default EdgeRenderer;
