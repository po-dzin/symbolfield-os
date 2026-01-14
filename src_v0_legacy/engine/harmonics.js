/**
 * Harmony Engine - Core Logic v0.1
 * Implements the Unified SymbolField Harmonic Specification
 */

// --- Constants ---

export const CONSTANTS = {
    PHI: 1.61803398875,
    PI: Math.PI,
    E: Math.E,
    U: 8, // Base Unit in pixels

    // Window Grid (34U x 21U)
    WINDOW: {
        BASE_W: 34 * 8, // 272px
        BASE_H: 21 * 8  // 168px
    }
};

/**
 * Convert grid units to pixels
 * @param {number} u - Grid units
 * @returns {number} Pixels
 */
export const toGrid = (u) => u * CONSTANTS.U;

/**
 * Snap value to nearest grid unit (U=8px)
 * @param {number} value - Value to snap
 * @returns {number} Snapped value
 */
export const snapToGrid = (value) => Math.round(value / CONSTANTS.U) * CONSTANTS.U;

// Mode Luminance Baselines

// Mode Luminance Baselines
export const MODE_LUMA = {
    DEEP: 6,
    FLOW: 12,
    LUMA: 86
};

// Mode Saturation Baselines
export const MODE_SAT = {
    DEEP: 8,
    FLOW: 8,
    LUMA: 35
};

// --- Helper Functions ---

/**
 * Clamp value between min and max
 */
export const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

// --- Color Engine ---

/**
 * Calculate color harmonics based on mode, tone, and XP
 * @param {string} mode - 'DEEP' | 'FLOW' | 'LUMA'
 * @param {string} toneId - Tone identifier (e.g., 'void', 'joy', etc.)
 * @param {number} xpTotal - Total XP value
 * @returns {object} Color harmonics { mode, tone, xp, glow }
 */
export const calculateColorHarmonics = (mode, toneId, xpTotal = 0) => {
    // 2.1 Mode Baselines
    const L_m = MODE_LUMA[mode] || MODE_LUMA.DEEP;
    const S_m = MODE_SAT[mode] || MODE_SAT.DEEP;

    // 2.2 Tone (Emo-Accent)
    // L_t = clamp(L_m + 50, 60, 72)
    const L_t = clamp(L_m + 50, 60, 72);

    // S_t = S_m + Delta_S_t (30-60%)
    // Using base delta of 40% for now
    const delta_S_t = 40;
    const S_t = S_m + delta_S_t;

    // 2.3 XP Colors
    // L_i = L_t - 3
    const L_i = L_t - 3;
    // S_i = 0.9 * S_t
    const S_i = 0.9 * S_t;

    // 2.4 Glow
    // L_glow = L_i + 12
    const L_glow = L_i + 12;
    // S_glow = S_i + 15%
    const S_glow = S_i + 15;

    return {
        mode: { luma: L_m, sat: S_m },
        tone: { luma: L_t, sat: S_t },
        xp: { luma: L_i, sat: S_i },
        glow: { luma: L_glow, sat: S_glow }
    };
};

// --- Geometry Engine ---

/**
 * Calculate geometric properties (radius, pulsation) based on XP, mode, and time
 * @param {number} xpValue - XP value for this node
 * @param {string} mode - 'DEEP' | 'FLOW' | 'LUMA'
 * @param {number} time - Current time in milliseconds
 * @returns {object} Geometry harmonics { baseRadius, currentRadius, pulseFrequency, pulseAmplitude }
 */
export const calculateGeometry = (xpValue, mode, time) => {
    // 3.1 Orbit Radius
    // r_i = r_0 + alpha * sqrt(x_i)
    // Spec: Small=3U(24px), Medium=5U(40px), Large=8U(64px)
    // Base radius (XP=0) = Small = 3U
    const r_0 = 3 * CONSTANTS.U; // 24px
    const alpha = 0.5; // Growth coefficient (tuned for reasonable growth)
    const r_i = r_0 + alpha * Math.sqrt(xpValue);

    // 3.3 Pulsation
    // radius_i(t) = r_i * [1 + amp_i * sin(2*PI*f*t + phi_i)]

    // Frequency based on mode (breathing rate)
    // Deep: Slow (0.1Hz = 10s cycle), Flow: Medium (0.2Hz = 5s), Luma: Fast (0.3Hz = 3.33s)
    const f_0 = mode === 'DEEP' ? 0.1 : mode === 'FLOW' ? 0.2 : 0.3;

    // Amplitude based on XP
    // amp_i = a_0 + mu * x_i
    const a_0 = 0.05; // 5% base pulse
    const mu = 0.001; // Growth coefficient
    const amp_i = a_0 + mu * xpValue;

    // Phase (can be random or based on ID, using 0 for now)
    const phi_i = 0;

    // Calculate current radius with pulsation
    const pulsationFactor = 1 + amp_i * Math.sin(2 * Math.PI * f_0 * (time / 1000) + phi_i);
    const currentRadius = r_i * pulsationFactor;

    return {
        baseRadius: r_i,
        currentRadius: currentRadius,
        pulseFrequency: f_0,
        pulseAmplitude: amp_i
    };
};

