import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { resetAccount, resetSettings } from '../../core/state/onboardingState';
import AppearanceSettingsPanel from './AppearanceSettingsPanel';
import { TogglePill } from '../Common';

interface UniversalSettingsOverlayProps {
    onClose: () => void;
}

type SectionId = 'general' | 'appearance' | 'account' | 'space' | 'data';

const UniversalSettingsOverlay = ({ onClose }: UniversalSettingsOverlayProps) => {
    const viewContext = useAppStore(state => state.viewContext);

    // Global/Station Settings
    const showStationLabels = useAppStore(state => state.showStationLabels);
    const setShowStationLabels = useAppStore(state => state.setShowStationLabels);
    const showPlaygroundOnStation = useAppStore(state => state.showPlaygroundOnStation);
    const setShowPlaygroundOnStation = useAppStore(state => state.setShowPlaygroundOnStation);

    // Space Settings
    const showGrid = useAppStore(state => state.showGrid);
    const setShowGrid = useAppStore(state => state.setShowGrid);
    const showEdges = useAppStore(state => state.showEdges);
    const setShowEdges = useAppStore(state => state.setShowEdges);
    const showHud = useAppStore(state => state.showHud);
    const setShowHud = useAppStore(state => state.setShowHud);
    const showCounters = useAppStore(state => state.showCounters);
    const setShowCounters = useAppStore(state => state.setShowCounters);
    const gridSnapEnabled = useAppStore(state => state.gridSnapEnabled);
    const setGridSnapEnabled = useAppStore(state => state.setGridSnapEnabled);
    const gridStepMul = useAppStore(state => state.gridStepMul);
    const setGridStepMul = useAppStore(state => state.setGridStepMul);
    const contextMenuMode = useAppStore(state => state.contextMenuMode);
    const setContextMenuMode = useAppStore(state => state.setContextMenuMode);


    const [section, setSection] = useState<SectionId>(viewContext === 'home' ? 'general' : 'space');

    const NAV_ITEMS: Array<{ id: SectionId; label: string; context?: string[] }> = [
        { id: 'general', label: 'General', context: ['home'] },
        { id: 'space', label: 'Space & View', context: ['space', 'node'] },
        { id: 'appearance', label: 'Appearance' }, // Always available
        { id: 'account', label: 'Account' },       // Always available
        { id: 'data', label: 'Data', context: ['home'] }
    ];

    const availableNavItems = NAV_ITEMS.filter(item => !item.context || item.context.includes(viewContext));

    // Ensure current section is valid for context, else fallback
    useEffect(() => {
        if (!availableNavItems.find(i => i.id === section)) {
            setSection(availableNavItems[0]?.id || 'appearance');
        }
    }, [viewContext]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[var(--component-z-modal)] bg-black/20 backdrop-blur-md animate-fade-in flex items-center justify-center p-8" onClick={onClose}>
            <div
                className="w-full max-w-5xl h-[600px] glass-panel shadow-2xl overflow-hidden animate-scale-in flex"
                onClick={(event) => event.stopPropagation()}
            >
                <aside className="w-[var(--component-drawer-width-default)] border-r border-[var(--semantic-color-border-default)] glass-base bg-[var(--semantic-color-bg-surface)]/30 p-[var(--primitive-space-panel-padding)] flex flex-col gap-4 shrink-0">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--semantic-color-text-muted)] px-2">
                        Settings
                    </div>
                    {/* Profile Card (Visual only for now) */}
                    <div className="flex items-center gap-3 px-3 py-3 rounded-[var(--primitive-radius-card)] bg-[var(--semantic-color-bg-app)]/50 border border-[var(--semantic-color-border-default)]">
                        <div className="w-10 h-10 rounded-full bg-[var(--semantic-color-bg-surface)] border border-[var(--semantic-color-border-default)] flex items-center justify-center text-lg">
                            ◉
                        </div>
                        <div>
                            <div className="text-[var(--semantic-color-text-primary)] text-sm font-medium">Local Builder</div>
                            <div className="text-[var(--semantic-color-text-secondary)] text-xs">
                                {viewContext === 'home' ? 'Station' : viewContext === 'node' ? 'Node Scope' : 'Space Scope'}
                            </div>
                        </div>
                    </div>

                    <div className="mt-2 space-y-1">
                        {availableNavItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setSection(item.id)}
                                data-state={section === item.id ? 'active' : 'inactive'}
                                className="ui-selectable w-full text-left px-4 py-2.5 rounded-[var(--primitive-radius-input)] text-sm transition-colors"
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </aside>

                <main className="flex-1 p-[var(--primitive-space-panel-padding)] overflow-y-auto bg-[var(--semantic-color-bg-app)]/20 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center text-[var(--semantic-color-text-muted)] hover:text-[var(--semantic-color-text-primary)] hover:bg-[var(--semantic-color-bg-surface)] border border-transparent hover:border-[var(--semantic-color-border-default)] transition-all z-10"
                        aria-label="Close"
                    >
                        ✕
                    </button>

                    <div className="max-w-2xl mx-auto pt-4">
                        {section === 'general' && (
                            <section className="space-y-6">
                                <div>
                                    <h2 className="text-[var(--semantic-color-text-primary)] text-xl font-medium">General</h2>
                                    <p className="text-[var(--semantic-color-text-secondary)] text-sm mt-1">Station visibility defaults.</p>
                                </div>
                                <div className="glass-panel p-6 space-y-4">
                                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                                        <span>Show Playground on Station</span>
                                        <TogglePill checked={showPlaygroundOnStation} onToggle={() => setShowPlaygroundOnStation(!showPlaygroundOnStation)} />
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                                        <span>Station labels</span>
                                        <TogglePill checked={showStationLabels} onToggle={() => setShowStationLabels(!showStationLabels)} />
                                    </div>

                                    <div className="h-px bg-[var(--semantic-color-border-default)] my-2 opacity-50" />

                                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                                        <span>Show grid</span>
                                        <TogglePill checked={showGrid} onToggle={() => setShowGrid(!showGrid)} />
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                                        <span>Grid snap</span>
                                        <TogglePill checked={gridSnapEnabled} onToggle={() => setGridSnapEnabled(!gridSnapEnabled)} />
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                                        <span>Show links</span>
                                        <TogglePill checked={showEdges} onToggle={() => setShowEdges(!showEdges)} />
                                    </div>
                                </div>
                            </section>
                        )}

                        {section === 'space' && (
                            <section className="space-y-6">
                                <div>
                                    <h2 className="text-[var(--semantic-color-text-primary)] text-xl font-medium">Space & View</h2>
                                    <p className="text-[var(--semantic-color-text-secondary)] text-sm mt-1">Canvas interaction and visibility settings.</p>
                                </div>
                                <div className="glass-panel p-6 space-y-4">
                                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                                        <span>Show grid</span>
                                        <TogglePill checked={showGrid} onToggle={() => setShowGrid(!showGrid)} />
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                                        <span>Link lines</span>
                                        <TogglePill checked={showEdges} onToggle={() => setShowEdges(!showEdges)} />
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                                        <span>HUD (Chips)</span>
                                        <TogglePill checked={showHud} onToggle={() => setShowHud(!showHud)} />
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                                        <span>HUD (Counters)</span>
                                        <TogglePill checked={showCounters} onToggle={() => setShowCounters(!showCounters)} />
                                    </div>

                                    <div className="h-px bg-[var(--semantic-color-border-default)] my-2 opacity-50" />

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
                                </div>
                            </section>
                        )}

                        {section === 'appearance' && (
                            <AppearanceSettingsPanel />
                        )}

                        {section === 'account' && (
                            <section className="space-y-6">
                                <div>
                                    <h2 className="text-[var(--semantic-color-text-primary)] text-xl font-medium">Account</h2>
                                    <p className="text-[var(--semantic-color-text-secondary)] text-sm mt-1">Local account actions and reset controls.</p>
                                </div>
                                <div className="glass-panel p-6 space-y-3">
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Reset Settings: reset only UI and interaction preferences?')) {
                                                resetSettings();
                                            }
                                        }}
                                        className="w-full py-3 px-4 rounded-[var(--primitive-radius-input)] bg-[var(--semantic-color-bg-surface)] hover:bg-[var(--semantic-color-bg-surface)]/80 text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)] border border-[var(--semantic-color-border-default)] text-sm font-medium transition-colors text-left"
                                    >
                                        Reset Settings Only
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Hard Reset: wipe all spaces and local data?')) {
                                                resetAccount();
                                            }
                                        }}
                                        className="w-full py-3 px-4 rounded-[var(--primitive-radius-input)] bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 text-sm font-medium transition-colors text-left"
                                    >
                                        Reset Account and Data
                                    </button>
                                </div>
                            </section>
                        )}

                        {section === 'data' && (
                            <section className="space-y-6">
                                <div>
                                    <h2 className="text-[var(--semantic-color-text-primary)] text-xl font-medium">Data</h2>
                                    <p className="text-[var(--semantic-color-text-secondary)] text-sm mt-1">Import/export and backups.</p>
                                </div>
                                <div className="glass-panel p-6 text-sm text-[var(--semantic-color-text-muted)]">
                                    Data tools stay in this section. Advanced options are planned for v0.6.
                                </div>
                            </section>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default UniversalSettingsOverlay;
