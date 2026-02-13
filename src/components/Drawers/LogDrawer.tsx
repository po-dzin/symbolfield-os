/**
 * LogDrawer.jsx
 * Timeline / Event Log Drawer (Bottom).
 * Toggle via TimeChip or Dock.
 */

import React from 'react';
import { useAppStore } from '../../store/useAppStore';

const LogDrawer = () => {
    const drawerRightOpen = useAppStore(state => state.drawerRightOpen);
    const drawerRightTab = useAppStore(state => state.drawerRightTab);
    const setDrawerOpen = useAppStore(state => state.setDrawerOpen);

    if (!drawerRightOpen || drawerRightTab !== 'log') return null;

    return (
        <div className="absolute bottom-0 left-0 right-0 h-[30vh] z-[var(--component-z-drawer)] animate-slide-up pointer-events-auto">
            <div className="glass-panel w-full h-full rounded-b-none border-b-0 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-2 border-b border-[var(--semantic-color-border-subtle)] bg-[var(--semantic-color-bg-surface-hover)]/40">
                    <span className="text-xs uppercase tracking-widest text-text-secondary">Temporal Log</span>
                    <button onClick={() => setDrawerOpen('right', false)} className="ui-selectable h-7 w-7 rounded-full flex items-center justify-center">✕</button>
                </div>

                {/* Content Placeholder */}
                <div className="flex-1 p-4 overflow-auto">
                    <div className="text-sm text-text-meta font-mono">
                        {/* Mock Timeline */}
                        <div className="mb-2 opacity-50">Today</div>
                        <div className="pl-2 border-l border-[var(--semantic-color-border-subtle)] flex flex-col gap-2">
                            <div>10:42 <span className="text-[var(--semantic-color-text-primary)]">Node Created</span></div>
                            <div>09:15 <span className="text-emerald-400">Ritual Complete</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LogDrawer;
