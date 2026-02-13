import React from 'react';
import BrandChip from './BrandChip';
import ScopeTabs from "./ScopeTabs";
import TopbarActionMenu from './TopbarActionMenu';
// import BreadcrumbCapsule from './BreadcrumbCapsule';
import NowChip from '../HUD/NowChip';
import RightDrawerCapsule from './RightDrawerCapsule';
import TopbarShareButton from './TopbarShareButton';
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
    const showNowCluster = viewContext !== 'node';
    const showShare = viewContext === 'space' || viewContext === 'cluster' || viewContext === 'node';
    const showGlobalRightCluster = showNowCluster || showShare;

    return (
        <div className={`topbar-shell justify-between ${className || ''}`}>
            <div className="relative z-[2] flex items-center min-w-0 flex-1">
                {/* Left Cluster: Identity + Where */}
                <BrandChip />
                <ScopeTabs />
                <TopbarActionMenu />

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
                    {showNowCluster && (
                        <NowChip />
                    )}
                    {showShare && <TopbarShareButton />}
                    {showNowCluster && <RightDrawerCapsule />}
                </div>
            )}
        </div>
    );
};

export default UnifiedTopBar;
