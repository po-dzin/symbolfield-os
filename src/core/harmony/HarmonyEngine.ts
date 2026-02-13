import { buildSystemMotionCssVars, getSystemMotionMetrics } from '../ui/SystemMotion';

export type HarmonyMode = 'deep' | 'flow' | 'luma';

export type HarmonyPresetId = 'monolith' | 'pulse' | 'halo';
export type HarmonyPresetSelection = HarmonyPresetId | 'auto';

export type HarmonyAccentId = 'gold' | 'rose' | 'sage' | 'lavender' | 'cyan' | 'peach' | 'taupe';
export type HarmonyDensity = 'compact' | 'normal' | 'cozy';
export type HarmonyMotion = 'normal' | 'reduce';
export type HarmonyTexture = 'clean' | 'grain' | 'glass';
export type HarmonySpeed = 0.5 | 1 | 2;

export interface HarmonyMatrix {
    preset: HarmonyPresetSelection;
    accent: HarmonyAccentId;
    density: HarmonyDensity;
    motion: HarmonyMotion;
    speed: HarmonySpeed;
    texture: HarmonyTexture;
    intensity: number;
    mode: HarmonyMode;
}

export interface HarmonyProfile {
    resolvedPreset: HarmonyPresetId;
    palette: {
        accentPrimary: string;
        accentSecondary: string;
        accentTertiary: string;
    };
    textures: {
        glassOpacity: number;
        blurRadiusPx: number;
        noiseOpacity: number;
        glowStrength: number;
    };
    density: {
        spaceScale: number;
        typeScale: number;
        iconScale: number;
        radiusScale: number;
    };
    motion: {
        reduceMotion: boolean;
        durationScale: number;
    };
    sound: {
        profile: 'hush' | 'pulse' | 'spark';
        gain: number;
    };
    cssVars: Record<string, string>;
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const normalized = hex.replace('#', '');
    const full = normalized.length === 3
        ? normalized.split('').map(ch => `${ch}${ch}`).join('')
        : normalized;
    const value = Number.parseInt(full, 16);
    if (Number.isNaN(value)) return { r: 212, g: 175, b: 55 };
    return {
        r: (value >> 16) & 255,
        g: (value >> 8) & 255,
        b: value & 255
    };
};

const rgba = ({ r, g, b }: { r: number; g: number; b: number }, alpha: number): string => (
    `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1).toFixed(3)})`
);

const toLinear = (channel: number): number => {
    const normalized = channel / 255;
    return normalized <= 0.03928
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
};

const readableTextOnAccent = (hex: string): string => {
    const { r, g, b } = hexToRgb(hex);
    const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    return luminance > 0.42 ? '#1F1A14' : '#F5EFE6';
};

const ACCENT_PALETTE: Record<HarmonyAccentId, { a1: string; a2: string; a3: string }> = {
    gold: { a1: '#D4AF37', a2: '#9CAD98', a3: '#E09F9F' },
    rose: { a1: '#E09F9F', a2: '#D4AF37', a3: '#CDBEFF' },
    sage: { a1: '#9CAD98', a2: '#D4AF37', a3: '#6FE4FF' },
    lavender: { a1: '#CDBEFF', a2: '#E09F9F', a3: '#6FE4FF' },
    cyan: { a1: '#6FE4FF', a2: '#9CAD98', a3: '#D4AF37' },
    peach: { a1: '#FFB89C', a2: '#D4AF37', a3: '#E09F9F' },
    taupe: { a1: '#B8B2A6', a2: '#D4AF37', a3: '#9CAD98' }
};

const PRESET_LIBRARY: Record<HarmonyPresetId, {
    glassOpacity: number;
    blurPx: number;
    noise: number;
    glow: number;
    radiusScale: number;
    motionScale: number;
    soundProfile: 'hush' | 'pulse' | 'spark';
}> = {
    monolith: {
        glassOpacity: 0.78,
        blurPx: 14,
        noise: 0.022,
        glow: 0.34,
        radiusScale: 0.95,
        motionScale: 1.05,
        soundProfile: 'hush'
    },
    pulse: {
        glassOpacity: 0.70,
        blurPx: 17,
        noise: 0.030,
        glow: 0.50,
        radiusScale: 1.0,
        motionScale: 1.0,
        soundProfile: 'pulse'
    },
    halo: {
        glassOpacity: 0.64,
        blurPx: 19,
        noise: 0.036,
        glow: 0.62,
        radiusScale: 1.08,
        motionScale: 0.95,
        soundProfile: 'spark'
    }
};

