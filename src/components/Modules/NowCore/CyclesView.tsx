import React from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { useTimeStore } from '../../../store/useTimeStore';
import { spaceManager } from '../../../core/state/SpaceManager';
import { formatElapsedDuration } from '../../../core/time/sessionTime';

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const isSameMonth = (value: number, anchor: Date): boolean => {
    const date = new Date(value);
    return date.getFullYear() === anchor.getFullYear() && date.getMonth() === anchor.getMonth();
};

const formatDayLabel = (value: number): string => (
    new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' })
);

export const CyclesView: React.FC = () => {
    const anchorDate = useTimeStore(state => state.anchorDate);
    const navigate = useTimeStore(state => state.navigate);
    const jumpToToday = useTimeStore(state => state.jumpToToday);
    const sessionRecords = useAppStore(state => state.sessionRecords);

    const spaces = React.useMemo(
        () => spaceManager.getSpacesWithOptions({ includePlayground: false }),
        [sessionRecords.length]
    );

    const monthTitle = React.useMemo(
        () => anchorDate.toLocaleDateString([], { month: 'short', year: 'numeric' }),
        [anchorDate]
    );

    const days = React.useMemo(() => {
        const year = anchorDate.getFullYear();
        const month = anchorDate.getMonth();
        const first = new Date(year, month, 1);
        const total = new Date(year, month + 1, 0).getDate();
        const leading = first.getDay();
        const values: Array<number | null> = [];
        for (let i = 0; i < leading; i += 1) values.push(null);
        for (let day = 1; day <= total; day += 1) {
            values.push(new Date(year, month, day).getTime());
        }
        return values;
    }, [anchorDate]);

    const activityByDay = React.useMemo(() => {
        const activity = new Map<string, number>();
        const mark = (value: number) => {
            if (!isSameMonth(value, anchorDate)) return;
            const key = new Date(value).toDateString();
            activity.set(key, (activity.get(key) ?? 0) + 1);
        };

        sessionRecords.forEach(record => {
            mark(record.endedAt);
        });
        spaces.forEach(space => {
            mark(space.updatedAt);
            mark(space.createdAt);
        });

        return activity;
    }, [anchorDate, sessionRecords, spaces]);

    const monthlySummary = React.useMemo(() => {
        const created = spaces.filter(space => isSameMonth(space.createdAt, anchorDate)).length;
        const modified = spaces.filter(space => isSameMonth(space.updatedAt, anchorDate)).length;
        const durationMs = sessionRecords
            .filter(record => isSameMonth(record.endedAt, anchorDate))
            .reduce((sum, record) => sum + record.durationMs, 0);
        return {
            created,
            modified,
            durationLabel: durationMs > 0 ? formatElapsedDuration(durationMs) : '00:00:00'
        };
    }, [anchorDate, sessionRecords, spaces]);

    const recentActivity = React.useMemo(() => {
        const sessionItems = sessionRecords.slice(0, 4).map(record => ({
            id: record.id,
            name: record.label,
            time: formatDayLabel(record.endedAt),
            type: 'Session'
        }));
        const spaceItems = spaces
            .slice()
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .slice(0, 4)
            .map(space => ({
                id: `space-${space.id}`,
                name: space.name,
                time: formatDayLabel(space.updatedAt),
                type: 'Space'
            }));
        return [...sessionItems, ...spaceItems]
            .sort((a, b) => b.time.localeCompare(a.time))
            .slice(0, 6);
    }, [sessionRecords, spaces]);

    return (
        <div className="flex-1 overflow-auto space-y-8 text-sm no-scrollbar pb-6">
            <div className="glass-panel glass-panel-strong p-6 rounded-[var(--component-panel-radius)] border border-[var(--semantic-color-border-default)]">
                <div className="flex items-center justify-between mb-6">
                    <button className="text-[10px] text-[var(--semantic-color-text-muted)] transition-colors uppercase tracking-[0.2em] font-bold">{monthTitle}</button>
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/10 text-xs"
                        >
                            {'<'}
                        </button>
                        <button
                            type="button"
                            onClick={jumpToToday}
                            className="px-2 text-[9px] uppercase tracking-widest font-bold opacity-60 hover:opacity-100 transition-opacity"
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate(1)}
                            className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/10 text-xs"
                        >
                            {'>'}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-1">
                    {WEEKDAY_LABELS.map(day => (
                        <div key={day} className="text-[9px] uppercase tracking-widest text-[var(--semantic-color-text-muted)] text-center py-2 font-bold">{day}</div>
                    ))}
                    {days.map((timestamp, index) => {
                        if (!timestamp) {
                            return <div key={`blank-${index}`} className="h-10" />;
                        }
                        const date = new Date(timestamp);
                        const key = date.toDateString();
                        const activityCount = activityByDay.get(key) ?? 0;
                        const isToday = key === new Date().toDateString();

                        return (
                            <button
                                key={key}
                                type="button"
                                className={`relative h-10 rounded-lg flex flex-col items-center justify-center text-xs transition-all border ${isToday
                                    ? 'bg-[var(--semantic-color-action-primary)]/20 text-[var(--semantic-color-action-primary)] font-bold border-[var(--semantic-color-action-primary)]/30'
                                    : activityCount > 0
                                        ? 'border-transparent hover:bg-white/5 text-[var(--semantic-color-text-secondary)]'
                                        : 'border-transparent text-[var(--semantic-color-text-muted)] opacity-40 hover:opacity-100'
                                    }`}
                            >
                                <span>{date.getDate()}</span>
                                {activityCount > 0 && !isToday && (
                                    <div className="absolute bottom-1.5 flex gap-0.5">
                                        <div className="w-1 h-1 rounded-full bg-[var(--semantic-color-text-primary)]/60" />
                                        {activityCount > 1 && <div className="w-1 h-1 rounded-full bg-[var(--semantic-color-action-primary)]/60" />}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="mt-8 flex justify-between px-2">
                    <div className="text-center">
                        <div className="text-[var(--semantic-color-text-secondary)] text-[10px] uppercase font-bold tracking-widest opacity-60">Created</div>
                        <div className="text-lg font-mono text-[var(--semantic-color-text-primary)]">{monthlySummary.created}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-[var(--semantic-color-text-secondary)] text-[10px] uppercase font-bold tracking-widest opacity-60">Modified</div>
                        <div className="text-lg font-mono text-[var(--semantic-color-status-success)]">{monthlySummary.modified}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-[var(--semantic-color-text-secondary)] text-[10px] uppercase font-bold tracking-widest opacity-60">Time</div>
                        <div className="text-lg font-mono text-[var(--semantic-color-text-primary)]">{monthlySummary.durationLabel}</div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--semantic-color-text-secondary)] opacity-60 px-1">Cycle Activity</div>
                <div className="space-y-3">
                    {recentActivity.length === 0 && (
                        <div className="p-3 rounded-lg border border-[var(--semantic-color-border-default)]/40 text-[11px] text-[var(--semantic-color-text-muted)]">
                            Activity will appear after session runs or space updates.
                        </div>
                    )}
                    {recentActivity.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 group cursor-pointer hover:bg-white/5 p-2 -mx-2 rounded-lg transition-all">
                            <div className="w-8 h-8 rounded-lg bg-[var(--semantic-color-text-primary)]/5 flex items-center justify-center text-[var(--semantic-color-text-muted)] group-hover:text-[var(--semantic-color-text-primary)]">
                                {item.type === 'Session' ? '◉' : '⬡'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[13px] text-[var(--semantic-color-text-primary)] font-medium truncate">{item.name}</div>
                                <div className="text-[10px] text-[var(--semantic-color-text-muted)] uppercase tracking-wider">{item.type}</div>
                            </div>
                            <div className="text-[10px] font-mono text-[var(--semantic-color-text-muted)]">{item.time}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
