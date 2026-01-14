/**
 * SettingsDrawer.jsx
 * Minimal settings panel for v0.5.
 */

import React from 'react';
import { useAppStore } from '../../store/useAppStore';

const SettingsDrawer = () => {
    const settingsOpen = useAppStore(state => state.settingsOpen);
    const closeSettings = useAppStore(state => state.closeSettings);

    if (!settingsOpen) return null;

    return (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 ml-16 w-80 z-[var(--z-drawer)] animate-slide-in">
            <div className="glass-panel p-3 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-widest text-text-secondary">Settings</span>
                    <button onClick={closeSettings} className="text-text-secondary hover:text-text-primary">✕</button>
                </div>
                <div className="text-sm text-text-meta">
                    Settings UI placeholder (v0.5). Hotkeys, themes, and presets will live here.
                </div>
            </div>
        </div>
    );
};

export default SettingsDrawer;
