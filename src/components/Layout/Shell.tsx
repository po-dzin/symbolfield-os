/**
 * Shell.jsx
 * The main container for SymbolField OS v0.5.
 * Implements the "Field-First" layout.
 */

import React, { useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import ToolDock from './ToolDock';
import TimeChip from './TimeChip';
import StateCore from '../HUD/StateCore';
import CanvasView from '../Canvas/CanvasView';
import ContextToolbar from '../Context/ContextToolbar';
import NowCoreDrawer from '../Drawers/NowCoreDrawer';
import NodeOverlay from '../Node/NodeOverlay';
import SettingsDrawer from '../Drawers/SettingsDrawer';
import CommandPalette from '../Overlays/CommandPalette';
import Station from '../Station/Station';
import SpaceHeader from './SpaceHeader';
import { emitZoomHotkeyFromKeyboard } from '../../core/hotkeys/zoomHotkeys';

const Shell = () => {
    const appMode = useAppStore(state => state.appMode);
    const viewContext = useAppStore(state => state.viewContext);
    const togglePalette = useAppStore(state => state.togglePalette);
    const toggleSettings = useAppStore(state => state.toggleSettings);
    const closeSettings = useAppStore(state => state.closeSettings);
    const drawerRightOpen = useAppStore(state => state.drawerRightOpen);
    const drawerRightTab = useAppStore(state => state.drawerRightTab);
    const setDrawerOpen = useAppStore(state => state.setDrawerOpen);
    const setDrawerRightTab = useAppStore(state => state.setDrawerRightTab);
    const isNowCoreTab = drawerRightTab === 'now'
        || drawerRightTab === 'cycles'
        || drawerRightTab === 'timeline'
        || drawerRightTab === 'log';
    const shellRef = useRef<HTMLDivElement | null>(null);
    // Space settings are opened from SpaceHeader menu.

    useEffect(() => {
        if (viewContext === 'home') {
            closeSettings();
        }
    }, [viewContext, closeSettings]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const isMod = event.metaKey || event.ctrlKey;
            const key = event.key.toLowerCase();
            const code = event.code;
            const target = event.target as HTMLElement | null;
            const isEditable = Boolean(target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable));

            if (isMod && (key === ',' || code === 'Comma')) {
                event.preventDefault();
                if (!isEditable) {
                    if (viewContext !== 'home') {
                        toggleSettings();
                    }
                }
                return;
            }

            if (isEditable) return;
            if (emitZoomHotkeyFromKeyboard(event)) return;
            if (!isMod) return;
            if (key !== 'k') return;
            event.preventDefault();
            togglePalette();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePalette, toggleSettings, viewContext]);

    useEffect(() => {
        const inShell = (eventTarget: EventTarget | null): boolean => {
            const root = shellRef.current;
            const target = eventTarget as Node | null;
            return Boolean(root && target && root.contains(target));
        };

        const handleBrowserZoomWheel = (event: WheelEvent) => {
            if (!inShell(event.target)) return;
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
            }
        };

        window.addEventListener('wheel', handleBrowserZoomWheel, { passive: false, capture: true });

        return () => {
            window.removeEventListener('wheel', handleBrowserZoomWheel, { capture: true } as AddEventListenerOptions);
        };
    }, []);

    return (
        <div
            ref={shellRef}
            className={`os-shell w-screen h-screen overflow-hidden relative cursor-default mode-${appMode}`}
            style={{ overscrollBehavior: 'none' }}
        >

            {/* Persistent Home Button (Visible when not in 'home' view) */}
            {/* Persistent Home Button (Visible when not in 'home' view) */}
            <SpaceHeader />

            {/* Z0: The Field or Station */}
            <div className="absolute inset-0 z-[var(--z-canvas)]">
                {viewContext === 'home' ? (
                    <div className="relative z-[100] w-full h-full bg-sf-zinc-950 overflow-hidden">
                        <Station />
                    </div>
                ) : (
                    <CanvasView />
                )}
            </div>

            {/* Z5: Peripheral Shell - Only show if NOT home */}
            {viewContext !== 'home' && (
                <>
                    {/* Left: Tool Dock */}
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-[var(--z-ui)]">
                        <ToolDock />
                    </div>

                    {/* Top-Right: StateCore (HUD) */}
                    <div className="absolute top-4 right-4 z-[var(--z-hud)]">
                        <StateCore />
                    </div>

                    {/* Bottom-Right: TimeChip */}
                    <div
                        className="absolute bottom-4 right-4 z-[var(--z-ui)]"
                        onClick={() => {
                            if (drawerRightOpen && isNowCoreTab) {
                                setDrawerOpen('right', false);
                                return;
                            }
                            setDrawerRightTab('now');
                        }}
                    >
                        <TimeChip />
                    </div>
                </>
            )}

            {viewContext !== 'home' && (
                <>
                    {/* Context UI (Z4) */}
                    <ContextToolbar />

                    {/* NowCore Drawer (Z3) */}
                    <NowCoreDrawer />

                    {/* Node Overlay */}
                    <NodeOverlay />
                </>
            )}

            {/* Settings Drawer (Z3) */}
            {viewContext !== 'home' && <SettingsDrawer />}

            {/* Omni Input (Z3) */}
            <CommandPalette />

        </div>
    );
};

export default Shell;
