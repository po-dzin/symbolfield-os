import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { TogglePill } from '../Common';

const THEME_ACCENTS = [
    { id: 'gold', label: 'Gold', hex: '#D4AF37' },
    { id: 'rose', label: 'Rose', hex: '#E09F9F' },
    { id: 'sage', label: 'Sage', hex: '#9CAD98' },
    { id: 'lavender', label: 'Lavender', hex: '#CDBEFF' },
    { id: 'cyan', label: 'Cyan', hex: '#6FE4FF' },
    { id: 'peach', label: 'Peach', hex: '#FFB89C' },
    { id: 'taupe', label: 'Taupe', hex: '#B8B2A6' },
];

/**
 * Appearance Settings Panel
 * Part of the SFOS semiotic-visual brand system.
 * Controls: Transparent Crystal (glass blur), Film Grain, Glow Strength, Accent Color
 */
const AppearanceSettingsPanel = () => {
    const themeGlass = useAppStore(state => state.themeGlass);
    const themeNoise = useAppStore(state => state.themeNoise);
    const themeAccent = useAppStore(state => state.themeAccent);
    const themeGlowStrength = useAppStore(state => state.themeGlowStrength);
    const setThemeOption = useAppStore(state => state.setThemeOption);

    return (
        <section className="space-y-6">
            <div>
                <h2 className="text-[var(--semantic-color-text-primary)] text-xl font-medium">Appearance</h2>
                <p className="text-[var(--semantic-color-text-secondary)] text-sm mt-1">Customize visual warmth and effects.</p>
            </div>

            <div className="glass-panel p-6 space-y-8">
                {/* Effects Group */}
                <div className="space-y-4">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--semantic-color-text-muted)]">Visual Effects</h3>

                    <div className="flex items-center justify-between">
                        <span className="text-[13px] text-[var(--semantic-color-text-secondary)]">Transparent Crystal</span>
                        <TogglePill checked={themeGlass} onToggle={() => setThemeOption('themeGlass', !themeGlass)} />
                    </div>

                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                        <span>Film Grain</span>
                        <TogglePill checked={themeNoise} onToggle={() => setThemeOption('themeNoise', !themeNoise)} />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                            <span>Glow Strength</span>
                            <span className="text-xs opacity-60">{(themeGlowStrength * 100).toFixed(0)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={themeGlowStrength}
                            onChange={(e) => setThemeOption('themeGlowStrength', parseFloat(e.target.value))}
                            className="w-full h-1 bg-[var(--semantic-color-bg-surface)] rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--semantic-color-action-primary)]"
                        />
                    </div>
                </div>

                {/* Accent Colors */}
                <div className="space-y-4">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--semantic-color-text-muted)]">Accent Color</h3>
                    <div className="flex items-center gap-3 flex-wrap">
                        {THEME_ACCENTS.map(accent => (
                            <button
                                key={accent.id}
                                onClick={() => setThemeOption('themeAccent', accent.id)}
                                title={accent.label}
                                className={`w-8 h-8 rounded-full border-2 transition-all relative ${themeAccent === accent.id
                                    ? 'border-[var(--semantic-color-text-primary)] scale-110'
                                    : 'border-transparent hover:scale-105'
                                    }`}
                                style={{ backgroundColor: accent.hex }}
                            >
                                {themeAccent === accent.id && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-black/50" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="text-xs text-[var(--semantic-color-text-muted)] p-2">
                Note: Some changes may require a refresh or navigation to fully apply to all system components.
            </div>
        </section>
    );
};

export default AppearanceSettingsPanel;
