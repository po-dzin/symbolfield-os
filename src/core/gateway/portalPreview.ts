import type { SpaceData } from '../state/SpaceManager';

export interface PreviewPoint {
    id: string;
    x: number;
    y: number;
    type: string;
}

export interface PreviewEdge {
    id: string;
    source: string;
    target: string;
}

export interface PortalPreviewLayout {
    nodes: PreviewPoint[];
    edges: PreviewEdge[];
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const buildPortalPreviewLayout = (
    snapshot: SpaceData | undefined,
    viewport: { width: number; height: number; padding?: number } = { width: 560, height: 420, padding: 32 }
): PortalPreviewLayout => {
    const nodes = snapshot?.nodes ?? [];
    const edges = snapshot?.edges ?? [];

    if (!nodes.length) return { nodes: [], edges: [] };

    const padding = viewport.padding ?? 32;
    const xs = nodes.map(node => node.position?.x ?? 0);
    const ys = nodes.map(node => node.position?.y ?? 0);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const sourceWidth = Math.max(1, maxX - minX);
    const sourceHeight = Math.max(1, maxY - minY);
    const targetWidth = Math.max(1, viewport.width - padding * 2);
    const targetHeight = Math.max(1, viewport.height - padding * 2);
    const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);

    const offsetX = (viewport.width - sourceWidth * scale) / 2;
    const offsetY = (viewport.height - sourceHeight * scale) / 2;

    const previewNodes: PreviewPoint[] = nodes.map((node) => {
        const x = offsetX + ((node.position?.x ?? 0) - minX) * scale;
        const y = offsetY + ((node.position?.y ?? 0) - minY) * scale;
        return {
            id: String(node.id),
            x: clamp(x, padding / 2, viewport.width - padding / 2),
            y: clamp(y, padding / 2, viewport.height - padding / 2),
            type: node.type ?? 'node'
        };
    });

    const nodeIds = new Set(previewNodes.map(node => node.id));
    const previewEdges: PreviewEdge[] = edges
        .map((edge) => ({
            id: String(edge.id),
            source: String(edge.source),
            target: String(edge.target)
        }))
        .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));

    return {
        nodes: previewNodes,
        edges: previewEdges
    };
};
