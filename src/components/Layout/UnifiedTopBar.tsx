import React from 'react';
import BrandChip from './BrandChip';
import BreadcrumbCapsule from './BreadcrumbCapsule';
import NowChip from '../HUD/NowChip';
import DrawerToggle from './DrawerToggle';
import { useAppStore } from '../../store/useAppStore';

interface UnifiedTopBarProps {
    /** Optional title input component (for rename functionality) */
    titleComponent?: React.ReactNode;
    /** Optional context menu button */
    contextMenuComponent?: React.ReactNode;
    /** Optional sync indicator */
    syncIndicatorComponent?: React.ReactNode;
    /** Optional style override */
    className?: string;
}

const UnifiedTopBar: React.FC<UnifiedTopBarProps> = ({
    titleComponent,
    contextMenuComponent,
    syncIndicatorComponent,
    className
}) => {
    const viewContext = useAppStore(state => state.viewContext);

    return (
        <div className={`topbar-shell justify-between ${className || ''}`}>
            {/* Left Cluster: Identity + Where */}
            <div className="flex items-center gap-[var(--primitive-space-bar-gap)]">
                <BrandChip />
                <BreadcrumbCapsule />

                {titleComponent && (
                    <div className="ml-2">
                        {titleComponent}
                    </div>
                )}

                {contextMenuComponent}
                {syncIndicatorComponent}
            </div>

            {/* Right Cluster: Now + Panel */}
            <div className="flex items-center gap-3">
                <NowChip />
                <DrawerToggle />
            </div>
        </div>
    );
};

export default UnifiedTopBar;
