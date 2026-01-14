/**
 * CommandPalette.jsx
 * Minimal command palette overlay for v0.5.
 */

import React from 'react';
import { useAppStore } from '../../store/useAppStore';

const CommandPalette = () => {
    const paletteOpen = useAppStore(state => state.paletteOpen);
    const closePalette = useAppStore(state => state.closePalette);

    if (!paletteOpen) return null;

    return (
        <div className="absolute inset-0 z-[var(--z-drawer)] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[12vh]">
            <div className="glass-panel w-[420px] p-3 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-widest text-text-secondary">Command Palette</span>
                    <button onClick={closePalette} className="text-text-secondary hover:text-text-primary">✕</button>
                </div>
                <input
                    autoFocus
                    placeholder="Type a command..."
                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-text-primary outline-none"
                />
                <div className="text-xs text-text-meta">
                    Quick actions placeholder (v0.5).
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
