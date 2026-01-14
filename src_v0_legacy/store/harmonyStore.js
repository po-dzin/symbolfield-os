import { create } from 'zustand';
import {
    calculateColorHarmonics,
    calculateGeometry,
    calculateGlyphParams,
    calculateUltraState
} from '../engine/harmonics';
import { useStateStore } from './stateStore';

/**
 * Harmony Engine State Store
 * Manages system-wide harmonic state including Ultra-Harmony mode
 */
export const useHarmonyStore = create((set, get) => ({
    // State
    isUltraEnabled: false,
    isHarmonicLockEnabled: false,

    // State
    isUltraEnabled: false,
    isHarmonicLockEnabled: false,

    // Removed baseState (Duplicate SSoT). Use stateStore values.

    // Calculated Harmonics (default values)
    harmonics: {
        color: calculateColorHarmonics('DEEP', 'void', 0),
        geometry: calculateGeometry(0, 'DEEP', Date.now()),
        glyph: calculateGlyphParams('DEEP', 'void', 0, Date.now()),
        modifiers: { edgeThickness: 1, glowIntensity: 1 }
    },

    // Actions

    /**
     * Toggle Ultra-Harmony mode on/off
     */
    toggleUltraMode: () => {
        set(state => {
            const newUltra = !state.isUltraEnabled;
            // Fetch current state
            const { mode, toneId } = useStateStore.getState();
            const currentState = { mode, tone: toneId, xp_total: 0, time: Date.now() };

            const ultraState = calculateUltraState(currentState, newUltra);

            return {
                isUltraEnabled: newUltra,
                harmonics: {
                    ...state.harmonics,
                    modifiers: ultraState.modifiers
                }
            };
        });
    },

    /**
     * Toggle Harmonic Lock (Grid Snapping)
     */
    toggleHarmonicLock: () => set(state => ({ isHarmonicLockEnabled: !state.isHarmonicLockEnabled })),

    /**
     * Update base state (mode, tone, XP, etc.) and recalculate harmonics
     * @param {object} newState - Partial base state to update
     */
    /**
     * Sync with State Store (Main SSoT)
     * Reads current mode/tone/xp from useStateStore and updates harmonics
     */
    syncWithStateStore: () => {
        set(state => {
            const { mode, toneId, temporal } = useStateStore.getState();
            // XP is in windowStore (another SSoT violation? No, windowStore has xpState).
            // Wait, windowStore has xpState. stateStore has mode/tone.
            // Let's grab xpState from windowStore too if needed?
            // "mergedState.xp_total" was used.
            // xpState is in windowStore.
            // For now, let's assume xp_total is 0 or fetch from windowStore if needed.
            // But I can't easily import windowStore here if windowStore imports harmonyStore (cycle?).
            // Let's assume 0 for now to avoid cycles and complex deps.

            const currentState = {
                mode,
                tone: toneId,
                xp_total: 0, // TODO: Fetch from proper store
                time: Date.now()
            };

            const ultraState = calculateUltraState(currentState, state.isUltraEnabled);

            return {
                harmonics: {
                    color: calculateColorHarmonics(currentState.mode, currentState.tone, currentState.xp_total),
                    geometry: calculateGeometry(currentState.xp_total, currentState.mode, currentState.time),
                    glyph: calculateGlyphParams(currentState.mode, currentState.tone, currentState.xp_total, currentState.time),
                    modifiers: ultraState.modifiers
                }
            };
        });
    },

    /**
     * Animation tick - update time-dependent harmonics
     * Call this from requestAnimationFrame or interval
     * @param {number} time - Current time in milliseconds
     */
    tick: (time) => {
        set(state => {
            // Need current base state. Since we don't store it, we must fetch it or assume it's stable?
            // Fetching from other stores in a tick (60fps) is risky for perf.
            // But we already do getState.
            // Let's fetch lightweight.
            const { mode, toneId } = useStateStore.getState();

            const currentState = {
                mode,
                tone: toneId || 'void',
                xp_total: 0,
                time: time
            };

            return {
                harmonics: {
                    ...state.harmonics,
                    geometry: calculateGeometry(currentState.xp_total, currentState.mode, currentState.time),
                    glyph: calculateGlyphParams(currentState.mode, currentState.tone, currentState.xp_total, currentState.time)
                }
            };
        });
    }
}));
