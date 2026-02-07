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
                ? 'h-full w-full glass-panel rounded-none border-0 p-[var(--panel-padding)] flex flex-col gap-4'
                : 'h-full glass-panel rounded-none rounded-l-[var(--panel-radius)] border-r-0 p-[var(--panel-padding)] flex flex-col gap-4'}
            >
                <div className="flex items-center justify-between">
                    <div />
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleFullscreen}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10"
                            aria-label={isFullscreen ? 'Exit fullscreen tab' : 'Open fullscreen tab'}
                            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                        >
                            {isFullscreen ? '↙' : '⛶'}
                        </button>
                        <button
                            onClick={() => setDrawerOpen('right', false)}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10"
                            aria-label="Close NowCore"
                        >
                            ×
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {(['now', 'cycles', 'timeline'] as NowCoreTab[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setDrawerRightTab(tab)}
                            className={`px-3 h-8 rounded-lg text-xs uppercase tracking-[0.2em] transition-colors ${
                                activeTab === tab ? 'bg-white/20 text-white' : 'text-white/55 hover:bg-white/10 hover:text-white/85'
                            }`}
                        >
                            {TAB_LABELS[tab]}
                        </button>
                    ))}
                </div>

                {activeTab === 'now' && (
                    <div className="flex-1 overflow-auto space-y-4 text-sm">
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-white/45 mb-2">Session</div>
                            <div className="text-white/85">Status: {session.isActive ? 'Active' : 'Idle'}</div>
                            <div className="text-white/65">Label: {session.label ?? '—'}</div>
                            <div className="text-white/65">Started: {session.startTime ? new Date(session.startTime).toLocaleTimeString() : '—'}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-white/45 mb-2">Field Snapshot</div>
                            <div className="text-white/75">Space: {currentSpaceId ?? '—'}</div>
                            <div className="text-white/75">Tool: {activeTool}</div>
                            <div className="text-white/75">Time scale: {scale}</div>
                            <div className="text-white/75">Anchor: {display}</div>
                        </div>
                    </div>
                )}

                {activeTab === 'cycles' && (
                    <div className="flex-1 overflow-auto space-y-4 text-sm">
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-white/45 mb-3">Session Log</div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => startFocusSession(session.label ?? 'Focus')}
                                    className="flex-1 h-10 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/25 uppercase tracking-[0.2em] text-xs"
                                >
                                    Start Focus
                                </button>
                                <button
                                    onClick={() => stopFocusSession()}
                                    className="h-10 px-3 rounded-lg bg-white/10 text-white/70 hover:bg-white/15 uppercase tracking-[0.2em] text-xs"
                                    disabled={!session.isActive}
                                    aria-disabled={!session.isActive}
                                    title={session.isActive ? 'Stop focus session' : 'No active session'}
                                >
                                    Stop
                                </button>
                            </div>
                            <div className="mt-3 text-xs text-white/70">
                                <div>Status: <span className="text-white/85">{session.isActive ? 'Active' : 'Idle'}</span></div>
                                <div>Label: <span className="text-white/85">{session.label ?? '—'}</span></div>
                                <div>Started: <span className="text-white/85">{session.startTime ? new Date(session.startTime).toLocaleTimeString() : '—'}</span></div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-white/45 mb-2">Cycles Lens</div>
                            <div className="text-white/85">{anchorDate.toLocaleDateString()}</div>
                            <div className="text-white/65">Scale: {scale}</div>
                        </div>
                        <div className="grid grid-cols-7 gap-1 rounded-xl border border-white/10 bg-black/20 p-3">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                <div key={day} className="text-[10px] uppercase tracking-[0.18em] text-white/45 text-center py-1">{day}</div>
                            ))}
                            {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                                <div
                                    key={day}
                                    className={`h-8 rounded-md flex items-center justify-center text-xs ${
                                        day === anchorDate.getDate() ? 'bg-white/20 text-white' : 'bg-white/5 text-white/65'
                                    }`}
                                >
                                    {day}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'timeline' && (
                    <div className="flex-1 overflow-auto space-y-4 text-sm">
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-white/45 mb-3">Session Log</div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => startFocusSession(session.label ?? 'Focus')}
                                    className="flex-1 h-10 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/25 uppercase tracking-[0.2em] text-xs"
                                >
                                    Start Focus
                                </button>
                                <button
                                    onClick={() => stopFocusSession()}
                                    className="h-10 px-3 rounded-lg bg-white/10 text-white/70 hover:bg-white/15 uppercase tracking-[0.2em] text-xs"
                                    disabled={!session.isActive}
                                    aria-disabled={!session.isActive}
                                    title={session.isActive ? 'Stop focus session' : 'No active session'}
                                >
                                    Stop
                                </button>
                            </div>
                            <div className="mt-3 text-xs text-white/70">
                                <div>Status: <span className="text-white/85">{session.isActive ? 'Active' : 'Idle'}</span></div>
                                <div>Label: <span className="text-white/85">{session.label ?? '—'}</span></div>
                                <div>Started: <span className="text-white/85">{session.startTime ? new Date(session.startTime).toLocaleTimeString() : '—'}</span></div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <div className="text-xs uppercase tracking-widest text-text-secondary">Temporal Log</div>
                            <div className="mt-1 text-[11px] text-white/45">Updated: {updatedAt}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <div className="mb-2 opacity-50 text-xs uppercase tracking-[0.2em] text-white/45">Today</div>
                            <div className="pl-2 border-l border-white/10 flex flex-col gap-2 font-mono text-xs">
                                <div>10:42 <span className="text-white">Node Created</span></div>
                                <div>09:15 <span className="text-emerald-400">Ritual Complete</span></div>
                                <div>08:31 <span className="text-white/85">Scope Entered</span></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NowCoreDrawer;
