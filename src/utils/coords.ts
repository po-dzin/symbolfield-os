/**
 * coords.js
 * Utilities for mapping between Screen space and World space.
 */

/**
 * Converts screen coordinates to world coordinates.
 * @param {number} clientX - The X relative to the viewport.
 * @param {number} clientY - The Y relative to the viewport.
 * @param {Object} rect - The BoundingClientRect of the canvas container.
 * @param {Object} camera - { pan: {x, y}, zoom }
 * @returns {Object} { x, y } in world space.
 */
interface CameraState {
    pan: { x: number; y: number };
    zoom: number;
}

export const screenToWorld = (
    clientX: number,
    clientY: number,
    rect: DOMRect,
    camera: CameraState
) => {
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    return {
        x: (localX - camera.pan.x) / camera.zoom,
        y: (localY - camera.pan.y) / camera.zoom
    };
};

/**
 * Converts world coordinates to screen coordinates (relative to container).
 * @param {number} worldX 
 * @param {number} worldY 
 * @param {Object} camera - { pan: {x, y}, zoom }
 * @returns {Object} { x, y } in screen space.
 */
export const worldToScreen = (
    worldX: number,
    worldY: number,
    camera: CameraState
) => {
    return {
        x: worldX * camera.zoom + camera.pan.x,
        y: worldY * camera.zoom + camera.pan.y
    };
};