const MODE_TO_PRESET: Record<HarmonyMode, HarmonyPresetId> = {
    deep: 'monolith',
    flow: 'pulse',
    luma: 'halo'
};

const DENSITY_SCALES: Record<HarmonyDensity, number> = {
    compact: 0.93,
    normal: 1,
    cozy: 1.08
};

const TEXTURE_MODIFIERS: Record<HarmonyTexture, { glass: number; blur: number; noise: number }> = {
    clean: { glass: 1.12, blur: 0.82, noise: 0 },
    grain: { glass: 1.0, blur: 0.9, noise: 1.0 },
    glass: { glass: 0.88, blur: 1.05, noise: 0.6 }
};

const isPresetSelection = (value: unknown): value is HarmonyPresetSelection => (
    value === 'auto'
    || value === 'monolith'
    || value === 'pulse'
    || value === 'halo'
);

const isAccent = (value: unknown): value is HarmonyAccentId => (
    value === 'gold'
    || value === 'rose'
    || value === 'sage'
    || value === 'lavender'
    || value === 'cyan'
    || value === 'peach'
    || value === 'taupe'
);

const isDensity = (value: unknown): value is HarmonyDensity => (
    value === 'compact' || value === 'normal' || value === 'cozy'
);

const isMotion = (value: unknown): value is HarmonyMotion => (
    value === 'normal' || value === 'reduce'
);

const isTexture = (value: unknown): value is HarmonyTexture => (
    value === 'clean' || value === 'grain' || value === 'glass'
);

const isSpeed = (value: unknown): value is HarmonySpeed => (
    value === 0.5 || value === 1 || value === 2
);

const isMode = (value: unknown): value is HarmonyMode => (
    value === 'deep' || value === 'flow' || value === 'luma'
);

export const defaultHarmonyMatrix = (mode: HarmonyMode = 'deep'): HarmonyMatrix => ({
    preset: 'auto',
    accent: 'taupe',
    density: 'normal',
    motion: 'normal',
    speed: 1,
    texture: 'grain',
    intensity: 0.5,
    mode
});

export const normalizeHarmonyMatrix = (input: Partial<HarmonyMatrix> | undefined, fallbackMode: HarmonyMode = 'deep'): HarmonyMatrix => {
    const base = defaultHarmonyMatrix(fallbackMode);

    return {
        preset: isPresetSelection(input?.preset) ? input.preset : base.preset,
        accent: isAccent(input?.accent) ? input.accent : base.accent,
        density: isDensity(input?.density) ? input.density : base.density,
        motion: isMotion(input?.motion) ? input.motion : base.motion,
        speed: isSpeed(input?.speed) ? input.speed : base.speed,
        texture: isTexture(input?.texture) ? input.texture : base.texture,
        intensity: clamp(typeof input?.intensity === 'number' ? input.intensity : base.intensity, 0, 1),
        mode: isMode(input?.mode) ? input.mode : (isMode(fallbackMode) ? fallbackMode : base.mode)
    };
};

export const resolvePresetForMode = (preset: HarmonyPresetSelection, mode: HarmonyMode): HarmonyPresetId => {
    if (preset === 'auto') return MODE_TO_PRESET[mode];
    return preset;
};

const px = (value: number): string => `${Math.round(value)}px`;

