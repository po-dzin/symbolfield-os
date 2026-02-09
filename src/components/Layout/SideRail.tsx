import React from 'react';
import { useAppStore } from '../../store/useAppStore';

const SideRail = () => {
    const drawerRightOpen = useAppStore(state => state.drawerRightOpen);
    const setDrawerOpen = useAppStore(state => state.setDrawerOpen);
    const drawerRightTab = useAppStore(state => state.drawerRightTab);
    const setDrawerRightTab = useAppStore(state => state.setDrawerRightTab);

    type ModuleId = 'now' | 'props' | 'ai' | 'signals';

    const modules = [
        {
            id: 'now',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                </svg>
            ),
            label: 'Now'
        },
        {
            id: 'props',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
            ),
            label: 'Properties'
        },
        {
            id: 'ai',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
            ),
            label: 'AI'
        },
        {
            id: 'signals',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
            ),
            label: 'Signals'
        },
    ];

    const handleModuleClick = (moduleId: ModuleId) => {
        if (drawerRightOpen && drawerRightTab === moduleId) {
            setDrawerOpen('right', false);
        } else {
            setDrawerRightTab(moduleId);
            setDrawerOpen('right', true);
        }
    };

    return (
        <div className="glass-base fixed top-[var(--component-topbar-height)] bottom-0 right-0 w-[var(--component-rail-width)] border-l border-[var(--semantic-color-border-default)] z-[var(--component-z-rail)] flex flex-col items-center py-4 gap-4 pointer-events-auto">
            {modules.map((mod) => {
                const isActive = drawerRightOpen && drawerRightTab === mod.id;
                return (
                    <button
                        key={mod.id}
                        onClick={() => handleModuleClick(mod.id as ModuleId)}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all relative group outline-none cursor-pointer select-none ${isActive
                            ? 'bg-[var(--semantic-color-bg-app)] text-[var(--semantic-color-action-primary)] ring-1 ring-[var(--semantic-color-border-subtle)]'
                            : 'text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)] hover:bg-[var(--semantic-color-bg-app)]/50'
                            }`}
                        type="button"
                    >
                        <span className="flex items-center justify-center w-full h-full pointer-events-none">
                            {mod.icon}
                        </span>

                        {/* Tooltip */}
                        <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-[var(--semantic-color-bg-popover)] text-[var(--semantic-color-text-primary)] text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-[var(--semantic-color-border-default)] pointer-events-none z-50">
                            {mod.label}
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

export default SideRail;
