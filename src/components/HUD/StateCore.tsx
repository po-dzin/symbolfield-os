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
            className="glass-panel p-1 flex flex-col items-end transition-all duration-300 ease-out"
            onMouseEnter={() => setExpanded(true)}
            onMouseLeave={() => setExpanded(false)}
        >
            {/* Micro Mode: Just the Icon */}
            <div className="flex items-center gap-2 p-1 cursor-pointer">
                <span className="text-xs uppercase text-text-secondary tracking-widest opacity-60">
                    {isExpanded ? 'Session' : ''}
                </span>
                <div className="w-8 h-8 flex items-center justify-center text-lg animate-pulse-soft">
                    {currentMode.icon}
                </div>
            </div>

            {/* Expanded Actions */}
            {isExpanded && (
                <div className="flex flex-col gap-1 p-1 animate-slide-in">
                    <div className="h-[1px] bg-white/10 w-full my-1" />

                    <div className="flex gap-1">
                        {MODES.map(mode => (
                            <button
                                key={mode.id}
                                onClick={() => setAppMode(mode.id)}
                                className={`
                  w-8 h-8 rounded-lg flex items-center justify-center text-sm
                  transition-colors
                  ${appMode === mode.id ? 'bg-white/20' : 'hover:bg-white/10 opacity-50 hover:opacity-100'}
                `}
                                title={mode.label}
                            >
                                {mode.icon}
                            </button>
                        ))}
                    </div>

                    {/* Mock Focus Session Button */}
                    <button className="mt-2 w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs rounded uppercase tracking-wider">
                        Start Focus
                    </button>
                </div>
            )}
        </div>
    );
};

export default StateCore;
