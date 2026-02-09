/**
 * Shell.jsx
 * The main container for SymbolField OS v0.5.
 * Implements the "Field-First" layout.
 */

import React, { useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { eventBus } from '../../core/events/EventBus';
import ToolDock from './ToolDock';
import StateCore from '../HUD/StateCore';
import CanvasView from '../Canvas/CanvasView';
import ContextToolbar from '../Context/ContextToolbar';
//  // Replaced by DockedDrawer
import SideRail from './SideRail';
import DockedDrawer from './DockedDrawer';
import NodeView from '../Node/NodeView';
import UniversalSettingsOverlay from '../Settings/UniversalSettingsOverlay';
import OmniOverlay from '../Overlays/OmniOverlay';
import Station from '../Station/Station';

import UnifiedTopBar from './UnifiedTopBar';
import GatewayLayout from '../Gateway/GatewayLayout';
import BrandPage from '../Gateway/BrandPage';
import PortalPage from '../Gateway/PortalPage';
import { emitZoomHotkeyFromKeyboard } from '../../core/hotkeys/zoomHotkeys';

const Shell = () => {
    const appMode = useAppStore(state => state.appMode);
    const viewContext = useAppStore(state => state.viewContext);
    const togglePalette = useAppStore(state => state.togglePalette);
    const toggleSettings = useAppStore(state => state.toggleSettings);
    const openSettings = useAppStore(state => state.openSettings);
    const closeSettings = useAppStore(state => state.closeSettings);
    const settingsOpen = useAppStore(state => state.settingsOpen);

    // Legacy drawer tab logic (still used for content drawers like 'now')
    const drawerRightTab = useAppStore(state => state.drawerRightTab);

    /* HOOK FIX: Must be called unconditionally */
    const gatewayRoute = useAppStore(state => state.gatewayRoute);

    const shellRef = useRef<HTMLDivElement | null>(null);

    // Close settings when context changes, unless we want them to persist?
    // Actually, distinct contexts might want distinct settings states, but for now closing on switch is safer.
    useEffect(() => {
        closeSettings();
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
                    toggleSettings();
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

    // Theme Effects Application
    const themeGlass = useAppStore(state => state.themeGlass);
    const themeNoise = useAppStore(state => state.themeNoise);
    const themeAccent = useAppStore(state => state.themeAccent);
    const themeGlowStrength = useAppStore(state => state.themeGlowStrength);

    useEffect(() => {
        const root = document.documentElement;

        // 1. Apply Accent
        const accents: Record<string, string> = {
            gold: '#D4AF37',
            rose: '#E09F9F',
            sage: '#9CAD98',
            lavender: '#CDBEFF',
            cyan: '#6FE4FF',
            peach: '#FFB89C',
            taupe: '#B8B2A6'
        };
        const hex = accents[themeAccent] || accents.gold || '#D4AF37';
        root.style.setProperty('--primitive-color-accent-gold', hex);
        root.style.setProperty('--semantic-color-action-primary', hex);
        root.style.setProperty('--theme-border-active', hex);

        // 2. Apply Glass Opacity & Blur
        root.style.setProperty('--theme-glass-opacity', themeGlass ? '0.6' : '0.98');
        root.style.setProperty('--theme-blur-radius', themeGlass ? '20px' : '0px');

        // 3. Apply Glow Strength
        root.style.setProperty('--theme-glow-strength', themeGlowStrength.toString());

        // 4. Apply Noise Opacity
        root.style.setProperty('--theme-noise-opacity', themeNoise ? '0.07' : '0');

    }, [themeGlass, themeAccent, themeGlowStrength, themeNoise]);

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

            {/* Z5: Peripheral Shell */}
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

                    {/* Node View */}
                    <NodeView />
                </>
            )}

            {/* Omni Overlay (Z100) - Replaces CommandPalette */}
            <OmniOverlay />

            {/* Universal Settings Overlay (Global Modal) */}
            {settingsOpen && (
                <UniversalSettingsOverlay onClose={closeSettings} />
            )}
        </div>
    );
};

export default Shell;
