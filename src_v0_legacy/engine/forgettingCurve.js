/**
 * Forgetting Curve System
 * Based on Ebbinghaus Forgetting Curve + Spaced Repetition principles
 * 
 * Provides exponential decay calculations for node aging with temporal scale adaptation
 */

// ==========================================
// AGING THRESHOLDS (Spaced Repetition Intervals)
// ==========================================

/**
 * Time thresholds in HOURS for each time scale
 * Added 1 hour threshold per user request
 */
export const AGING_THRESHOLDS = {
    DAY: {
        fresh: 0,           // 0 hours
        hour: 1,            // 1 hour ⭐ NEW
        young: 4,           // 4 hours
        mature: 12,         // 12 hours
        old: 24,            // 1 day
        ancient: 48         // 2 days
    },
    WEEK: {
        fresh: 0,           // 0 days
        hour: 1,            // 1 hour ⭐ NEW
        young: 24,          // 1 day
        mature: 72,         // 3 days  
        old: 168,           // 1 week (7 days)
        ancient: 336        // 2 weeks (14 days)
    },
    MONTH: {
        fresh: 0,           // 0 days
        hour: 1,            // 1 hour ⭐ NEW
        young: 72,          // 3 days
        mature: 168,        // 1 week (7 days)
        old: 720,           // 1 month (30 days)
        ancient: 1440       // 2 months (60 days)
    },
    YEAR: {
        fresh: 0,           // 0 days
        hour: 1,            // 1 hour ⭐ NEW
        young: 168,         // 1 week (7 days)
        mature: 720,        // 1 month (30 days)
        old: 2160,          // 3 months (90 days)
        ancient: 4320       // 6 months (180 days)
    }
};

// ==========================================
// AGING CURVE CALCULATION
// ==========================================

/**
 * Calculate aging factor with dual-phase curve:
 * Phase 1 (0-60min): Linear decay (unchanged from original)
 * Phase 2 (60min-24h): Exponential decay gradient
 * Phase 3 (24h+): Slower exponential decay
 * 
 * @param {number} ageMs - Age in milliseconds
 * @param {string} timeScale - Current time scale (DAY/WEEK/MONTH/YEAR)
 * @returns {number} - Aging factor (0 = fresh, 1 = ancient)
 */
export const getAgingFactor = (ageMs, timeScale = 'DAY') => {
    const ageMinutes = ageMs / (1000 * 60);
    const ageHours = ageMs / (1000 * 60 * 60);

    // Phase 1: 0-60 minutes (LINEAR - unchanged)
    // Starts fading after 5 minutes, reaches ~0.92 at 60 minutes
    if (ageMinutes < 60) {
        const phase1Factor = Math.min(1, Math.max(0, (ageMinutes - 5) / 55));
        return phase1Factor;
    }

    // Phase 2: 60 minutes - 24 hours (GRADIENT TRANSITION)
    // Smooth exponential transition
    if (ageHours < 24) {
        const t = ageHours - 1; // Time since 1 hour (0-23)
        const S = 12; // Memory strength (half-life ~12 hours)
        const retention = Math.exp(-t / S);
        const phase2Factor = 1 - (retention * 0.5); // Map to 0.5-1.0 range
        return Math.max(0.92, phase2Factor); // Start from phase1 end
    }

    // Phase 3: 24+ hours (SLOW EXPONENTIAL)
    // Use time scale thresholds
    const thresholds = AGING_THRESHOLDS[timeScale];
    const t = ageHours;
    const S = thresholds.old; // Memory strength = "old" threshold
    const retention = Math.exp(-t / S);
    const phase3Factor = 1 - retention;

    return Math.min(1, phase3Factor);
};

// ==========================================
// BRIGHTNESS FACTOR CALCULATION
// ==========================================

/**
 * Calculate brightness factor from aging factor
 * Brightness: 1.0 (fresh) -> 0.4 (ancient)
 * 
 * @param {number} ageFactor - Aging factor (0-1)
 * @returns {number} - Brightness multiplier (0.4-1.0)
 */
export const getBrightnessFactor = (ageFactor) => {
    return 1.0 - (ageFactor * 0.6);
};

// ==========================================
// MILESTONE DETECTION
// ==========================================

/**
 * Detect if node is crossing a milestone threshold
 * Returns milestone info for visual pulse animation
 * 
 * @param {number} ageMs - Age in milliseconds
 * @param {string} timeScale - Current time scale
 * @returns {Object|null} - { milestone: string, intensity: number } or null
 */
export const getMilestone = (ageMs, timeScale = 'DAY') => {
    const thresholds = AGING_THRESHOLDS[timeScale];
    const ageHours = ageMs / (1000 * 60 * 60);

    // Pulse window: ±30 seconds around threshold
    const PULSE_WINDOW_MS = 30 * 1000;

    // Check each threshold
    for (const [key, hours] of Object.entries(thresholds)) {
        if (key === 'fresh') continue; // Skip fresh threshold

        const thresholdMs = hours * 60 * 60 * 1000;
        const diff = Math.abs(ageMs - thresholdMs);

        // Within pulse window?
        if (diff < PULSE_WINDOW_MS) {
            const intensity = 1 - (diff / PULSE_WINDOW_MS);
            return {
                milestone: key,
                intensity,
                thresholdHours: hours
            };
        }
    }

    return null;
};

// ==========================================
// SIZE & BLUR FACTORS
// ==========================================

/**
 * Calculate size factor from aging factor
 * Size: 1.0 (fresh) -> 0.7 (ancient)
 */
export const getSizeFactor = (ageFactor) => {
    return 1.0 - (ageFactor * 0.3);
};

/**
 * Calculate blur amount from aging factor
 * Blur: 0px (fresh) -> 4px (ancient)
 */
export const getBlurAmount = (ageFactor) => {
    return ageFactor * 4;
};

// ==========================================
// JOY ANIMATION (Updated to 8 seconds)
// ==========================================

/**
 * Check if node is in "joyful" state (freshly activated)
 * Updated to 8 seconds per user request
 * 
 * @param {number} timeSinceActivation - Time since activation in ms
 * @returns {boolean}
 */
export const isJoyful = (timeSinceActivation) => {
    return timeSinceActivation < 8000; // 8 seconds
};

/**
 * Calculate joy intensity (1.0 at activation, 0.0 at 8s)
 * 
 * @param {number} timeSinceActivation - Time since activation in ms
 * @returns {number} - Intensity (0-1)
 */
export const getJoyIntensity = (timeSinceActivation) => {
    return Math.max(0, 1 - (timeSinceActivation / 8000));
};
