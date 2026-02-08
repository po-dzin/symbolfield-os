/**
 * StateCore.jsx
 * The Head-Up Display for Session State.
 * Top-right anchor.
 */

import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

type AppModeId = 'deep' | 'flow' | 'luma';

const MODES: Array<{ id: AppModeId; icon: string; label: string }> = [
    { id: 'deep', icon: '🕳', label: 'Deep' },
    { id: 'flow', icon: '🌀', label: 'Flow' },
    { id: 'luma', icon: '🔆', label: 'Luma' }
];

const StateCore = () => {
    const appMode = useAppStore(state => state.appMode);
    const setAppMode = useAppStore(state => state.setAppMode);

    // Local UI state for expanded/micro mode interactions
    const [isExpanded, setExpanded] = useState(false);

    const currentMode = MODES.find(m => m.id === appMode) || MODES[0]!;

    return (
        <div
            className="glass-panel p-[var(--primitive-space-gap-dense)] flex flex-col items-end transition-all duration-300 ease-out rounded-[var(--primitive-radius-card)]"
            onMouseEnter={() => setExpanded(true)}
            onMouseLeave={() => setExpanded(false)}
        >
            {/* Micro Mode: Just the Icon */}
            <div className="flex items-center gap-[var(--primitive-space-gap-default)] p-[var(--primitive-space-gap-dense)] cursor-pointer">
                <span className="text-[var(--primitive-type-label-size)] uppercase text-[var(--semantic-color-text-secondary)] tracking-widest opacity-60">
                    {isExpanded ? 'Session' : ''}
                </span>
                <div className="w-[var(--primitive-size-control-size)] h-[var(--primitive-size-control-size)] flex items-center justify-center text-lg animate-pulse-soft text-[var(--semantic-color-text-primary)]">
                    {currentMode.icon}
                </div>
            </div>

            {/* Expanded Actions */}
            {isExpanded && (
                <div className="flex flex-col gap-[var(--primitive-space-gap-dense)] p-[var(--primitive-space-gap-dense)] animate-slide-in">
                    <div className="h-[1px] bg-[var(--semantic-color-border-default)] w-full my-1" />

                    <div className="flex gap-[var(--primitive-space-gap-dense)]">
                        {MODES.map(mode => (
                            <button
                                key={mode.id}
                                onClick={() => setAppMode(mode.id)}
                                className={`
                  w-[var(--primitive-size-control-size)] h-[var(--primitive-size-control-size)] rounded-[var(--primitive-radius-input)] flex items-center justify-center text-sm
                  transition-colors
                  ${appMode === mode.id ? 'bg-[var(--semantic-color-bg-surface)] text-[var(--semantic-color-text-primary)] border border-[var(--semantic-color-border-default)]' : 'hover:bg-[var(--semantic-color-bg-surface)]/50 opacity-50 hover:opacity-100 text-[var(--semantic-color-text-secondary)]'}
                `}
                                title={mode.label}
                            >
                                {mode.icon}
                            </button>
                        ))}
                    </div>

                    {/* Mock Focus Session Button */}
                    <button className="mt-2 w-full py-2 bg-[var(--semantic-color-status-success)]/10 hover:bg-[var(--semantic-color-status-success)]/20 text-[var(--semantic-color-status-success)] text-[var(--primitive-type-label-size)] rounded-[var(--primitive-radius-input)] uppercase tracking-wider border border-[var(--semantic-color-status-success)]/20 transition-colors">
                        Start Focus
                    </button>
                </div>
            )}
        </div>
    );
};

export default StateCore;
