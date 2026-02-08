import React, { useEffect, useState } from 'react';
import { resetAccount, resetSettings } from '../../core/state/onboardingState';
import { useAppStore } from '../../store/useAppStore';

interface AccountSettingsOverlayProps {
    onClose: () => void;
}

type SectionId = 'general' | 'station' | 'account' | 'data';

const NAV_ITEMS: Array<{ id: SectionId; label: string }> = [
    { id: 'general', label: 'General' },
    { id: 'station', label: 'Station' },
    { id: 'account', label: 'Account' },
    { id: 'data', label: 'Data' }
];

const TogglePill = ({
    checked,
    onToggle,
    labelOn = 'ON',
    labelOff = 'OFF'
}: {
    checked: boolean;
    onToggle: () => void;
    labelOn?: string;
    labelOff?: string;
}) => (
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

const AccountSettingsOverlay = ({ onClose }: AccountSettingsOverlayProps) => {
    const showGrid = useAppStore(state => state.showGrid);
    const setShowGrid = useAppStore(state => state.setShowGrid);
    const showEdges = useAppStore(state => state.showEdges);
    const setShowEdges = useAppStore(state => state.setShowEdges);
    const showHud = useAppStore(state => state.showHud);
    const setShowHud = useAppStore(state => state.setShowHud);
    const showStationLabels = useAppStore(state => state.showStationLabels);
    const setShowStationLabels = useAppStore(state => state.setShowStationLabels);
    const showPlaygroundOnStation = useAppStore(state => state.showPlaygroundOnStation);
    const setShowPlaygroundOnStation = useAppStore(state => state.setShowPlaygroundOnStation);

    const [section, setSection] = useState<SectionId>('general');

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
        <div className="fixed inset-0 z-[var(--primitive-z-5-shell)] bg-black/45 backdrop-blur-sm animate-fade-in flex items-center justify-center p-8" onClick={onClose}>
            <div
                className="w-full max-w-5xl h-[600px] glass-panel glass-panel-strong shadow-2xl overflow-hidden animate-scale-in flex"
                onClick={(event) => event.stopPropagation()}
            >
                <aside className="w-[var(--component-drawer-width-default)] border-r border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)]/50 p-[var(--primitive-space-panel-padding)] flex flex-col gap-4 shrink-0">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--semantic-color-text-muted)] px-2">
                        Station Settings
                    </div>
                    <div className="flex items-center gap-3 px-3 py-3 rounded-[var(--primitive-radius-card)] bg-[var(--semantic-color-bg-app)]/50 border border-[var(--semantic-color-border-default)]">
                        <div className="w-10 h-10 rounded-full bg-[var(--semantic-color-bg-surface)] border border-[var(--semantic-color-border-default)] flex items-center justify-center text-lg">
                            ◉
                        </div>
                        <div>
                            <div className="text-[var(--semantic-color-text-primary)] text-sm font-medium">Local Builder</div>
                            <div className="text-[var(--semantic-color-text-secondary)] text-xs">Station profile</div>
                        </div>
                    </div>
                    <div className="mt-2 space-y-1">
                        {NAV_ITEMS.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setSection(item.id)}
                                className={`w-full text-left px-4 py-2.5 rounded-[var(--primitive-radius-input)] text-sm transition-colors ${section === item.id ? 'bg-[var(--semantic-color-bg-surface)] text-[var(--semantic-color-text-primary)] shadow-sm border border-[var(--semantic-color-border-default)]' : 'text-[var(--semantic-color-text-secondary)] hover:bg-[var(--semantic-color-bg-surface)]/50 hover:text-[var(--semantic-color-text-primary)] border border-transparent'}`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </aside>

                <main className="flex-1 p-[var(--primitive-space-panel-padding)] overflow-y-auto bg-[var(--semantic-color-bg-app)]/20">
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center text-[var(--semantic-color-text-muted)] hover:text-[var(--semantic-color-text-primary)] hover:bg-[var(--semantic-color-bg-surface)] border border-transparent hover:border-[var(--semantic-color-border-default)] transition-all"
                        aria-label="Close"
                    >
                        ✕
                    </button>

                    <div className="max-w-2xl mx-auto pt-4">
                        {section === 'general' && (
                            <section className="space-y-6">
                                <div>
                                    <h2 className="text-[var(--semantic-color-text-primary)] text-xl font-medium">General</h2>
                                    <p className="text-[var(--semantic-color-text-secondary)] text-sm mt-1">Core Station visibility defaults.</p>
                                </div>
                                <div className="glass-panel p-6 space-y-4">
                                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                                        <span>Background grid</span>
                                        <TogglePill checked={showGrid} onToggle={() => setShowGrid(!showGrid)} />
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                                        <span>Link lines</span>
                                        <TogglePill checked={showEdges} onToggle={() => setShowEdges(!showEdges)} />
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                                        <span>Station labels</span>
                                        <TogglePill checked={showStationLabels} onToggle={() => setShowStationLabels(!showStationLabels)} />
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                                        <span>Station HUD (chips + counters)</span>
                                        <TogglePill checked={showHud} onToggle={() => setShowHud(!showHud)} />
                                    </div>
                                </div>
                            </section>
                        )}

                        {section === 'station' && (
                            <section className="space-y-6">
                                <div>
                                    <h2 className="text-[var(--semantic-color-text-primary)] text-xl font-medium">Station</h2>
                                    <p className="text-[var(--semantic-color-text-secondary)] text-sm mt-1">Station scope + source composition controls.</p>
                                </div>
                                <div className="glass-panel p-6 space-y-4">
                                    <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                                        <span>Show Playground on Station</span>
                                        <TogglePill checked={showPlaygroundOnStation} onToggle={() => setShowPlaygroundOnStation(!showPlaygroundOnStation)} />
                                    </div>
                                    <div className="text-xs text-[var(--semantic-color-text-muted)] leading-relaxed pt-2 border-t border-[var(--semantic-color-border-default)]">
                                        Space editor defaults (context menu mode, HUD, grid snap/step) are configured inside Space settings drawer.
                                    </div>
                                </div>
                            </section>
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

export default AccountSettingsOverlay;
