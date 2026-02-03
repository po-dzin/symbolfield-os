/**
 * Shell.jsx
 * The main container for SymbolField OS v0.5.
 * Implements the "Field-First" layout.
 */

import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import ToolDock from './ToolDock';
import TimeChip from './TimeChip';
import StateCore from '../HUD/StateCore';
import CanvasView from '../Canvas/CanvasView';
import ContextToolbar from '../Context/ContextToolbar';
import LogDrawer from '../Drawers/LogDrawer';
import NowOverlay from '../NOW/NowOverlay';
import SettingsDrawer from '../Drawers/SettingsDrawer';
import CommandPalette from '../Overlays/CommandPalette';
import Station from '../Station/Station';
import SpaceHeader from './SpaceHeader';

const Shell = () => {
    const appMode = useAppStore(state => state.appMode);
    const viewContext = useAppStore(state => state.viewContext);
    const togglePalette = useAppStore(state => state.togglePalette);
    // Settings are toggled from ToolDock (left) for now.

    // Drawer state could be in AppStore, but local for v0.5 MVP is acceptable for UI-only drawers
    // Actually, UI_SPACE_FIELD_SHELL says LogDrawer is toggled via TimeChip/Dock
    const [isLogOpen, setLogOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!(event.metaKey || event.ctrlKey)) return;
            if (event.key.toLowerCase() !== 'k') return;
            const target = event.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return;
            }
            event.preventDefault();
            togglePalette();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePalette]);

    return (
        <div className={`os-shell w-screen h-screen overflow-hidden relative cursor-default mode-${appMode}`}>

            {/* Persistent Home Button (Visible when not in 'home' view) */}
            {/* Persistent Home Button (Visible when not in 'home' view) */}
            <SpaceHeader />

            {/* Z0: The Field or Station */}
            <div className="absolute inset-0 z-[var(--z-canvas)]">
                {viewContext === 'home' ? (
                    <div className="relative z-[100] w-full h-full bg-sf-zinc-950 overflow-y-auto">
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
                    <div className="absolute bottom-4 right-4 z-[var(--z-ui)]" onClick={() => setLogOpen(!isLogOpen)}>
                        <TimeChip />
                    </div>
                </>
            )}

            {viewContext !== 'home' && (
                <>
                    {/* Context UI (Z4) */}
                    <ContextToolbar />

                    {/* Log Drawer (Z3) */}
                    <LogDrawer isOpen={isLogOpen} onClose={() => setLogOpen(false)} />

                    {/* Settings Drawer (Z3) */}
                    <SettingsDrawer />

                    {/* NOW Overlay (Z1000+) */}
                    <NowOverlay />
                </>
            )}

            {/* Omni Input (Z3) */}
            <CommandPalette />

        </div>
    );
};

export default Shell;
