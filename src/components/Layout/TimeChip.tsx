/**
 * TimeChip.jsx
 * Bottom-right temporal anchor and scale selector.
 */

import React from 'react';
import { useTimeStore } from '../../store/useTimeStore';

const TIME_SCALES: Array<'day' | 'week' | 'month'> = ['day', 'week', 'month'];

const TimeChip = () => {
    const display = useTimeStore(state => state.display);
    const scale = useTimeStore(state => state.scale);
    const setScale = useTimeStore(state => state.setScale);
    const navigate = useTimeStore(state => state.navigate);
    const jumpToToday = useTimeStore(state => state.jumpToToday);

    return (
        <div className="flex items-center gap-2">
            {/* Navigation Controls */}
            <div className="glass-panel flex items-center p-1 gap-1">
                <button
                    onClick={() => navigate(-1)}
                    className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-text-secondary"
                >
                    ‹
                </button>

                <button
                    onClick={jumpToToday}
                    className="px-3 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-sm font-medium tracking-wide uppercase"
                >
                    {display}
                </button>

                <button
                    onClick={() => navigate(1)}
                    className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-text-secondary"
                >
                    ›
                </button>
            </div>

            {/* Scale Selector */}
            <div className="glass-panel flex items-center p-1">
                {TIME_SCALES.map((s) => (
                    <button
                        key={s}
                        onClick={() => setScale(s)}
                        className={`
              px-2 h-8 rounded-lg text-xs uppercase tracking-wider
              transition-colors
              ${scale === s ? 'bg-white/20 text-text-primary' : 'text-text-meta hover:text-text-secondary'}
            `}
                    >
                        {s[0]}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default TimeChip;
