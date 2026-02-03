/**
 * SettingsDrawer.jsx
 * Minimal settings panel for v0.5.
 */

import React from 'react';
import { useAppStore } from '../../store/useAppStore';

const SettingsDrawer = () => {
    const settingsOpen = useAppStore(state => state.settingsOpen);
    const closeSettings = useAppStore(state => state.closeSettings);
    const contextMenuMode = useAppStore(state => state.contextMenuMode);
    const setContextMenuMode = useAppStore(state => state.setContextMenuMode);
    const gridSnapEnabled = useAppStore(state => state.gridSnapEnabled);
    const setGridSnapEnabled = useAppStore(state => state.setGridSnapEnabled);
    const gridStepMul = useAppStore(state => state.gridStepMul);
    const setGridStepMul = useAppStore(state => state.setGridStepMul);
    const showGrid = useAppStore(state => state.showGrid);
    const setShowGrid = useAppStore(state => state.setShowGrid);
    const showEdges = useAppStore(state => state.showEdges);
    const setShowEdges = useAppStore(state => state.setShowEdges);
    const showHud = useAppStore(state => state.showHud);
    const setShowHud = useAppStore(state => state.setShowHud);
    const showCounters = useAppStore(state => state.showCounters);
    const setShowCounters = useAppStore(state => state.setShowCounters);
    const showStationLabels = useAppStore(state => state.showStationLabels);
    const setShowStationLabels = useAppStore(state => state.setShowStationLabels);

    if (!settingsOpen) return null;

    const TogglePill = ({ checked, onToggle, labelOn = 'ON', labelOff = 'OFF' }: { checked: boolean; onToggle: () => void; labelOn?: string; labelOff?: string }) => (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={onToggle}
            className={`relative w-16 h-7 rounded-full border transition-colors ${checked ? 'bg-white/20 border-white/30' : 'bg-white/10 border-white/20'}`}
        >
            <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold transition-all ${checked ? 'text-white/80' : 'opacity-0'} z-10`}>
                {labelOn}
            </span>
            <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold transition-all ${checked ? 'opacity-0' : 'text-white/80'} z-10`}>
                {labelOff}
            </span>
            <span className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full shadow-sm transition-all ${checked ? 'right-0.5 bg-white' : 'left-0.5 bg-white'}`} />
        </button>
    );

    return (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 ml-16 w-[var(--panel-width-md)] z-[var(--z-drawer)] animate-slide-in">
            <div className="glass-panel p-3 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-widest text-text-secondary">Settings</span>
                    <button onClick={closeSettings} className="text-text-secondary hover:text-text-primary">✕</button>
                </div>
                <div className="text-sm text-text-meta">
                    View + interaction settings (v0.5). Preferences/presets will expand later.
                </div>
                <div className="flex items-center justify-between text-sm text-white/70">
                    <span>Context menu mode</span>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={contextMenuMode === 'radial'}
                        onClick={() => setContextMenuMode(contextMenuMode === 'bar' ? 'radial' : 'bar')}
                        className={`relative w-16 h-7 rounded-full border transition-colors ${contextMenuMode === 'radial' ? 'bg-white/20 border-white/30' : 'bg-white/10 border-white/20'}`}
                        title={contextMenuMode === 'radial' ? 'Radial' : 'Bar'}
                    >
                        <span
                            className={`absolute left-2 top-1/2 -translate-y-1/2 text-[11px] transition-all ${contextMenuMode === 'bar' ? 'text-white' : 'text-white/40'}`}
                        >
                            —
                        </span>
                        <span
                            className={`absolute right-2 top-1/2 -translate-y-1/2 transition-all ${contextMenuMode === 'radial' ? 'text-white' : 'text-white/40'}`}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="block">
                                <path
                                    d="M4 13.5A8 8 0 0 1 12 6a8 8 0 0 1 8 7.5"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </span>
                        <span
                            className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full shadow-sm transition-all ${contextMenuMode === 'radial' ? 'right-0.5 bg-white' : 'left-0.5 bg-white'}`}
                        >
                            <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-semibold ${contextMenuMode === 'radial' ? 'text-black/80' : 'text-black/70'}`}>
                                {contextMenuMode === 'radial' ? (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="block">
                                        <path
                                            d="M5 13A7 7 0 0 1 12 6a7 7 0 0 1 7 7"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                ) : (
                                    '—'
                                )}
                            </span>
                        </span>
                    </button>
                </div>
                <div className="flex items-center justify-between text-sm text-white/70">
                    <span>Show grid</span>
                    <TogglePill checked={showGrid} onToggle={() => setShowGrid(!showGrid)} />
                </div>
                <div className="flex items-center justify-between text-sm text-white/70">
                    <span>Grid snap</span>
                    <TogglePill checked={gridSnapEnabled} onToggle={() => setGridSnapEnabled(!gridSnapEnabled)} />
                </div>
                <div className="flex items-center justify-between text-sm text-white/70">
                    <span>Grid step</span>
                    <div className="flex items-center gap-1">
                        {[0.5, 1, 2].map(step => (
                            <button
                                key={step}
                                onClick={() => setGridStepMul(step)}
                                className={`px-2 py-1 rounded-full text-[10px] uppercase tracking-wider border transition-colors ${gridStepMul === step ? 'bg-white/20 border-white/30 text-white' : 'border-white/10 text-white/50 hover:text-white hover:border-white/30'}`}
                            >
                                {step}×
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center justify-between text-sm text-white/70">
                    <span>Show edges</span>
                    <TogglePill checked={showEdges} onToggle={() => setShowEdges(!showEdges)} />
                </div>
                <div className="flex items-center justify-between text-sm text-white/70">
                    <span>Station labels</span>
                    <TogglePill checked={showStationLabels} onToggle={() => setShowStationLabels(!showStationLabels)} />
                </div>
                <div className="flex items-center justify-between text-sm text-white/70">
                    <span>HUD chips</span>
                    <TogglePill checked={showHud} onToggle={() => setShowHud(!showHud)} />
                </div>
                <div className="flex items-center justify-between text-sm text-white/70">
                    <span>HUD counters</span>
                    <TogglePill checked={showCounters} onToggle={() => setShowCounters(!showCounters)} />
                </div>
            </div>
        </div>
    );
};

export default SettingsDrawer;
