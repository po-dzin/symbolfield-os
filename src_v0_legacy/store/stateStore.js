import { create } from 'zustand';

export const MODES = {
    DEEP: { id: 'DEEP', label: 'Deep', icon: '🕳️', tooltip: 'Obsidian Void // Introspection' },
    FLOW: { id: 'FLOW', label: 'Flow', icon: '🌀', tooltip: 'Crystalline Neutral // Balance' },
    LUMA: { id: 'LUMA', label: 'Luma', icon: '🔆', tooltip: 'Sand Luminescence // Connection' }
};

export const TONES = [
    { id: 'coral', color: '#cd8475', lumaColor: '#a85645', label: 'Coral', tooltip: 'Vitality // Coral' },
    { id: 'sand', color: '#cdab75', lumaColor: '#9c7b4f', label: 'Sand', tooltip: 'Warmth // Sand' },
    { id: 'mint', color: '#75cd75', lumaColor: '#4f9c4f', label: 'Mint', tooltip: 'Growth // Mint' },
    { id: 'turquoise', color: '#75cdcd', lumaColor: '#328a8a', label: 'Turquoise', tooltip: 'Clarity // Turquoise' },
    { id: 'sky', color: '#75a1cd', lumaColor: '#457ba8', label: 'Sky', tooltip: 'Serenity // Sky' },
    { id: 'lavender', color: '#8e75cd', lumaColor: '#6a4f9c', label: 'Lavender', tooltip: 'Wisdom // Lavender' },
    { id: 'violet', color: '#a175cd', lumaColor: '#7b4fa1', label: 'Violet', tooltip: 'Mystery // Violet' },
];

// SEM7 Order: • ∣ ○ ⊙ ∴ 𓂀 ∅
export const GLYPHS = [
    { id: 'point', char: '•', label: 'Origin' },
    { id: 'line', char: '∣', label: 'Axis' },
    { id: 'circle', char: '○', label: 'Form' },
    { id: 'sun', char: '⊙', label: 'Essence' },
    { id: 'triad', char: '∴', label: 'Wholeness' },
    { id: 'eye', char: '𓂀', label: 'Vision' },
    { id: 'null', char: '∅', label: 'Void' },
];

export const useStateStore = create((set) => ({
    mode: 'FLOW', // DEEP, FLOW, LUMA
    toneId: 'sky',
    glyphId: 'triad',
    timeScale: 'DAY', // DAY, WEEK, MONTH, YEAR

    setMode: (mode) => set({ mode }),
    setTone: (toneId) => set({ toneId }),
    setGlyph: (id) => set({ glyphId: id }),
    setTimeScale: (scale) => set({ timeScale: scale }),

    // Temporal Navigation (v1)
    // Temporal Navigation (v1)
    temporal: {
        timeWindow: {
            kind: 'DAY',
            from: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD in local time
            to: new Date().toLocaleDateString('en-CA')
        }
    },
    setTimeWindow: (timeWindow) => set(state => ({ temporal: { ...state.temporal, timeWindow } })),

    // Meta-Harmony
    metaHarmony: false,
    setMetaHarmony: (value) => set({ metaHarmony: value }),
}));
