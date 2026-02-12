/**
 * Shell.jsx
 * The main container for SymbolField OS v0.5.
 * Implements the "Field-First" layout.
 */

import React, { useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import ToolDock from './ToolDock';
import CanvasView from '../Canvas/CanvasView';
import ContextToolbar from '../Context/ContextToolbar';
//  // Replaced by DockedDrawer
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
import { applyHarmonyProfileToRoot, buildHarmonyProfile } from '../../core/harmony/HarmonyEngine';

const Shell = () => {
    const appMode = useAppStore(state => state.appMode);
    const viewContext = useAppStore(state => state.viewContext);
    const togglePalette = useAppStore(state => state.togglePalette);
    const toggleSettings = useAppStore(state => state.toggleSettings);
    const closeSettings = useAppStore(state => state.closeSettings);
    const settingsOpen = useAppStore(state => state.settingsOpen);

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
            window.removeEventListener('wheel', handleBrowserZoomWheel, true);
        };
    }, []);

    // Harmony theme matrix (guardrailed customization).
    const themePreset = useAppStore(state => state.themePreset);
    const themeAccent = useAppStore(state => state.themeAccent);
    const themeDensity = useAppStore(state => state.themeDensity);
    const themeMotion = useAppStore(state => state.themeMotion);
    const themeSpeed = useAppStore(state => state.themeSpeed);
    const themeTexture = useAppStore(state => state.themeTexture);
    const themeIntensity = useAppStore(state => state.themeIntensity);
    const themeModeSource = useAppStore(state => state.themeModeSource);
    const themeModeOverride = useAppStore(state => state.themeModeOverride);

    useEffect(() => {
        const harmonyMode = themeModeSource === 'auto' ? appMode : themeModeOverride;
        const profile = buildHarmonyProfile({
            mode: harmonyMode,
            preset: themePreset,
            accent: themeAccent,
            density: themeDensity,
            motion: themeMotion,
            speed: themeSpeed,
            texture: themeTexture,
            intensity: themeIntensity
        });
        applyHarmonyProfileToRoot(profile);
    }, [appMode, themePreset, themeAccent, themeDensity, themeMotion, themeSpeed, themeTexture, themeIntensity, themeModeSource, themeModeOverride]);

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

            {/* Main Content Area (Z0) - Mutually Exclusive Views */}
            <div className="absolute inset-0 z-[var(--z-canvas)]">
                {viewContext === 'home' && (
                    <div className="relative z-0 w-full h-full bg-sf-zinc-950 overflow-hidden">
                        <Station />
                    </div>
                )}
                {(viewContext === 'space' || viewContext === 'cluster') && (
                    <CanvasView />
                )}
                {viewContext === 'node' && (
                    <NodeView />
                )}
            </div>

            {/* Z5: Field shell tools for Space + Cluster scopes. NodeBuilder has its own local tools. */}
            {(viewContext === 'space' || viewContext === 'cluster') && (
                <>
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-[var(--z-ui)]">
                        <ToolDock />
                    </div>
                    <ContextToolbar />
                </>
            )}

            {/* Global right drawer for Station + Space. Node has isolated tools. */}
            {viewContext !== 'node' && (
                <DockedDrawer />
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