export const buildHarmonyProfile = (rawInput: Partial<HarmonyMatrix>): HarmonyProfile => {
    const matrix = normalizeHarmonyMatrix(rawInput, rawInput.mode ?? 'deep');
    const resolvedPreset = resolvePresetForMode(matrix.preset, matrix.mode);
    const preset = PRESET_LIBRARY[resolvedPreset];
    const accent = ACCENT_PALETTE[matrix.accent];
    const densityScale = DENSITY_SCALES[matrix.density];
    const texture = TEXTURE_MODIFIERS[matrix.texture];
    const t = matrix.intensity;

    const glassOpacity = clamp(preset.glassOpacity * texture.glass * lerp(0.92, 1.06, t), 0.58, 0.92);
    const blurRadiusPx = clamp(preset.blurPx * texture.blur * lerp(0.95, 1.1, t), 12, 20);
    const noiseOpacity = clamp(preset.noise * texture.noise * lerp(0.85, 1.05, t), 0, 0.04);
    const glowStrength = clamp(preset.glow * lerp(0.8, 1.15, t), 0.2, 0.75);

    const spaceScale = clamp(densityScale, 0.92, 1.1);
    const typeScale = clamp(densityScale * lerp(0.97, 1.04, t), 0.93, 1.12);
    const iconScale = clamp(densityScale * lerp(0.95, 1.05, t), 0.9, 1.12);
    const radiusScale = clamp(preset.radiusScale * lerp(0.95, 1.08, t), 0.85, 1.2);

    const systemMotion = getSystemMotionMetrics(matrix.motion, matrix.speed);
    const durationScale = systemMotion.multiplier;

    const soundGain = clamp(lerp(0.22, 0.52, t) * (matrix.motion === 'reduce' ? 0.75 : 1), 0.15, 0.55);
    const accentRgb = hexToRgb(accent.a1);
    const graphEdgeBase = matrix.mode === 'luma'
        ? 'rgba(70, 59, 46, 0.34)'
        : 'rgba(255, 255, 255, 0.34)';
    const graphEdgeStrong = matrix.mode === 'luma'
        ? 'rgba(70, 59, 46, 0.5)'
        : 'rgba(255, 255, 255, 0.52)';
    const graphNodeFill = matrix.mode === 'luma'
        ? 'rgba(58, 47, 34, 0.14)'
        : 'rgba(255, 255, 255, 0.06)';
    const graphNodeStroke = matrix.mode === 'luma'
        ? 'rgba(61, 50, 38, 0.52)'
        : 'rgba(255, 255, 255, 0.36)';
    const graphNodeGlow = matrix.mode === 'luma'
        ? 'rgba(61, 50, 38, 0.24)'
        : 'rgba(255, 255, 255, 0.12)';
    const graphGlyph = matrix.mode === 'luma'
        ? 'rgba(43, 34, 25, 0.94)'
        : 'rgba(255, 255, 255, 0.9)';
    const actionOnPrimary = readableTextOnAccent(accent.a1);

    const cssVars: Record<string, string> = {
        '--primitive-color-accent-gold': accent.a1,
        '--primitive-color-accent-rose': accent.a2,
        '--primitive-color-accent-sage': accent.a3,
        '--semantic-color-action-primary': accent.a1,
        '--semantic-color-action-secondary': accent.a2,
        '--semantic-color-action-tertiary': accent.a3,
        '--semantic-color-action-on-primary': actionOnPrimary,
        '--semantic-color-link': accent.a1,
        '--semantic-color-status-success': accent.a3,
        '--semantic-color-status-warning': accent.a1,
        '--semantic-color-status-info': accent.a2,
        '--theme-border-active': accent.a1,

        '--semantic-color-graph-node-fill': graphNodeFill,
        '--semantic-color-graph-node-stroke': graphNodeStroke,
        '--semantic-color-graph-node-glow': graphNodeGlow,
        '--semantic-color-graph-node-glyph': graphGlyph,
        '--semantic-color-graph-node-active-stroke': rgba(accentRgb, matrix.mode === 'luma' ? 0.85 : 0.92),
        '--semantic-color-graph-edge': graphEdgeBase,
        '--semantic-color-graph-edge-strong': graphEdgeStrong,
        '--semantic-color-graph-edge-active': rgba(accentRgb, matrix.mode === 'luma' ? 0.78 : 0.88),

        '--theme-glass-opacity': `${glassOpacity.toFixed(3)}`,
        '--theme-blur-radius': px(blurRadiusPx),
        '--theme-noise-opacity': `${noiseOpacity.toFixed(3)}`,
        '--theme-glow-strength': `${glowStrength.toFixed(3)}`,

        '--primitive-space-panel-padding': px(24 * spaceScale),
        '--primitive-space-bar-gap': px(12 * spaceScale),
        '--primitive-space-gap-default': px(8 * spaceScale),
        '--primitive-space-gap-dense': px(4 * spaceScale),

        '--primitive-type-body-size': px(14 * typeScale),
        '--primitive-type-body-line': px(20 * typeScale),
        '--primitive-type-small-size': px(12 * typeScale),
        '--primitive-type-small-line': px(16 * typeScale),

        '--primitive-radius-panel': px(24 * radiusScale),
        '--primitive-radius-card': px(14 * radiusScale),
        '--primitive-radius-input': px(12 * radiusScale),

        '--component-button-height-md': px(36 * iconScale),
        '--component-button-height-lg': px(40 * iconScale),
        '--component-hit-icon-min': px(44),

        '--primitive-motion-duration-fast': `${Math.round(120 * durationScale)}ms`,
        '--primitive-motion-duration-normal': `${Math.round(180 * durationScale)}ms`,
        '--primitive-motion-duration-slow': `${Math.round(240 * durationScale)}ms`,

        '--theme-sound-profile': preset.soundProfile,
        '--theme-sound-gain': `${soundGain.toFixed(3)}`,

        ...buildSystemMotionCssVars(matrix.motion, matrix.speed)
    };

    return {
        resolvedPreset,
        palette: {
            accentPrimary: accent.a1,
            accentSecondary: accent.a2,
            accentTertiary: accent.a3
        },
        textures: {
            glassOpacity,
            blurRadiusPx,
            noiseOpacity,
            glowStrength
        },
        density: {
            spaceScale,
            typeScale,
            iconScale,
            radiusScale
        },
        motion: {
            reduceMotion: matrix.motion === 'reduce',
            durationScale
        },
        sound: {
            profile: preset.soundProfile,
            gain: soundGain
        },
        cssVars
    };
};

