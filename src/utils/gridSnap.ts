import { GRID_METRICS } from './layoutMetrics';

export const snapValueToGrid = (value: number, cell = GRID_METRICS.cell): number =>
    Math.round(value / cell) * cell;

export const snapPointToGrid = (point: { x: number; y: number }, cell = GRID_METRICS.cell) => ({
    x: snapValueToGrid(point.x, cell),
    y: snapValueToGrid(point.y, cell)
});

