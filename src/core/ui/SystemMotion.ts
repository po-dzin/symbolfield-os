export type SystemMotionMode = 'normal' | 'reduce';
export type SystemMotionSpeed = 0.5 | 1 | 2;

export interface SystemMotionMetrics {
    baseMs: number;
    multiplier: number;
    speed: SystemMotionSpeed;
    drawerCloseDelayMs: number;
    panelCloseDelayMs: number;
    railCloseDelayMs: number;
    cameraFocusSettleMs: number;
    cameraScopeSettleMs: number;
    cameraUndoSettleMs: number;
    cameraFitDelayMs: number;
}

const SYSTEM_MOTION_BASE_MS = 220;
const REDUCED_MOTION_MULTIPLIER = 1.5; // 50% slower

const resolveMultiplier = (mode: SystemMotionMode): number =>
    mode === 'reduce' ? REDUCED_MOTION_MULTIPLIER : 1;

const resolveSpeed = (speed: number | undefined): SystemMotionSpeed => {
    if (speed === 0.5 || speed === 1 || speed === 2) return speed;
    return 1;
};

export const getSystemMotionMetrics = (
    mode: SystemMotionMode = 'normal',
    speed: SystemMotionSpeed = 1
): SystemMotionMetrics => {
    const resolvedSpeed = resolveSpeed(speed);
    const multiplier = resolveMultiplier(mode) / resolvedSpeed;
    const baseMs = Math.round(SYSTEM_MOTION_BASE_MS * multiplier);

    return {
        baseMs,
        multiplier,
        speed: resolvedSpeed,
        drawerCloseDelayMs: baseMs,
        panelCloseDelayMs: baseMs,
        railCloseDelayMs: baseMs,
        cameraFocusSettleMs: Math.round(baseMs * 3.2),
        cameraScopeSettleMs: Math.round(baseMs * 1.9),
        cameraUndoSettleMs: Math.round(baseMs * 1.36),
        cameraFitDelayMs: Math.round(baseMs * 0.55)
    };
};

export const buildSystemMotionCssVars = (
    mode: SystemMotionMode = 'normal',
    speed: SystemMotionSpeed = 1
): Record<string, string> => {
    const metrics = getSystemMotionMetrics(mode, speed);
    return {
        '--motion-system-speed': `${metrics.speed}`,
        '--motion-system-base-ms': `${metrics.baseMs}ms`,
        '--motion-close-delay-ms': `${metrics.drawerCloseDelayMs}ms`,
        '--motion-rail-close-delay-ms': `${metrics.railCloseDelayMs}ms`,
        '--motion-camera-focus-ms': `${metrics.cameraFocusSettleMs}ms`,
        '--motion-camera-scope-ms': `${metrics.cameraScopeSettleMs}ms`,
        '--motion-camera-undo-ms': `${metrics.cameraUndoSettleMs}ms`,
        '--motion-camera-fit-delay-ms': `${metrics.cameraFitDelayMs}ms`
    };
};
