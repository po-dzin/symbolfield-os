/**
 * Shell.jsx
 * The main container for SymbolField OS v0.5.
 * Implements the "Field-First" layout.
 */

import React, { useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import ToolDock from './ToolDock';
import StateCore from '../HUD/StateCore';
import CanvasView from '../Canvas/CanvasView';
import ContextToolbar from '../Context/ContextToolbar';
//  // Replaced by DockedDrawer
import SideRail from './SideRail';
import DockedDrawer from './DockedDrawer';
import NodeOverlay from '../Node/NodeOverlay';
import SettingsDrawer from '../Drawers/SettingsDrawer';
import OmniOverlay from '../Overlays/OmniOverlay';
import Station from '../Station/Station';
import UnifiedTopBar from './UnifiedTopBar';
import GatewayLayout from '../Gateway/GatewayLayout';
import BrandPage from '../Gateway/BrandPage';
import PortalPage from '../Gateway/PortalPage';
import { emitZoomHotkeyFromKeyboard } from '../../core/hotkeys/zoomHotkeys';
// import DemoUnifiedTopBar from './DemoUnifiedTopBar'; // Removed

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
        || drawerRightTab === 'chronos'
        || drawerRightTab === 'log';
    /* HOOK FIX: Must be called unconditionally */
    const gatewayRoute = useAppStore(state => state.gatewayRoute);

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

    // Gateway Mode
    if (viewContext === 'gateway') {
        return (
            <GatewayLayout>
                {gatewayRoute?.type === 'portal' ? (
                    <PortalPage brandSlug={gatewayRoute.brandSlug} portalSlug={gatewayRoute.portalSlug} />
                ) : (
                    <BrandPage brandSlug={gatewayRoute?.slug || 'symbolfield'} />
                )}
            </GatewayLayout>
        );
    }

    return (
        <div
            ref={shellRef}
            className={`os-shell w-screen h-screen overflow-hidden relative cursor-default mode-${appMode}`}
            style={{ overscrollBehavior: 'none' }}
        >

            {/* Persistent Unified TopBar */}
            <UnifiedTopBar />

            {/* Z0: The Field or Station */}
            <div className="absolute inset-0 z-[var(--z-canvas)]">
                {viewContext === 'home' ? (
                    <div className="relative z-0 w-full h-full bg-sf-zinc-950 overflow-hidden">
                        <Station />
                    </div>
                ) : (
                    <CanvasView />
                )}
            </div>

            {/* Z5: Peripheral Shell - Only show if NOT home (Wait, TopBar handles this logic now) */}
            {viewContext !== 'home' && (
                <>
                    {/* Left: Tool Dock */}
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-[var(--z-ui)]">
                        <ToolDock />
                    </div>

                </>
            )}

            {/* NEW: SideRail & DockedDrawer System (Z10-Z15) */}
            <DockedDrawer />
            <SideRail />

            {viewContext !== 'home' && (
                <>
                    {/* Context UI (Z4) */}
                    <ContextToolbar />

                    {/* Node Overlay */}
                    <NodeOverlay />
                </>
            )}

            {/* Settings Drawer (Z3) */}
            {viewContext !== 'home' && <SettingsDrawer />}

            {/* Omni Overlay (Z100) - Replaces CommandPalette */}
            <OmniOverlay />

        </div>
    );
};

export default Shell;
