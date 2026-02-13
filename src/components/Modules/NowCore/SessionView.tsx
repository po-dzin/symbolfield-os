import React from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { useTimeStore } from '../../../store/useTimeStore';
import { formatElapsedDuration } from '../../../core/time/sessionTime';

const SessionTimer = ({ startTime }: { startTime: number }) => {
    const [elapsed, setElapsed] = React.useState('00:00:00');

    React.useEffect(() => {
        const update = () => {
            const diff = Date.now() - startTime;
            setElapsed(formatElapsedDuration(diff));
        };

        update();
        const timer = setInterval(update, 1000);
        return () => clearInterval(timer);
    }, [startTime]);

    return <span>{elapsed}</span>;
};

export const SessionView: React.FC = () => {
    const session = useAppStore(state => state.session);
    const startFocusSession = useAppStore(state => state.startFocusSession);
    const stopFocusSession = useAppStore(state => state.stopFocusSession);
    const appMode = useAppStore(state => state.appMode);
    const setAppMode = useAppStore(state => state.setAppMode);
    const fieldScopeId = useAppStore(state => state.fieldScopeId);
    const sessionRecords = useAppStore(state => state.sessionRecords);
    const scale = useTimeStore(state => state.scale);
    const display = useTimeStore(state => state.display);

    const records = React.useMemo(() => (
        sessionRecords
            .slice(0, 8)
            .map(record => ({
                id: record.id,
                label: record.label,
                duration: formatElapsedDuration(record.durationMs),
                date: new Date(record.endedAt).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric'
                })
            }))
    ), [sessionRecords]);

    return (
        <div className="flex-1 overflow-auto space-y-6 text-sm no-scrollbar pb-6">
            {/* System Status Section */}
            <div className="space-y-4">
                <div className="glass-panel glass-panel-strong p-5 rounded-[var(--component-panel-radius)] border border-[var(--semantic-color-border-default)]">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--semantic-color-text-secondary)] mb-4 flex items-center justify-between">
                        <span>System Mode</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] ${session.isActive ? 'bg-[var(--semantic-color-status-success)]/20 text-[var(--semantic-color-status-success)]' : 'bg-[var(--semantic-color-text-muted)]/10 text-[var(--semantic-color-text-muted)]'}`}>
                            {session.isActive ? 'FOCUS_ACTIVE' : 'IDLE'}
                        </span>
                    </div>
                    <div className="flex gap-[var(--primitive-space-gap-dense)]">
                        {(['deep', 'flow', 'luma'] as const).map(mode => (
                            <button
                                key={mode}
                                onClick={() => setAppMode(mode)}
                                data-state={appMode === mode ? 'active' : 'inactive'}
                                className="ui-selectable flex-1 h-12 rounded-[var(--primitive-radius-input)] flex flex-col items-center justify-center gap-1"
                            >
                                <span className="text-lg">{mode === 'deep' ? '🕳' : mode === 'flow' ? '🌀' : '🔆'}</span>
                                <span className="text-[9px] uppercase tracking-widest font-bold">{mode}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="glass-panel-subtle p-5 rounded-[var(--component-panel-radius)] border border-[var(--semantic-color-border-default)]/50">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--semantic-color-text-secondary)] mb-4 flex items-center justify-between">
                        <span>Current Session</span>
                        {session.startTime && <span className="font-mono text-[9px] opacity-60">{new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                    </div>
                    <div className="space-y-5">
                        <div className="flex justify-between items-center">
                            <div className="text-xl font-medium text-[var(--semantic-color-text-primary)] leading-none italic truncate mr-4">{session.label ?? 'Deep Field Sync'}</div>
                            <button
                                onClick={() => session.isActive ? stopFocusSession() : startFocusSession('New Session')}
                                className={`h-9 px-4 rounded-full text-[10px] uppercase tracking-widest font-bold transition-colors border ${session.isActive
                                    ? 'bg-[var(--semantic-color-status-warning)]/75 text-[var(--semantic-color-action-on-primary)] border-[var(--semantic-color-status-warning)] hover:bg-[var(--semantic-color-status-warning)]/85'
                                    : 'bg-[var(--semantic-color-action-primary)] text-[var(--semantic-color-action-on-primary)] border-[var(--semantic-color-action-primary)] hover:brightness-105'
                                    }`}
                            >
                                {session.isActive ? 'Stop' : 'Start'}
                            </button>
                        </div>

                        <div className="space-y-2">
                            <div className="h-[1px] w-full bg-[var(--semantic-color-text-primary)]/10" />
                            <div className="flex justify-between items-center text-[10px] text-[var(--semantic-color-text-muted)] uppercase tracking-wider">
                                <span className="flex items-center gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${session.isActive ? 'bg-[var(--semantic-color-status-success)] animate-pulse' : 'bg-[var(--semantic-color-text-muted)]'}`} />
                                    {session.isActive ? 'Active' : 'Idle'}
                                </span>
                                <span className="font-mono text-[var(--semantic-color-text-primary)] text-xs">
                                    {session.isActive ? <SessionTimer startTime={session.startTime!} /> : '00:00:00'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-1 space-y-3 opacity-80 pb-6 border-b border-[var(--semantic-color-border-default)]/30">
                    <div className="flex justify-between text-[11px]">
                        <span className="text-[var(--semantic-color-text-muted)] uppercase tracking-widest">Scope</span>
                        <span className="text-[var(--semantic-color-text-primary)] font-mono">{fieldScopeId?.slice(0, 8) ?? 'FIELD_0'}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                        <span className="text-[var(--semantic-color-text-muted)] uppercase tracking-widest">Scale</span>
                        <span className="text-[var(--semantic-color-text-primary)] uppercase font-bold tracking-tighter">{scale}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                        <span className="text-[var(--semantic-color-text-muted)] uppercase tracking-widest">Anchor</span>
                        <span className="text-[var(--semantic-color-text-primary)]">{display}</span>
                    </div>
                </div>

                {/* Session History Section */}
                <div className="space-y-5 pt-2">
                    <div className="flex items-center justify-between px-1">
                        <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--semantic-color-text-secondary)] opacity-60">Session Records</div>
                        <div className="text-[9px] uppercase tracking-widest text-[var(--semantic-color-text-muted)]">{records.length} tracked</div>
                    </div>
                    <div className="space-y-1">
                        {records.length === 0 && (
                            <div className="p-3 rounded-lg border border-[var(--semantic-color-border-default)]/40 text-[11px] text-[var(--semantic-color-text-muted)]">
                                No completed sessions yet. Start and stop a focus session to build timeline history.
                            </div>
                        )}
                        {records.map((record) => (
                            <div key={record.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--semantic-color-bg-surface-hover)] transition-colors group cursor-pointer border border-transparent hover:border-[var(--semantic-color-border-default)]">
                                <div className="min-w-0 flex-1 pr-4">
                                    <div className="text-[13px] text-[var(--semantic-color-text-primary)] font-medium truncate">{record.label}</div>
                                    <div className="text-[9px] uppercase tracking-tight text-[var(--semantic-color-text-muted)] mt-0.5">{record.date}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[11px] font-mono text-[var(--semantic-color-text-primary)] font-bold">{record.duration}</div>
                                    <div className="text-[9px] uppercase text-[var(--semantic-color-text-muted)] opacity-40">Duration</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
