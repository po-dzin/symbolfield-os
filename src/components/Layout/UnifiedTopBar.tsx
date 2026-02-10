import React from 'react';
import BrandChip from './BrandChip';
import ScopeTabs from "./ScopeTabs";
// import BreadcrumbCapsule from './BreadcrumbCapsule';
import NowChip from '../HUD/NowChip';
import RightDrawerCapsule from './RightDrawerCapsule';
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
    const showGlobalRightCluster = viewContext !== 'node';

    return (
        <div className={`topbar-shell justify-between ${className || ''}`}>
            <div className="relative z-[2] flex items-center min-w-0 flex-1">
                {/* Left Cluster: Identity + Where */}
                <BrandChip />
                <ScopeTabs />

                {titleComponent && (
                    <div className="ml-2">
                        {titleComponent}
                    </div>
                )}

                {contextMenuComponent}
                {syncIndicatorComponent}
            </div>

            {showGlobalRightCluster && (
                <div className="relative z-[2] flex items-center gap-3 shrink-0 ml-4">
                    <NowChip />
                    <RightDrawerCapsule />
                </div>
            )}
        </div>
    );
};

export default UnifiedTopBar;