// --- Glyph Engine ---

/**
 * Calculate glyph visual parameters based on mode, tone, XP, and time
 * @param {string} mode - 'DEEP' | 'FLOW' | 'LUMA'
 * @param {string} toneId - Tone identifier
 * @param {number} xpValue - XP value
 * @param {number} time - Current time in milliseconds
 * @returns {object} Glyph parameters { w, c, b, phi }
 */
export const calculateGlyphParams = (mode, toneId, xpValue, time) => {
    // 5.1 Mode → Glyph
    let w = 1.0; // Thickness
    let c = 0.0; // Curvature
    let b = 0.0; // Breaks
    let phi = 0.0; // Rotation (radians)

    if (mode === 'DEEP') {
        w = 1.5; // Thicker lines
        b = 0.3; // More breaks (fragmented)
    } else if (mode === 'FLOW') {
        c = 0.8; // High curvature (flowing)
        w = 0.8; // Thinner lines
    } else if (mode === 'LUMA') {
        b = 0.1; // Minimal breaks (clean)
        // phi rotates over time
        phi = (time / 1000) * 0.5; // 0.5 rad/sec rotation
    }

    // 5.2 Tone → Glyph (thickness modulation by attention)
    // w = w_0 * (1 + kappa * Attention)
    // Simplified: using constant attention of 0.5
    const attention = 0.5;
    const kappa = 0.2;
    w = w * (1 + kappa * attention);

    // 5.3 XP → Glyph (rotation speed increases with XP)
    // phi_i(t) = phi_0 + omega * x_i * t
    const omega = 0.01; // Rotation coefficient
    phi += omega * xpValue * (time / 1000);

    return {
        w,      // Thickness
        c,      // Curvature
        b,      // Breaks
        phi     // Rotation (radians)
    };
};

// --- Ultra-Harmony Engine ---

// Ultra-Harmony Influence Matrix H[a,b]
// Rows: Source (Influencer), Cols: Target (Influenced)
// Order: Mode, Tone, Glyph, XP, Time, Graph
export const INFLUENCE_MATRIX = {
    mode: { mode: 1.0, tone: 0.8, glyph: 0.6, xp: 0.2, time: 0.3, graph: 0.2 },
    tone: { mode: 0.2, tone: 1.0, glyph: 0.5, xp: 0.4, time: 0.3, graph: 0.1 },
    glyph: { mode: 0.1, tone: 0.2, glyph: 1.0, xp: 0.2, time: 0.1, graph: 0.4 },
    xp: { mode: 0.1, tone: 0.3, glyph: 0.3, xp: 1.0, time: 0.6, graph: 0.5 },
    time: { mode: 0.1, tone: 0.2, glyph: 0.2, xp: 0.5, time: 1.0, graph: 0.4 },
    graph: { mode: 0.1, tone: 0.2, glyph: 0.3, xp: 0.4, time: 0.4, graph: 1.0 }
};

/**
 * Calculate Ultra-Harmony state with cross-system influences
 * @param {object} baseState - Base state { mode, tone, xp_total, time }
 * @param {boolean} isUltraEnabled - Whether Ultra-Harmony mode is active
 * @returns {object} State with modifiers { ...baseState, modifiers }
 */
export const calculateUltraState = (baseState, isUltraEnabled) => {
    if (!isUltraEnabled) {
        return {
            ...baseState,
            modifiers: { edgeThickness: 1, glowIntensity: 1 }
        };
    }

    // Apply influence matrix logic
    // For v0.1: Tone influences Graph (edge thickness), XP influences glow

    const { mode, tone, xp_total } = baseState;

    // Tone → Graph influence
    // If tone is active (not void), increase edge thickness
    const toneInfluence = (tone && tone !== 'void')
        ? INFLUENCE_MATRIX.tone.graph
        : 0;
    const edgeThicknessMultiplier = 1 + toneInfluence;

    // XP → Mode/Glow influence
    // Higher XP = stronger glow
    const xpInfluence = Math.min(xp_total / 1000, 1) * INFLUENCE_MATRIX.xp.mode;
    const glowIntensityMultiplier = 1 + xpInfluence;

    return {
        ...baseState,
        modifiers: {
            edgeThickness: edgeThicknessMultiplier,
            glowIntensity: glowIntensityMultiplier
        }
    };
};

