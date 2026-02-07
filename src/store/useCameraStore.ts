/**
 * useCameraStore.ts
 * Manages the viewport state (pan and zoom).
 */

import { create } from 'zustand';
import type { Position } from '../core/types';

interface CameraStoreState {
    pan: Position;
    zoom: number;
    setPan: (pan: Position) => void;
    setZoom: (zoom: number) => void;
    updatePan: (dx: number, dy: number) => void;
    zoomAt: (clientX: number, clientY: number, delta: number, rect: DOMRect) => void;
    centerOn: (worldX: number, worldY: number, containerWidth: number, containerHeight: number) => void;
    reset: () => void;
}

export const useCameraStore = create<CameraStoreState>((set, get) => ({
    pan: { x: 0, y: 0 },
    zoom: 1,

    setPan: (pan: Position) => set({ pan }),
    setZoom: (zoom: number) => set({ zoom }),

    updatePan: (dx: number, dy: number) => set(state => ({
        pan: { x: state.pan.x + dx, y: state.pan.y + dy }
    })),

    // Zoom at a specific screen point
    zoomAt: (clientX: number, clientY: number, delta: number, rect: DOMRect) => {
        const state = get();
        const factor = Math.exp(-delta * 0.0022);
        if (!Number.isFinite(factor) || factor <= 0) return;
        const newZoom = Math.min(Math.max(state.zoom * factor, 0.25), 2.0); // Clamped 0.25x to 2.0x
        if (Math.abs(newZoom - state.zoom) < 0.0001) return;

        // Calculate world point under cursor to keep it pinned
        const localX = clientX - rect.left;
        const localY = clientY - rect.top;

        const worldX = (localX - state.pan.x) / state.zoom;
        const worldY = (localY - state.pan.y) / state.zoom;

        const newPanX = localX - worldX * newZoom;
        const newPanY = localY - worldY * newZoom;

        set({
            zoom: newZoom,
            pan: { x: newPanX, y: newPanY }
        });
    },

    centerOn: (worldX: number, worldY: number, containerWidth: number, containerHeight: number) => {
        const state = get();
        const zoom = state.zoom;

        // Target pan: centerOfScreen - worldPosScaled
        const newPanX = (containerWidth / 2) - (worldX * zoom);
        const newPanY = (containerHeight / 2) - (worldY * zoom);

        set({
            pan: { x: newPanX, y: newPanY }
        });
    },

    reset: () => set({ pan: { x: 0, y: 0 }, zoom: 1 })
}));
