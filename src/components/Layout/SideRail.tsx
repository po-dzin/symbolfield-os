import React from 'react';
import { useAppStore } from '../../store/useAppStore';

const SideRail: React.FC = () => {
    const drawerRightOpen = useAppStore(state => state.drawerRightOpen);
    const drawerRightTab = useAppStore(state => state.drawerRightTab);
    const setDrawerOpen = useAppStore(state => state.setDrawerOpen);
    const setDrawerRightTab = useAppStore(state => state.setDrawerRightTab);

    type ModuleId = 'now' | 'props' | 'ai' | 'signals';

    const modules: { id: ModuleId; icon: string; label: string }[] = [
        { id: 'now', icon: '⏱', label: 'NowCore' },
        { id: 'props', icon: '📋', label: 'Properties' },
        { id: 'ai', icon: '✨', label: 'AI' },
        { id: 'signals', icon: '📊', label: 'Signals' },
    ];

    const handleModuleClick = (moduleId: ModuleId) => {
        if (drawerRightOpen && drawerRightTab === moduleId) {
            // Close if clicking active module
            setDrawerOpen('right', false);
        } else {
            // Open and switch to module
            setDrawerRightTab(moduleId); // Need to ensure store type accepts these IDs
            setDrawerOpen('right', true);
        }
    };

    return (
        <div className="fixed right-0 top-[var(--component-topbar-height)] bottom-0 w-[var(--component-rail-width)] bg-[var(--semantic-color-bg-surface)] border-l border-[var(--semantic-color-border-default)] z-[var(--component-z-rail)] flex flex-col items-center py-4 gap-4">
            {modules.map(mod => {
                const isActive = drawerRightOpen && drawerRightTab === mod.id;

                return (
                    <button
                        key={mod.id}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation(); // Stop bubbling just in case
                            handleModuleClick(mod.id);
                        }}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all relative group outline-none cursor-pointer select-none ${isActive
                            ? 'bg-[var(--semantic-color-bg-app)] text-[var(--semantic-color-action-primary)] ring-1 ring-[var(--semantic-color-border-subtle)]'
                            : 'text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)] hover:bg-[var(--semantic-color-bg-app)]/50'
                            }`}
                        title={mod.label}
                        type="button"
                    >
                        <span className="text-xl leading-none flex items-center justify-center w-full h-full pointer-events-none">
                            {mod.icon}
                        </span>

                        {/* Active Indicator (Right Edge) */}
                        {isActive && (
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[var(--semantic-color-action-primary)] rounded-l-full" />
                        )}

                        {/* Tooltip (Left) */}
                        <div className="absolute right-full mr-3 px-2 py-1 bg-[var(--primitive-color-n0-deepest)] border border-[var(--semantic-color-border-default)] rounded text-xs text-[var(--semantic-color-text-primary)] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[200] shadow-lg">
                            {mod.label}
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

export default SideRail;
