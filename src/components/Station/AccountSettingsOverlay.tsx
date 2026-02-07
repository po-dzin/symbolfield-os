import React, { useEffect, useMemo, useState } from 'react';
import { resetAccount, resetSettings } from '../../core/state/onboardingState';
import { useAppStore } from '../../store/useAppStore';

interface AccountSettingsOverlayProps {
    onClose: () => void;
}

const AccountSettingsOverlay = ({ onClose }: AccountSettingsOverlayProps) => {
    const contextMenuMode = useAppStore(state => state.contextMenuMode);
    const setContextMenuMode = useAppStore(state => state.setContextMenuMode);
    const showGrid = useAppStore(state => state.showGrid);
    const setShowGrid = useAppStore(state => state.setShowGrid);
    const gridSnapEnabled = useAppStore(state => state.gridSnapEnabled);
    const setGridSnapEnabled = useAppStore(state => state.setGridSnapEnabled);
    const showEdges = useAppStore(state => state.showEdges);
    const setShowEdges = useAppStore(state => state.setShowEdges);
    const showHud = useAppStore(state => state.showHud);
    const setShowHud = useAppStore(state => state.setShowHud);
    const showCounters = useAppStore(state => state.showCounters);
    const setShowCounters = useAppStore(state => state.setShowCounters);
    const showStationLabels = useAppStore(state => state.showStationLabels);
    const setShowStationLabels = useAppStore(state => state.setShowStationLabels);
    const showPlaygroundOnStation = useAppStore(state => state.showPlaygroundOnStation);
    const setShowPlaygroundOnStation = useAppStore(state => state.setShowPlaygroundOnStation);
    const showGrid = useAppStore(state => state.showGrid);
    const setShowGrid = useAppStore(state => state.setShowGrid);
    const showEdges = useAppStore(state => state.showEdges);
    const setShowEdges = useAppStore(state => state.setShowEdges);
    const showStationLabels = useAppStore(state => state.showStationLabels);
    const setShowStationLabels = useAppStore(state => state.setShowStationLabels);
    const glassOpacity = useAppStore(state => state.glassOpacity);
    const setGlassOpacity = useAppStore(state => state.setGlassOpacity);
    const glassNoise = useAppStore(state => state.glassNoise);
    const setGlassNoise = useAppStore(state => state.setGlassNoise);
    const [section, setSection] = useState('general');

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

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

    const Slider = ({ value, onChange, min, max, step, label }: { value: number; onChange: (next: number) => void; min: number; max: number; step: number; label: string }) => (
        <div className="flex items-center justify-between gap-4 text-sm text-white/70">
            <span>{label}</span>
            <div className="flex items-center gap-3 w-[200px]">
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="flex-1 accent-white/80"
                />
                <span className="text-xs text-white/50 w-10 text-right">{Math.round(value * 100)}%</span>
            </div>
        </div>
    );

    const navItems = useMemo(() => ([
        { id: 'general', label: 'General' },
        { id: 'station', label: 'Station' },
        { id: 'account', label: 'Account' },
        { id: 'data', label: 'Data' }
    ]), []);

    return (
        <div
            className="fixed inset-0 z-[1000] bg-black/45 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="absolute inset-6 rounded-3xl glass-panel glass-panel-strong shadow-2xl overflow-hidden animate-scale-in flex"
                onClick={(event) => event.stopPropagation()}
            >
                <aside className="w-[240px] border-r border-white/10 bg-black/20 p-4 flex flex-col gap-3">
                    <div className="text-[11px] uppercase tracking-[0.3em] text-white/40 px-2 pt-2">
                        Settings
                    </div>
                    <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/5">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-lg">
                            👤
                        </div>
                        <div>
                            <div className="text-white/90 text-sm font-medium">Local Builder</div>
                            <div className="text-white/40 text-xs">Local Account</div>
                        </div>
                    </div>
                    <div className="mt-2 space-y-1">
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setSection(item.id)}
                                className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${section === item.id ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white/80'}`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </aside>

                <main className="flex-1 p-8 overflow-y-auto">
                    <button
                        onClick={onClose}
                        className="absolute top-8 right-8 w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all"
                        aria-label="Close"
                    >
                        ✕
                    </button>

                    {section === 'general' && (
                        <section className="space-y-6">
                            <div>
                                <h2 className="text-white/90 text-lg font-medium">General</h2>
                                <p className="text-white/40 text-sm mt-1">Profile and system-wide defaults.</p>
                            </div>
                            <div className="glass-panel p-4 space-y-2">
                                <div className="text-sm text-white/70">Local account mode</div>
                                <div className="text-xs text-white/40">Cloud sync will land in v0.6.</div>
                            </div>
                        </section>
                    )}

                    {section === 'station' && (
                        <section className="space-y-6">
                            <div>
                                <h2 className="text-white/90 text-lg font-medium">Station</h2>
                                <p className="text-white/40 text-sm mt-1">Station-only display options.</p>
                            </div>
                            <div className="glass-panel p-4 space-y-3">
                                <div className="flex items-center justify-between text-sm text-white/70">
                                    <span>Show grid</span>
                                    <TogglePill checked={showGrid} onToggle={() => setShowGrid(!showGrid)} />
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
                                    <span>Show Playground on Station</span>
                                    <TogglePill checked={showPlaygroundOnStation} onToggle={() => setShowPlaygroundOnStation(!showPlaygroundOnStation)} />
                                </div>
                            </div>
                            <div className="glass-panel p-4 space-y-3">
                                <Slider
                                    label="Glass opacity"
                                    value={glassOpacity}
                                    onChange={setGlassOpacity}
                                    min={0.35}
                                    max={0.95}
                                    step={0.01}
                                />
                                <Slider
                                    label="Noise blend"
                                    value={glassNoise}
                                    onChange={setGlassNoise}
                                    min={0}
                                    max={0.25}
                                    step={0.01}
                                />
                            </div>
                        </section>
                    )}

                    {section === 'account' && (
                        <section className="space-y-6">
                            <div>
                                <h2 className="text-white/90 text-lg font-medium">Account</h2>
                                <p className="text-white/40 text-sm mt-1">Local account actions and resets.</p>
                            </div>
                            <div className="glass-panel p-4 space-y-3">
                                <button
                                    onClick={() => {
                                        if (confirm('Reset Settings: This will reset view preferences only. Continue?')) {
                                            resetSettings();
                                        }
                                    }}
                                    className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium transition-colors flex items-center justify-between group"
                                >
                                    <span>Reset Settings Only</span>
                                    <span className="opacity-50 group-hover:opacity-100">→</span>
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm('Hard Reset: This will wipe all spaces and local data. Continue?')) {
                                            resetAccount();
                                        }
                                    }}
                                    className="w-full py-3 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-colors flex items-center justify-between group"
                                >
                                    <span>Reset Account & Data</span>
                                    <span className="opacity-50 group-hover:opacity-100">→</span>
                                </button>
                                <button className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium transition-colors flex items-center justify-between group">
                                    <span>Sign Out (Mock)</span>
                                </button>
                            </div>
                        </section>
                    )}

                    {section === 'data' && (
                        <section className="space-y-6">
                            <div>
                                <h2 className="text-white/90 text-lg font-medium">Data</h2>
                                <p className="text-white/40 text-sm mt-1">Import/export and backups.</p>
                            </div>
                            <div className="glass-panel p-4 text-sm text-white/50">
                                Data tools move here in v0.6.
                            </div>
                        </section>
                    )}
                </main>
            </div>
        </div>
    );
};

export default AccountSettingsOverlay;
