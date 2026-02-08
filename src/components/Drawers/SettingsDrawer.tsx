import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import ResizeHandle from './ResizeHandle';

const SettingsDrawer = () => {
    const settingsOpen = useAppStore(state => state.settingsOpen);
    const closeSettings = useAppStore(state => state.closeSettings);
    const drawerRightWidthPx = useAppStore(state => state.drawerRightWidthPx);
    const setDrawerWidthPx = useAppStore(state => state.setDrawerWidthPx);
    const drawerRightTab = useAppStore(state => state.drawerRightTab);
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

    if (!settingsOpen || drawerRightTab !== 'settings') return null;

    const TogglePill = ({ checked, onToggle, labelOn = 'ON', labelOff = 'OFF' }: { checked: boolean; onToggle: () => void; labelOn?: string; labelOff?: string }) => (
        <button
            type="button"
            aria-pressed={checked}
            onClick={onToggle}
            className={`relative w-14 h-6 rounded-full border transition-colors ${checked ? 'bg-[var(--semantic-color-text-primary)]/20 border-[var(--semantic-color-border-default)]' : 'bg-[var(--semantic-color-text-primary)]/10 border-[var(--semantic-color-border-default)]/50'}`}
        >
            <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-[8px] font-bold uppercase tracking-tighter transition-all ${checked ? 'text-[var(--semantic-color-text-primary)]' : 'opacity-0'} z-10`}>
                {labelOn}
            </span>
            <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold uppercase tracking-tighter transition-all ${checked ? 'opacity-0' : 'text-[var(--semantic-color-text-muted)]'} z-10`}>
                {labelOff}
            </span>
            <span className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full shadow-sm transition-all ${checked ? 'right-0.5 bg-[var(--semantic-color-text-primary)]' : 'left-0.5 bg-[var(--semantic-color-text-secondary)]'}`} />
        </button>
    );

    return (
        <div
            className="absolute right-0 top-0 h-full z-[var(--component-z-drawer)] pointer-events-auto"
            style={{ width: `${drawerRightWidthPx}px` }}
        >
            <ResizeHandle side="right" onResize={(w) => setDrawerWidthPx('right', w)} />
            <div className="h-full glass-panel rounded-none rounded-l-[var(--component-panel-radius)] border-r-0 p-[var(--component-panel-padding)] flex flex-col gap-6 overflow-y-auto no-scrollbar">
                <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-[0.3em] text-[var(--semantic-color-text-muted)] opacity-60">Settings</span>
                    <button onClick={closeSettings} className="text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)] transition-colors">✕</button>
                </div>
                <div className="text-sm text-[var(--semantic-color-text-secondary)] leading-relaxed">
                    View + interaction settings (v0.5). Preferences/presets will expand later.
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                        <span>Context menu mode</span>
                        <div className="flex items-center gap-1 bg-[var(--semantic-color-text-primary)]/5 p-1 rounded-[var(--primitive-radius-pill)]">
                            <button
                                onClick={() => setContextMenuMode('bar')}
                                className={`px-2 py-0.5 rounded-[var(--primitive-radius-pill)] text-[9px] uppercase tracking-wider transition-colors ${contextMenuMode === 'bar' ? 'bg-[var(--semantic-color-text-primary)]/20 text-[var(--semantic-color-text-primary)]' : 'text-[var(--semantic-color-text-muted)] hover:text-[var(--semantic-color-text-secondary)]'}`}
                            >
                                Bar
                            </button>
                            <button
                                onClick={() => setContextMenuMode('radial')}
                                className={`px-2 py-0.5 rounded-[var(--primitive-radius-pill)] text-[9px] uppercase tracking-wider transition-colors ${contextMenuMode === 'radial' ? 'bg-[var(--semantic-color-text-primary)]/20 text-[var(--semantic-color-text-primary)]' : 'text-[var(--semantic-color-text-muted)] hover:text-[var(--semantic-color-text-secondary)]'}`}
                            >
                                Radial
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                        <span>Show grid</span>
                        <TogglePill checked={showGrid} onToggle={() => setShowGrid(!showGrid)} />
                    </div>

                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                        <span>Grid snap</span>
                        <TogglePill checked={gridSnapEnabled} onToggle={() => setGridSnapEnabled(!gridSnapEnabled)} />
                    </div>

                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                        <span>Grid step</span>
                        <div className="flex items-center gap-1">
                            {[0.5, 1, 2].map(step => (
                                <button
                                    key={step}
                                    onClick={() => setGridStepMul(step)}
                                    className={`px-2 py-1 rounded-[var(--primitive-radius-pill)] text-[10px] border transition-colors ${gridStepMul === step ? 'bg-[var(--semantic-color-text-primary)]/20 border-[var(--semantic-color-border-default)] text-[var(--semantic-color-text-primary)]' : 'border-transparent text-[var(--semantic-color-text-muted)] hover:text-[var(--semantic-color-text-secondary)]'}`}
                                >
                                    {step}×
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                        <span>Show edges</span>
                        <TogglePill checked={showEdges} onToggle={() => setShowEdges(!showEdges)} />
                    </div>

                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                        <span>HUD chips</span>
                        <TogglePill checked={showHud} onToggle={() => setShowHud(!showHud)} />
                    </div>

                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                        <span>HUD counters</span>
                        <TogglePill checked={showCounters} onToggle={() => setShowCounters(!showCounters)} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsDrawer;
