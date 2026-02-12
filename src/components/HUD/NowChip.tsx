import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

const NowChip = () => {
    const appMode = useAppStore(state => state.appMode);
    const drawerRightOpen = useAppStore(state => state.drawerRightOpen);
    const drawerRightTab = useAppStore(state => state.drawerRightTab);
    const setDrawerRightTab = useAppStore(state => state.setDrawerRightTab);
    const setDrawerOpen = useAppStore(state => state.setDrawerOpen);

    // Mock timer for v0.5 demonstration
    const [timer] = useState('24m');

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
            className="flex items-center gap-2 px-3 ui-capsule-compact ui-shape-pill bg-[var(--semantic-color-bg-surface)] border border-[var(--semantic-color-border-default)] hover:border-[var(--semantic-color-text-secondary)] transition-all shadow-sm group"
        >
            <span className="text-[10px] font-bold text-[var(--semantic-color-text-muted)] uppercase tracking-wider">Now</span>
            <div className="flex items-center gap-1.5 ml-1">
                <span
                    className="text-sm cursor-pointer hover:scale-110 transition-transform select-none"
                    title="Switch Essence (Mode)"
                    onClick={(e) => {
                        e.stopPropagation();
                        // Cycle modes: deep -> flow -> luma -> deep
                        const modes: Array<'deep' | 'flow' | 'luma'> = ['deep', 'flow', 'luma'];
                        const currentIdx = modes.indexOf(appMode);
                        const nextMode = modes[(currentIdx + 1) % modes.length];
                        if (nextMode) {
                            useAppStore.getState().setAppMode(nextMode);
                        }
                    }}
                >
                    {getModeIcon(appMode)}
                </span>
                <div className="w-2 h-2 rounded-full bg-[var(--semantic-color-status-success)]" title="Tone" />
                <span className="text-[var(--semantic-color-text-secondary)] opacity-30">|</span>
                <div className="flex items-center gap-1 text-[var(--semantic-color-text-primary)] font-medium text-xs">
                    <span>⏱</span>
                    <span>{timer}</span>
                </div>
            </div>
        </button>
    );
};

export default NowChip;
