import { create } from 'zustand';
import type { Position } from '../core/types';
import { cameraFromViewBox, viewBoxFromCamera, type GraphViewBox } from '../core/graph/GraphViewCore';

type Viewport = {
    width: number;
    height: number;
};

type StationCameraState = {
    pan: Position;
    zoom: number;
    minZoom: number;
    maxZoom: number;
    setPan: (pan: Position) => void;
    setZoom: (zoom: number) => void;
    updatePan: (dx: number, dy: number) => void;
    zoomAt: (clientX: number, clientY: number, delta: number, rect: DOMRect) => void;
    centerOn: (worldX: number, worldY: number, viewportWidth: number, viewportHeight: number) => void;
    fitToViewBox: (viewBox: GraphViewBox, viewport: Viewport) => void;
    getViewBox: (viewport: Viewport) => GraphViewBox;
    reset: () => void;
};

const clampZoom = (value: number, min: number, max: number): number => (
    Math.max(min, Math.min(max, value))
);

export const useStationCameraStore = create<StationCameraState>((set, get) => ({
    pan: { x: 0, y: 0 },
    zoom: 1,
    minZoom: 0.25,
    maxZoom: 2.6,

    setPan: (pan) => set({ pan }),

    setZoom: (zoom) => set(state => ({
        zoom: clampZoom(zoom, state.minZoom, state.maxZoom)
    })),

    updatePan: (dx, dy) => set(state => ({
        pan: { x: state.pan.x + dx, y: state.pan.y + dy }
    })),

    zoomAt: (clientX, clientY, delta, rect) => {
        const state = get();
        const factor = delta > 0 ? 0.9 : 1.1;
        const nextZoom = clampZoom(state.zoom * factor, state.minZoom, state.maxZoom);

        const localX = clientX - rect.left;
        const localY = clientY - rect.top;
        const worldX = (localX - state.pan.x) / state.zoom;
        const worldY = (localY - state.pan.y) / state.zoom;

        set({
            zoom: nextZoom,
            pan: {
                x: localX - worldX * nextZoom,
                y: localY - worldY * nextZoom
            }
        });
    },

    centerOn: (worldX, worldY, viewportWidth, viewportHeight) => {
        const zoom = get().zoom;
        set({
            pan: {
                x: viewportWidth / 2 - worldX * zoom,
                y: viewportHeight / 2 - worldY * zoom
            }
        });
    },

    fitToViewBox: (viewBox, viewport) => {
        const camera = cameraFromViewBox(viewBox, viewport, {
            minZoom: get().minZoom,
            maxZoom: get().maxZoom
        });
        set({ pan: camera.pan, zoom: camera.zoom });
    },

    getViewBox: (viewport) => {
        const state = get();
        return viewBoxFromCamera({ pan: state.pan, zoom: state.zoom }, viewport);
    },

    reset: () => set({ pan: { x: 0, y: 0 }, zoom: 1 })
}));
