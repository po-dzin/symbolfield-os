import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import {
    RIGHT_DRAWER_MODULES,
    mapDrawerRightTabToPrimary,
    resolveDrawerTabForPrimary,
    type PrimaryDrawerModule
} from './rightDrawerModules';

const SideRail = () => {
    const drawerRightOpen = useAppStore(state => state.drawerRightOpen);
    const setDrawerOpen = useAppStore(state => state.setDrawerOpen);
    const drawerRightTab = useAppStore(state => state.drawerRightTab);
    const setDrawerRightTab = useAppStore(state => state.setDrawerRightTab);

    const handleModuleClick = (moduleId: PrimaryDrawerModule) => {
        if (drawerRightOpen && mapDrawerRightTabToPrimary(drawerRightTab) === moduleId) {
            setDrawerOpen('right', false);
        } else {
            setDrawerRightTab(resolveDrawerTabForPrimary(moduleId, drawerRightTab));
            setDrawerOpen('right', true);
        }
    };

    return (
        <div className="glass-base fixed top-[var(--component-topbar-height)] bottom-0 right-0 w-[var(--component-rail-width)] border-l border-[var(--semantic-color-border-default)] z-[var(--component-z-rail)] flex flex-col items-center py-4 gap-4 pointer-events-auto">
            {RIGHT_DRAWER_MODULES.map((mod) => {
                const isActive = drawerRightOpen && mapDrawerRightTabToPrimary(drawerRightTab) === mod.id;
                return (
                    <button
                        key={mod.id}
                        onClick={() => handleModuleClick(mod.id)}
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
