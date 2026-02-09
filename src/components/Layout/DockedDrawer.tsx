import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import NowCorePanel from '../Modules/NowCore/NowCorePanel';
import PropertiesPanel from '../Modules/Properties/PropertiesPanel';
import SignalsPanel from '../Modules/Signals/SignalsPanel';
import EmptyModuleState from '../Common/EmptyModuleState';

// Temporary until real panels are implemented
const PropsPanelPlaceholder = () => <div className="p-4">Properties Panel (Coming Soon)</div>;
const AIPanelPlaceholder = () => <div className="p-4">AI Panel (Coming Soon)</div>;
const SignalsPanelPlaceholder = () => <div className="p-4">Signals Panel (Coming Soon)</div>;

const DockedDrawer: React.FC = () => {
    const drawerRightOpen = useAppStore(state => state.drawerRightOpen);
    const drawerRightWidthPx = useAppStore(state => state.drawerRightWidthPx);
    const setDrawerWidthPx = useAppStore(state => state.setDrawerWidthPx);
    const drawerRightTab = useAppStore(state => state.drawerRightTab);

    const [isResizing, setIsResizing] = useState(false);

    // Resize Logic
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = window.innerWidth - e.clientX - 48; // 48 is rail width
            // Constrain width
            if (newWidth >= 320 && newWidth <= 800) {
                setDrawerWidthPx('right', newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.style.cursor = 'default';
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, setDrawerWidthPx]);

    const startResize = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    };

    if (!drawerRightOpen) return null;

    // Define which tabs handle their own headers
    const tabsWithCustomHeaders = ['now', 'cycles', 'chronos', 'props', 'signals'];
    const showDefaultHeader = !tabsWithCustomHeaders.includes(drawerRightTab || '');

    return (
        <div
            className="fixed top-[var(--component-topbar-height)] bottom-0 right-[var(--component-rail-width)] bg-[var(--semantic-color-bg-surface)] border-l border-[var(--semantic-color-border-default)] z-[var(--component-z-drawer)] shadow-2xl flex flex-col"
            style={{ width: drawerRightWidthPx }}
        >
            {/* Resize Handle */}
            {/* <div
                onMouseDown={startResize}
                className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--semantic-color-action-primary)] transition-colors z-50 group"
            >
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[var(--semantic-color-border-default)] group-hover:bg-[var(--semantic-color-action-primary)] rounded-full translate-x-[-2px] transition-colors" />
            </div> */}

            {/* Default Header (if needed) */}
            {showDefaultHeader && (
                <div className="flex-none h-[var(--component-topbar-height)] px-6 border-b border-[var(--semantic-color-border-default)] flex items-center justify-between">
                    <span className="text-lg font-medium tracking-tight text-[var(--semantic-color-text-primary)] capitalize">
                        {drawerRightTab}
                    </span>
                    {/* Actions */}
                </div>
            )}

            {/* Content Area */}
            <div className={`flex-1 overflow-hidden relative ${showDefaultHeader ? 'p-6' : ''}`}>
                {(drawerRightTab === 'now' || drawerRightTab === 'cycles' || drawerRightTab === 'chronos') && (
                    <NowCorePanel />
                )}
                {drawerRightTab === 'props' && (
                    <PropertiesPanel />
                )}
                {/* Visual Placeholders */}
                {drawerRightTab === 'ai' && (
                    <EmptyModuleState
                        icon="✨"
                        label="AI Assistant"
                        description="Context-aware intelligence is coming to this workspace. Analyze signals and generate insights."
                    />
                )}
                {drawerRightTab === 'signals' && (
                    <SignalsPanel />
                )}
            </div>
        </div>
    );
};

export default DockedDrawer;
