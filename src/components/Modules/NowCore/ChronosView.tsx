import React from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { spaceManager } from '../../../core/state/SpaceManager';

type ChronosEvent = {
    id: string;
    timestamp: number;
    desc: string;
    cat: 'SESSION' | 'SPACE';
};

const toDayKey = (timestamp: number): string => (
    new Date(timestamp).toDateString()
);

const formatDayLabel = (timestamp: number): string => (
    new Date(timestamp).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
);

const formatTimeLabel = (timestamp: number): string => (
    new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
);

export const ChronosView: React.FC = () => {
    const sessionRecords = useAppStore(state => state.sessionRecords);
    const spaces = React.useMemo(
        () => spaceManager.getSpacesWithOptions({ includePlayground: false }),
        [sessionRecords.length]
    );

    const events = React.useMemo<ChronosEvent[]>(() => {
        const sessionEvents: ChronosEvent[] = sessionRecords.map(record => ({
            id: record.id,
            timestamp: record.endedAt,
            desc: `${record.label} completed`,
            cat: 'SESSION'
        }));

        const spaceEvents: ChronosEvent[] = spaces.map(space => ({
            id: `space-${space.id}`,
            timestamp: space.updatedAt,
            desc: `Space "${space.name}" updated`,
            cat: 'SPACE'
        }));

        return [...sessionEvents, ...spaceEvents]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 24);
    }, [sessionRecords, spaces]);

    const grouped = React.useMemo(() => {
        const map = new Map<string, { label: string; events: ChronosEvent[] }>();
        events.forEach((event) => {
            const key = toDayKey(event.timestamp);
            if (!map.has(key)) {
                map.set(key, {
                    label: formatDayLabel(event.timestamp),
                    events: []
                });
            }
            map.get(key)?.events.push(event);
        });
        return Array.from(map.values());
    }, [events]);

    return (
        <div className="flex-1 overflow-auto space-y-6 text-sm no-scrollbar pb-6">
            <div className="flex items-center justify-between px-1">
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--semantic-color-text-secondary)] opacity-60">Temporal Log</div>
                <div className="text-[10px] text-[var(--semantic-color-text-muted)] italic">{events.length} live events</div>
            </div>

            {grouped.length === 0 ? (
                <div className="p-4 rounded-lg border border-[var(--semantic-color-border-default)]/40 text-[11px] text-[var(--semantic-color-text-muted)]">
                    Chronos becomes active after session runs or space updates.
                </div>
            ) : (
                <div className="space-y-8 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-[var(--semantic-color-border-default)]/30">
                    {grouped.map((group) => (
                        <div key={group.label} className="space-y-4">
                            <div className="text-[10px] uppercase tracking-widest font-bold text-[var(--semantic-color-text-muted)] bg-[var(--primitive-color-n0-deepest)] w-fit px-2 ml-1 relative z-10">
                                {group.label}
                            </div>
                            <div className="space-y-6">
                                {group.events.map((event) => (
                                    <div key={event.id} className="relative pl-8 group">
                                        <div className="absolute left-2 top-1.5 w-2 h-2 rounded-full border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)] z-10 group-hover:bg-[var(--semantic-color-text-primary)] transition-colors" />
                                        <div className="flex items-start gap-3">
                                            <span className="text-[11px] font-mono text-[var(--semantic-color-text-muted)] opacity-60 mt-0.5">{formatTimeLabel(event.timestamp)}</span>
                                            <div className="flex-1">
                                                <div className="text-[13px] text-[var(--semantic-color-text-primary)] leading-snug group-hover:translate-x-1 transition-transform">{event.desc}</div>
                                                <div className="text-[9px] uppercase tracking-[0.15em] font-bold text-[var(--semantic-color-text-muted)] opacity-40 mt-1">{event.cat}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
