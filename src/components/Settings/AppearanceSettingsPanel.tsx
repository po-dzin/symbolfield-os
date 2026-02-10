import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { TogglePill } from '../Common';
import {
    HARMONY_ACCENTS,
    HARMONY_DENSITIES,
    HARMONY_MODES,
    HARMONY_PRESETS,
    HARMONY_SPEEDS,
    HARMONY_TEXTURES
} from '../../core/harmony/HarmonyEngine';
import { getSystemMotionMetrics } from '../../core/ui/SystemMotion';

const AppearanceSettingsPanel = () => {
    const appMode = useAppStore(state => state.appMode);
    const themePreset = useAppStore(state => state.themePreset);
    const themeAccent = useAppStore(state => state.themeAccent);
    const themeDensity = useAppStore(state => state.themeDensity);
    const themeMotion = useAppStore(state => state.themeMotion);
    const themeSpeed = useAppStore(state => state.themeSpeed);
    const themeTexture = useAppStore(state => state.themeTexture);
    const themeIntensity = useAppStore(state => state.themeIntensity);
    const themeModeSource = useAppStore(state => state.themeModeSource);
    const themeModeOverride = useAppStore(state => state.themeModeOverride);
    const setThemeOption = useAppStore(state => state.setThemeOption);
    const motionMetrics = React.useMemo(
        () => getSystemMotionMetrics(themeMotion, themeSpeed),
        [themeMotion, themeSpeed]
    );

    const resolvedMode = themeModeSource === 'auto' ? appMode : themeModeOverride;

    const onModeLayerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'Tab') return;
        event.preventDefault();
        const ids = HARMONY_MODES.map(mode => mode.id);
        const current = Math.max(0, ids.indexOf(resolvedMode));
        const direction = event.shiftKey ? -1 : 1;
        const next = (current + direction + ids.length) % ids.length;
        const nextMode = ids[next];
        if (nextMode) {
            setThemeOption('themeModeOverride', nextMode);
        }
    };

    return (
        <section className="space-y-6" data-panel="experimental-ui-sandbox">
            <div>
                <h2 className="text-[var(--semantic-color-text-primary)] text-xl font-medium">Experimental UI Sandbox</h2>
                <p className="text-[var(--semantic-color-text-secondary)] text-sm mt-1">
                    Harmony controller with bounded freedom: deterministic presets and constrained ratios.
                </p>
            </div>

            <div className="glass-panel p-6 space-y-8">
                <div className="space-y-4">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--semantic-color-text-muted)]">System Layer</h3>
                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                        <span>Auto-sync with current system mode</span>
                        <TogglePill
                            checked={themeModeSource === 'auto'}
                            onToggle={() => {
                                if (themeModeSource === 'auto') {
                                    setThemeOption('themeModeOverride', appMode);
                                } else {
                                    setThemeOption('themeModeSource', 'auto');
                                }
                            }}
                        />
                    </div>
                    <div
                        role="tablist"
                        tabIndex={0}
                        onKeyDown={onModeLayerKeyDown}
                        className="flex items-center gap-[var(--component-capsule-gap)] ui-capsule-default p-[var(--component-capsule-pad)] ui-shape-pill bg-[var(--semantic-color-text-primary)]/5"
                    >
                        {HARMONY_MODES.map((mode) => {
                            const active = resolvedMode === mode.id;
                            return (
                                <button
                                    key={mode.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => setThemeOption('themeModeOverride', mode.id)}
                                    data-state={active ? 'active' : 'inactive'}
                                    className="ui-selectable ui-shape-pill ui-capsule-default-item px-3 text-xs"
                                >
                                    {mode.label}
                                </button>
                            );
                        })}
                    </div>
                    <div className="text-[11px] text-[var(--semantic-color-text-muted)]">
                        Source: <span className="uppercase text-[var(--semantic-color-text-secondary)]">{themeModeSource}</span>
                        {' · '}
                        Effective layer: <span className="uppercase text-[var(--semantic-color-text-secondary)]">{resolvedMode}</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--semantic-color-text-muted)]">Preset Compiler</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {HARMONY_PRESETS.map((preset) => (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() => setThemeOption('themePreset', preset.id)}
                                data-state={themePreset === preset.id ? 'active' : 'inactive'}
                                className="ui-selectable ui-shape-soft min-h-[var(--component-button-height-lg)] px-3 py-2 text-left"
                            >
                                <div className="text-sm text-[var(--semantic-color-text-primary)]">{preset.label}</div>
                                <div className="text-[11px] text-[var(--semantic-color-text-muted)] mt-0.5">{preset.description}</div>
                            </button>
                        ))}
                    </div>
                    <div className="text-[11px] text-[var(--semantic-color-text-muted)]">
                        Current app mode: <span className="text-[var(--semantic-color-text-secondary)] uppercase">{appMode}</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--semantic-color-text-muted)]">Accent Budget</h3>
                    <div className="flex items-center gap-3 flex-wrap">
                        {HARMONY_ACCENTS.map((accent) => (
                            <button
                                key={accent.id}
                                type="button"
                                onClick={() => setThemeOption('themeAccent', accent.id)}
                                title={accent.label}
                                data-state={themeAccent === accent.id ? 'active' : 'inactive'}
                                className="w-8 h-8 rounded-full border-2 border-transparent hover:scale-105 transition-transform"
                                style={{
                                    backgroundColor: accent.hex,
                                    borderColor: themeAccent === accent.id ? 'var(--semantic-color-text-primary)' : 'transparent'
                                }}
                            />
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--semantic-color-text-muted)]">Matrix Axes</h3>

                    <div className="space-y-2">
                        <div className="text-xs text-[var(--semantic-color-text-muted)]">Density</div>
                        <div className="flex items-center gap-2">
                            {HARMONY_DENSITIES.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setThemeOption('themeDensity', item.id)}
                                    data-state={themeDensity === item.id ? 'active' : 'inactive'}
                                    className="ui-selectable ui-shape-pill ui-capsule-compact-item px-3 text-xs"
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="text-xs text-[var(--semantic-color-text-muted)]">Texture</div>
                        <div className="flex items-center gap-2">
                            {HARMONY_TEXTURES.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setThemeOption('themeTexture', item.id)}
                                    data-state={themeTexture === item.id ? 'active' : 'inactive'}
                                    className="ui-selectable ui-shape-pill ui-capsule-compact-item px-3 text-xs"
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="text-xs text-[var(--semantic-color-text-muted)]">System Speed</div>
                        <div className="flex items-center gap-2">
                            {HARMONY_SPEEDS.map((speed) => (
                                <button
                                    key={speed.id}
                                    type="button"
                                    onClick={() => setThemeOption('themeSpeed', speed.id)}
                                    data-state={themeSpeed === speed.id ? 'active' : 'inactive'}
                                    className="ui-selectable ui-shape-pill ui-capsule-compact-item px-3 text-xs"
                                >
                                    {speed.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                        <span>Reduce Motion (50% slower)</span>
                        <TogglePill
                            checked={themeMotion === 'reduce'}
                            onToggle={() => setThemeOption('themeMotion', themeMotion === 'reduce' ? 'normal' : 'reduce')}
                        />
                    </div>
                    <div className="text-[11px] text-[var(--semantic-color-text-muted)]">
                        Unified motion base: {motionMetrics.baseMs}ms · Drawer close delay: {motionMetrics.drawerCloseDelayMs}ms · Speed: {motionMetrics.speed}x
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                            <span>Harmonic Intensity</span>
                            <span className="text-xs opacity-70">{Math.round(themeIntensity * 100)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={themeIntensity}
                            onChange={(event) => setThemeOption('themeIntensity', Number(event.target.value))}
                            className="w-full h-1 bg-[var(--semantic-color-bg-surface)] rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--semantic-color-action-primary)]"
                        />
                    </div>
                </div>
            </div>

            <div className="text-xs text-[var(--semantic-color-text-muted)] p-2">
                Manual mode can be switched by click or Tab in System Layer; auto mode follows deep/flow/luma.
            </div>
        </section>
    );
};

export default AppearanceSettingsPanel;
