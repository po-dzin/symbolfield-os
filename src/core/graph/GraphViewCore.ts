export type Point2D = { x: number; y: number };

export type GraphViewport = {
    width: number;
    height: number;
};

export type GraphViewBox = {
    x: number;
    y: number;
    w: number;
    h: number;
};

export type GraphCamera = {
    x: number;
    y: number;
    pan: Point2D;
    zoom: number;
};

type CameraInput = Partial<Pick<GraphCamera, 'x' | 'y' | 'pan' | 'zoom'>>;
type ViewBoxInput = Partial<GraphViewBox>;
type ViewportInput = Partial<GraphViewport>;

const DEFAULT_VIEWBOX: GraphViewBox = { x: -700, y: -700, w: 1400, h: 1400 };
const DEFAULT_VIEWPORT: GraphViewport = { width: 1400, height: 1400 };
const DEFAULT_CAMERA: GraphCamera = { x: 0, y: 0, pan: { x: 0, y: 0 }, zoom: 1 };

const toFinite = (value: unknown, fallback: number): number => (
    typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

const clamp = (value: number, min: number, max: number): number => (
    Math.max(min, Math.min(max, value))
);

const normalizeViewport = (input?: ViewportInput): GraphViewport => {
    const width = Math.max(1, toFinite(input?.width, DEFAULT_VIEWPORT.width));
    const height = Math.max(1, toFinite(input?.height, DEFAULT_VIEWPORT.height));
    return { width, height };
};

const normalizeViewBox = (input?: ViewBoxInput): GraphViewBox => {
    const w = Math.max(1, toFinite(input?.w, DEFAULT_VIEWBOX.w));
    const h = Math.max(1, toFinite(input?.h, DEFAULT_VIEWBOX.h));
    return {
        x: toFinite(input?.x, DEFAULT_VIEWBOX.x),
        y: toFinite(input?.y, DEFAULT_VIEWBOX.y),
        w,
        h
    };
};

const normalizeCamera = (input?: CameraInput, viewportInput?: ViewportInput): GraphCamera => {
    const viewport = normalizeViewport(viewportInput);
    const zoom = Math.max(0.0001, toFinite(input?.zoom, DEFAULT_CAMERA.zoom));
    const panX = toFinite(input?.pan?.x, DEFAULT_CAMERA.pan.x);
    const panY = toFinite(input?.pan?.y, DEFAULT_CAMERA.pan.y);
    const hasCenter = Number.isFinite(input?.x) && Number.isFinite(input?.y);

    if (hasCenter) {
        const x = toFinite(input?.x, DEFAULT_CAMERA.x);
        const y = toFinite(input?.y, DEFAULT_CAMERA.y);
        const pan = {
            x: viewport.width / 2 - (x * zoom),
            y: viewport.height / 2 - (y * zoom)
        };
        return { x, y, pan, zoom };
    }

    const x = (viewport.width / 2 - panX) / zoom;
    const y = (viewport.height / 2 - panY) / zoom;
    return { x, y, pan: { x: panX, y: panY }, zoom };
};

export const cameraFromViewBox = (
    viewBoxInput?: ViewBoxInput,
    viewportInput?: ViewportInput,
    limits?: { minZoom?: number; maxZoom?: number }
): GraphCamera => {
    const viewBox = normalizeViewBox(viewBoxInput);
    const viewport = normalizeViewport(viewportInput);
    const minZoom = toFinite(limits?.minZoom, 0.1);
    const maxZoom = toFinite(limits?.maxZoom, 8);

    const zoomX = viewport.width / viewBox.w;
    const zoomY = viewport.height / viewBox.h;
    const zoom = clamp(Math.min(zoomX, zoomY), minZoom, maxZoom);
    const x = viewBox.x + viewBox.w / 2;
    const y = viewBox.y + viewBox.h / 2;
    const pan = {
        x: viewport.width / 2 - (x * zoom),
        y: viewport.height / 2 - (y * zoom)
    };

    return { x, y, pan, zoom };
};

export const viewBoxFromCamera = (
    cameraInput?: CameraInput,
    viewportInput?: ViewportInput
): GraphViewBox => {
    const viewport = normalizeViewport(viewportInput);
    const camera = normalizeCamera(cameraInput, viewport);

    const w = viewport.width / camera.zoom;
    const h = viewport.height / camera.zoom;
    return {
        x: camera.x - w / 2,
        y: camera.y - h / 2,
        w,
        h
    };
};

export const screenToWorld = (
    point: Point2D,
    cameraInput?: CameraInput,
    viewportInput?: ViewportInput
): Point2D => {
    const viewport = normalizeViewport(viewportInput);
    const camera = normalizeCamera(cameraInput, viewport);
    return {
        x: (point.x - viewport.width / 2) / camera.zoom + camera.x,
        y: (point.y - viewport.height / 2) / camera.zoom + camera.y
    };
};

export const worldToScreen = (
    point: Point2D,
    cameraInput?: CameraInput,
    viewportInput?: ViewportInput
): Point2D => {
    const viewport = normalizeViewport(viewportInput);
    const camera = normalizeCamera(cameraInput, viewport);
    return {
        x: (point.x - camera.x) * camera.zoom + viewport.width / 2,
        y: (point.y - camera.y) * camera.zoom + viewport.height / 2
    };
};
