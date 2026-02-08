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
        <div className="flex items-center gap-[var(--primitive-space-gap-default)]">
            {/* Navigation Controls */}
            <div className="glass-panel flex items-center p-1 gap-1 rounded-[var(--primitive-radius-input)]">
                <button
                    onClick={() => navigate(-1)}
                    className="w-[var(--component-button-height-sm)] h-[var(--component-button-height-sm)] rounded-[var(--primitive-radius-input)] hover:bg-[var(--semantic-color-text-primary)]/10 flex items-center justify-center text-[var(--semantic-color-text-secondary)]"
                >
                    ‹
                </button>

                <button
                    onClick={jumpToToday}
                    className="px-3 h-[var(--component-button-height-sm)] rounded-[var(--primitive-radius-input)] hover:bg-[var(--semantic-color-text-primary)]/10 flex items-center justify-center text-[var(--primitive-type-small-size)] font-medium tracking-wide uppercase text-[var(--semantic-color-text-primary)]"
                >
                    {display}
                </button>

                <button
                    onClick={() => navigate(1)}
                    className="w-[var(--component-button-height-sm)] h-[var(--component-button-height-sm)] rounded-[var(--primitive-radius-input)] hover:bg-[var(--semantic-color-text-primary)]/10 flex items-center justify-center text-[var(--semantic-color-text-secondary)]"
                >
                    ›
                </button>
            </div>

            {/* Scale Selector */}
            <div className="glass-panel flex items-center p-1 rounded-[var(--primitive-radius-input)]">
                {TIME_SCALES.map((s) => (
                    <button
                        key={s}
                        onClick={() => setScale(s)}
                        className={`
              px-2 h-[var(--component-button-height-sm)] rounded-[var(--primitive-radius-input)] text-[10px] uppercase tracking-wider
              transition-colors
              ${scale === s ? 'bg-[var(--semantic-color-text-primary)]/20 text-[var(--semantic-color-text-primary)]' : 'text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)]'}
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