export const applyHarmonyProfileToRoot = (profile: HarmonyProfile, root: HTMLElement = document.documentElement): void => {
    Object.entries(profile.cssVars).forEach(([name, value]) => {
        root.style.setProperty(name, value);
    });
};

export const HARMONY_PRESETS: Array<{ id: HarmonyPresetSelection; label: string; description: string }> = [
    { id: 'auto', label: 'Auto by State', description: 'Preset follows current mode (deep/flow/luma).' },
    { id: 'monolith', label: 'Monolith', description: 'Dense, stable, low-noise focus.' },
    { id: 'pulse', label: 'Pulse', description: 'Balanced, adaptive, rhythm-forward.' },
    { id: 'halo', label: 'Halo', description: 'Lighter atmosphere with luminous accents.' }
];

export const HARMONY_ACCENTS: Array<{ id: HarmonyAccentId; label: string; hex: string }> = [
    { id: 'gold', label: 'Gold', hex: '#D4AF37' },
    { id: 'rose', label: 'Rose', hex: '#E09F9F' },
    { id: 'sage', label: 'Sage', hex: '#9CAD98' },
    { id: 'lavender', label: 'Lavender', hex: '#CDBEFF' },
    { id: 'cyan', label: 'Cyan', hex: '#6FE4FF' },
    { id: 'peach', label: 'Peach', hex: '#FFB89C' },
    { id: 'taupe', label: 'Taupe', hex: '#B8B2A6' }
];

export const HARMONY_DENSITIES: Array<{ id: HarmonyDensity; label: string }> = [
    { id: 'compact', label: 'Compact' },
    { id: 'normal', label: 'Normal' },
    { id: 'cozy', label: 'Cozy' }
];

export const HARMONY_SPEEDS: Array<{ id: HarmonySpeed; label: string }> = [
    { id: 0.5, label: '0.5x' },
    { id: 1, label: '1x' },
    { id: 2, label: '2x' }
];

export const HARMONY_TEXTURES: Array<{ id: HarmonyTexture; label: string }> = [
    { id: 'clean', label: 'Clean' },
    { id: 'grain', label: 'Grain' },
    { id: 'glass', label: 'Glass' }
];

export const HARMONY_MODES: Array<{ id: HarmonyMode; label: string }> = [
    { id: 'deep', label: 'Deep' },
    { id: 'flow', label: 'Flow' },
    { id: 'luma', label: 'Luma' }
];
