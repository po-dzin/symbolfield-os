import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useTimeStore } from '../../store/useTimeStore';

type NowCoreTab = 'now' | 'cycles' | 'timeline';

const isNowCoreTab = (tab: string | null): tab is NowCoreTab | 'log' => (
    tab === 'now' || tab === 'cycles' || tab === 'timeline' || tab === 'log'
);

const resolveActiveTab = (tab: string | null): NowCoreTab => {
    if (tab === 'cycles') return 'cycles';
    if (tab === 'timeline' || tab === 'log') return 'timeline';
    return 'now';
};

const TAB_LABELS: Record<NowCoreTab, string> = {
    now: 'Now',
    cycles: 'Cycles',
    timeline: 'Alt Chronos'
};

const NowCoreDrawer = () => {
    const drawerRightOpen = useAppStore(state => state.drawerRightOpen);
    const drawerRightTab = useAppStore(state => state.drawerRightTab);
    const setDrawerOpen = useAppStore(state => state.setDrawerOpen);
    const setDrawerRightTab = useAppStore(state => state.setDrawerRightTab);
    const session = useAppStore(state => state.session);
    const startFocusSession = useAppStore(state => state.startFocusSession);
    const stopFocusSession = useAppStore(state => state.stopFocusSession);
    const activeTool = useAppStore(state => state.activeTool);
    const currentSpaceId = useAppStore(state => state.currentSpaceId);

    const display = useTimeStore(state => state.display);
    const scale = useTimeStore(state => state.scale);
    const anchorDate = useTimeStore(state => state.anchorDate);

    const [fullscreenByTab, setFullscreenByTab] = React.useState<Record<NowCoreTab, boolean>>({
        now: false,
        cycles: false,
        timeline: false
    });

    if (!drawerRightOpen || !isNowCoreTab(drawerRightTab)) return null;

    const activeTab = resolveActiveTab(drawerRightTab);
    const isFullscreen = fullscreenByTab[activeTab];
    const updatedAt = new Date().toLocaleTimeString();

    const toggleFullscreen = () => {
        setFullscreenByTab(prev => ({
            ...prev,
            [activeTab]: !prev[activeTab]
        }));
    };

    return (
        <div
            className={isFullscreen
                ? 'absolute inset-0 z-[var(--z-overlay)] pointer-events-auto'
                : 'absolute right-0 top-0 h-full w-[var(--panel-width-lg)] z-[var(--z-drawer)] pointer-events-auto'}
            data-nowcore-drawer
        >
            <div className={isFullscreen
                ? 'h-full w-full glass-panel rounded-none border-0 p-[var(--panel-padding)] flex flex-col gap-[var(--primitive-space-gap-section-min)]'
                : 'h-full glass-panel rounded-none rounded-l-[var(--panel-radius)] border-r-0 p-[var(--panel-padding)] flex flex-col gap-[var(--primitive-space-gap-section-min)]'}
            >
                <div className="flex items-center justify-between">
                    <div />
                    <div className="flex items-center gap-[var(--primitive-space-gap-default)]">
                        <button
                            onClick={toggleFullscreen}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)] hover:bg-[var(--semantic-color-text-primary)]/10"
                            aria-label={isFullscreen ? 'Exit fullscreen tab' : 'Open fullscreen tab'}
                            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                        >
                            {isFullscreen ? '↙' : '⛶'}
                        </button>
                        <button
                            onClick={() => setDrawerOpen('right', false)}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)] hover:bg-[var(--semantic-color-text-primary)]/10"
                            aria-label="Close NowCore"
                        >
                            ×
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-[var(--primitive-space-gap-dense)]">
                    {(['now', 'cycles', 'timeline'] as NowCoreTab[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setDrawerRightTab(tab)}
                            className={`px-3 h-8 rounded-[var(--primitive-radius-input)] text-[10px] uppercase tracking-[0.2em] transition-colors ${activeTab === tab ? 'bg-[var(--semantic-color-text-primary)]/20 text-[var(--semantic-color-text-primary)]' : 'text-[var(--semantic-color-text-secondary)] hover:bg-[var(--semantic-color-text-primary)]/10 hover:text-[var(--semantic-color-text-primary)]'
                                }`}
                        >
                            {TAB_LABELS[tab]}
                        </button>
                    ))}
                </div>

                {activeTab === 'now' && (
                    <div className="flex-1 overflow-auto space-y-[var(--primitive-space-gap-section-min)] text-sm">
                        <div className="rounded-[var(--primitive-radius-card)] border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)]/30 p-[var(--primitive-space-gap-section-min)]">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--semantic-color-text-secondary)] mb-2">Session</div>
                            <div className="text-[var(--semantic-color-text-primary)]">Status: {session.isActive ? 'Active' : 'Idle'}</div>
                            <div className="text-[var(--semantic-color-text-muted)]">Label: {session.label ?? '—'}</div>
                            <div className="text-[var(--semantic-color-text-muted)]">Started: {session.startTime ? new Date(session.startTime).toLocaleTimeString() : '—'}</div>
                        </div>
                        <div className="rounded-[var(--primitive-radius-card)] border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)]/30 p-[var(--primitive-space-gap-section-min)]">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--semantic-color-text-secondary)] mb-2">Field Snapshot</div>
                            <div className="text-[var(--semantic-color-text-primary)]">Space: {currentSpaceId ?? '—'}</div>
                            <div className="text-[var(--semantic-color-text-primary)]">Tool: {activeTool}</div>
                            <div className="text-[var(--semantic-color-text-primary)]">Time scale: {scale}</div>
                            <div className="text-[var(--semantic-color-text-primary)]">Anchor: {display}</div>
                        </div>
                    </div>
                )}

                {activeTab === 'cycles' && (
                    <div className="flex-1 overflow-auto space-y-[var(--primitive-space-gap-section-min)] text-sm">
                        <div className="rounded-[var(--primitive-radius-card)] border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)]/30 p-[var(--primitive-space-gap-section-min)]">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--semantic-color-text-secondary)] mb-3">Session Log</div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => startFocusSession(session.label ?? 'Focus')}
                                    className="flex-1 h-10 rounded-[var(--primitive-radius-input)] bg-[var(--semantic-color-status-success)]/10 text-[var(--semantic-color-status-success)] hover:bg-[var(--semantic-color-status-success)]/20 uppercase tracking-[0.2em] text-[10px]"
                                >
                                    Start Focus
                                </button>
                                <button
                                    onClick={() => stopFocusSession()}
                                    className="h-10 px-3 rounded-[var(--primitive-radius-input)] bg-[var(--semantic-color-text-primary)]/10 text-[var(--semantic-color-text-secondary)] hover:bg-[var(--semantic-color-text-primary)]/15 uppercase tracking-[0.2em] text-[10px]"
                                    disabled={!session.isActive}
                                    aria-disabled={!session.isActive}
                                    title={session.isActive ? 'Stop focus session' : 'No active session'}
                                >
                                    Stop
                                </button>
                            </div>
                            <div className="mt-3 text-xs text-[var(--semantic-color-text-secondary)]">
                                <div>Status: <span className="text-[var(--semantic-color-text-primary)]">{session.isActive ? 'Active' : 'Idle'}</span></div>
                                <div>Label: <span className="text-[var(--semantic-color-text-primary)]">{session.label ?? '—'}</span></div>
                                <div>Started: <span className="text-[var(--semantic-color-text-primary)]">{session.startTime ? new Date(session.startTime).toLocaleTimeString() : '—'}</span></div>
                            </div>
                        </div>
                        <div className="rounded-[var(--primitive-radius-card)] border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)]/30 p-[var(--primitive-space-gap-section-min)]">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--semantic-color-text-secondary)] mb-2">Cycles Lens</div>
                            <div className="text-[var(--semantic-color-text-primary)]">{anchorDate.toLocaleDateString()}</div>
                            <div className="text-[var(--semantic-color-text-muted)]">Scale: {scale}</div>
                        </div>
                        <div className="grid grid-cols-7 gap-1 rounded-[var(--primitive-radius-card)] border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)]/30 p-[var(--primitive-space-gap-section-min)]">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                <div key={day} className="text-[8px] uppercase tracking-[0.18em] text-[var(--semantic-color-text-muted)] text-center py-1">{day}</div>
                            ))}
                            {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                                <div
                                    key={day}
                                    className={`h-8 rounded-[var(--primitive-radius-input)] flex items-center justify-center text-xs ${day === anchorDate.getDate() ? 'bg-[var(--semantic-color-text-primary)]/20 text-[var(--semantic-color-text-primary)]' : 'bg-[var(--semantic-color-text-primary)]/5 text-[var(--semantic-color-text-secondary)]'
                                        }`}
                                >
                                    {day}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'timeline' && (
                    <div className="flex-1 overflow-auto space-y-[var(--primitive-space-gap-section-min)] text-sm">
                        <div className="rounded-[var(--primitive-radius-card)] border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)]/30 p-[var(--primitive-space-gap-section-min)]">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--semantic-color-text-secondary)] mb-3">Session Log</div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => startFocusSession(session.label ?? 'Focus')}
                                    className="flex-1 h-10 rounded-[var(--primitive-radius-input)] bg-[var(--semantic-color-status-success)]/10 text-[var(--semantic-color-status-success)] hover:bg-[var(--semantic-color-status-success)]/20 uppercase tracking-[0.2em] text-[10px]"
                                >
                                    Start Focus
                                </button>
                                <button
                                    onClick={() => stopFocusSession()}
                                    className="h-10 px-3 rounded-[var(--primitive-radius-input)] bg-[var(--semantic-color-text-primary)]/10 text-[var(--semantic-color-text-secondary)] hover:bg-[var(--semantic-color-text-primary)]/15 uppercase tracking-[0.2em] text-[10px]"
                                    disabled={!session.isActive}
                                    aria-disabled={!session.isActive}
                                    title={session.isActive ? 'Stop focus session' : 'No active session'}
                                >
                                    Stop
                                </button>
                            </div>
                            <div className="mt-3 text-xs text-[var(--semantic-color-text-secondary)]">
                                <div>Status: <span className="text-[var(--semantic-color-text-primary)]">{session.isActive ? 'Active' : 'Idle'}</span></div>
                                <div>Label: <span className="text-[var(--semantic-color-text-primary)]">{session.label ?? '—'}</span></div>
                                <div>Started: <span className="text-[var(--semantic-color-text-primary)]">{session.startTime ? new Date(session.startTime).toLocaleTimeString() : '—'}</span></div>
                            </div>
                        </div>
                        <div className="rounded-[var(--primitive-radius-card)] border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)]/30 p-[var(--primitive-space-gap-section-min)]">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--semantic-color-text-secondary)]">Temporal Log</div>
                            <div className="mt-1 text-[11px] text-[var(--semantic-color-text-muted)]">Updated: {updatedAt}</div>
                        </div>
                        <div className="rounded-[var(--primitive-radius-card)] border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)]/30 p-[var(--primitive-space-gap-section-min)]">
                            <div className="mb-2 opacity-50 text-[10px] uppercase tracking-[0.2em] text-[var(--semantic-color-text-muted)]">Today</div>
                            <div className="pl-2 border-l border-[var(--semantic-color-border-default)] flex flex-col gap-2 font-mono text-xs">
                                <div>10:42 <span className="text-[var(--semantic-color-text-primary)]">Node Created</span></div>
                                <div>09:15 <span className="text-[var(--semantic-color-status-success)]">Ritual Complete</span></div>
                                <div>08:31 <span className="text-[var(--semantic-color-text-secondary)]">Scope Entered</span></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NowCoreDrawer;
