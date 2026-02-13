import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { formatElapsedMinutes } from '../../core/time/sessionTime';

const NowChip = () => {
    const appMode = useAppStore(state => state.appMode);
    const setAppMode = useAppStore(state => state.setAppMode);
    const session = useAppStore(state => state.session);
    const sessionRecords = useAppStore(state => state.sessionRecords);
    const drawerRightOpen = useAppStore(state => state.drawerRightOpen);
    const drawerRightTab = useAppStore(state => state.drawerRightTab);
    const setDrawerRightTab = useAppStore(state => state.setDrawerRightTab);
    const setDrawerOpen = useAppStore(state => state.setDrawerOpen);

    const [now, setNow] = useState(() => Date.now());

    React.useEffect(() => {
        const tickMs = session.isActive ? 1000 : 60000;
        const timer = window.setInterval(() => setNow(Date.now()), tickMs);
        return () => window.clearInterval(timer);
    }, [session.isActive, session.startTime]);

    const timerLabel = React.useMemo(() => {
        if (session.isActive && session.startTime) {
            return formatElapsedMinutes(now - session.startTime);
        }
        const dayStart = new Date(now);
        dayStart.setHours(0, 0, 0, 0);
        const dayStartMs = dayStart.getTime();
        const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000;
        const todayDurationMs = sessionRecords.reduce((sum, record) => {
            const start = Math.max(record.startedAt, dayStartMs);
            const end = Math.min(record.endedAt, dayEndMs);
            if (end <= start) return sum;
            return sum + (end - start);
        }, 0);
        if (todayDurationMs > 0) {
            return `${Math.floor(todayDurationMs / 60000)}m`;
        }
        return new Date(now).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }, [now, session.isActive, session.startTime, sessionRecords]);

    const getModeIcon = (mode: string) => {
        switch (mode) {
            case 'deep': return '🕳';
            case 'flow': return '🌀';
            case 'luma': return '🔆';
            default: return '☉';
        }
    };

    const handleClick = () => {
        if (drawerRightOpen && drawerRightTab === 'now') {
            setDrawerOpen('right', false);
        } else {
            setDrawerRightTab('now');
            setDrawerOpen('right', true);
        }
    }

    return (
        <button
            onClick={handleClick}
            className="flex items-center gap-2 px-2.5 h-8 ui-shape-pill bg-[var(--semantic-color-bg-surface)] border border-[var(--semantic-color-border-default)] hover:border-[var(--semantic-color-text-secondary)] transition-all shadow-sm group"
        >
            <span
                className="text-sm cursor-pointer hover:scale-110 transition-transform select-none"
                title="Switch mode"
                onClick={(e) => {
                    e.stopPropagation();
                    const modes: Array<'deep' | 'flow' | 'luma'> = ['deep', 'flow', 'luma'];
                    const currentIdx = modes.indexOf(appMode);
                    const nextMode = modes[(currentIdx + 1) % modes.length];
                    if (nextMode) {
                        setAppMode(nextMode);
                    }
                }}
            >
                {getModeIcon(appMode)}
            </span>
            <div className="flex items-center gap-1 text-[var(--semantic-color-text-primary)] font-medium text-xs">
                <span>{timerLabel}</span>
                <span
                    className={`w-1.5 h-1.5 rounded-full ${session.isActive ? 'bg-[var(--semantic-color-status-success)]' : 'bg-[var(--semantic-color-text-muted)]/55'}`}
                    title={session.isActive ? 'Session active' : 'Session inactive'}
                />
            </div>
        </button>
    );
};

export default NowChip;
