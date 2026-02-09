/**
 * useAppStore.ts
 * React binding for StateEngine.
 */

import { create } from 'zustand';
import { stateEngine, type DrawerRightTab } from '../core/state/StateEngine';
import { eventBus, EVENTS } from '../core/events/EventBus';
import type { NodeId } from '../core/types';
import { spaceManager } from '../core/state/SpaceManager';

// Matches StateEngine constants
type AppModeType = 'deep' | 'flow' | 'luma';
type ViewContextType = 'home' | 'space' | 'node' | 'now' | 'gateway';
type ToolType = 'pointer' | 'link' | 'area';

interface Session {
    isActive: boolean;
    startTime: number | null;
    label: string | null;
}

interface AppState {
    appMode: AppModeType;
    viewContext: ViewContextType;
    currentSpaceId: string;
    fieldScopeId: NodeId | null;
    activeTool: ToolType;
    activeScope: NodeId | null;
    settingsOpen: boolean;
    paletteOpen: boolean;
    contextMenuMode: 'bar' | 'radial';
    gridSnapEnabled: boolean;
    gridStepMul: number;
    showGrid: boolean;
    showEdges: boolean;
    showHud: boolean;
    showCounters: boolean;
    focusDimEnabled: boolean;
    subspaceLod: 1 | 2 | 3;
    showStationLabels: boolean;
    showPlaygroundOnStation: boolean;
    drawerLeftOpen: boolean;
    drawerLeftPinned: boolean;
    drawerLeftWidth: 'sm' | 'md' | 'lg';
    drawerLeftWidthPx: number;
    drawerRightOpen: boolean;
    drawerRightPinned: boolean;
    drawerRightWidth: 'sm' | 'md' | 'lg';
    drawerRightWidthPx: number;
    drawerRightTab: DrawerRightTab | null;
    layoutMode: 'overlay' | 'pinned' | 'split';
    session: Session;

    // Theme State
    themeGlass: boolean;
    themeNoise: boolean;
    themeAccent: string;
    themeGlowStrength: number;

    // Global UI State
    accountSettingsOpen: boolean;
    setAccountSettingsOpen: (open: boolean) => void;
}

interface AppStoreState extends AppState {
    omniQuery: string;
    setAppMode: (mode: AppModeType) => void;
    setViewContext: (context: ViewContextType) => void;
    setTool: (tool: ToolType) => void;
    setSpace: (spaceId: string) => void;
    setFieldScope: (hubId: NodeId | null) => void;
    enterNode: (nodeId: NodeId) => void;
    exitNode: () => void;
    enterNow: (nodeId: NodeId) => void;
    exitNow: () => void;
    startFocusSession: (label: string) => void;
    stopFocusSession: () => void;
    togglePalette: () => void;
    closePalette: () => void;
    toggleSettings: () => void;
    openSettings: () => void;
    closeSettings: () => void;
    setContextMenuMode: (mode: 'bar' | 'radial') => void;
    toggleContextMenuMode: () => void;
    setGridSnapEnabled: (enabled: boolean) => void;
    toggleGridSnap: () => void;
    setGridStepMul: (multiplier: number) => void;
    setShowGrid: (enabled: boolean) => void;
    setShowEdges: (enabled: boolean) => void;
    setShowHud: (enabled: boolean) => void;
    setShowCounters: (enabled: boolean) => void;
    setFocusDimEnabled: (enabled: boolean) => void;
    setSubspaceLod: (level: 1 | 2 | 3) => void;
    setShowStationLabels: (enabled: boolean) => void;
    setShowPlaygroundOnStation: (enabled: boolean) => void;
    setOmniQuery: (query: string) => void;
    setDrawerOpen: (side: 'left' | 'right', open: boolean) => void;
    toggleDrawerOpen: (side: 'left' | 'right') => void;
    setDrawerPinned: (side: 'left' | 'right', pinned: boolean) => void;
    setDrawerWidth: (side: 'left' | 'right', width: 'sm' | 'md' | 'lg') => void;
    setDrawerWidthPx: (side: 'left' | 'right', width: number) => void;
    setLayoutMode: (mode: 'overlay' | 'pinned' | 'split') => void;
    setDrawerRightTab: (tab: DrawerRightTab | null) => void;

    // Gateway Navigation
    gatewayRoute: { type: 'brand'; slug: string } | { type: 'portal'; brandSlug: string; portalSlug: string } | null;
    setGatewayRoute: (route: { type: 'brand'; slug: string } | { type: 'portal'; brandSlug: string; portalSlug: string } | null) => void;

    // Theme Actions
    setThemeOption: (key: 'themeGlass' | 'themeNoise' | 'themeAccent' | 'themeGlowStrength', value: any) => void;
}

export const useAppStore = create<AppStoreState>((set) => {
    // Initial Sync
    const initialState = stateEngine.getState() as unknown as AppState;

    // Subscribe to changes
    const sync = () =>
        set(prev => ({
            ...prev,
            ...(stateEngine.getState() as unknown as AppState)
        }));

    eventBus.on(EVENTS.TOOL_CHANGED, sync);
    eventBus.on(EVENTS.NODE_ENTERED, sync);
    eventBus.on(EVENTS.NODE_EXITED, sync);
    eventBus.on(EVENTS.NOW_ENTERED, sync);
    eventBus.on(EVENTS.NOW_EXITED, sync);
    eventBus.on(EVENTS.SESSION_STATE_SET, sync);
    eventBus.on(EVENTS.SETTINGS_TOGGLED, sync);
    eventBus.on(EVENTS.PALETTE_TOGGLED, sync);
    eventBus.on(EVENTS.SPACE_CHANGED, sync);
    eventBus.on(EVENTS.FIELD_SCOPE_CHANGED, sync);
    eventBus.on(EVENTS.CONTEXT_MENU_MODE_CHANGED, sync);
    eventBus.on(EVENTS.GRID_SNAP_CHANGED, sync);
    eventBus.on(EVENTS.GRID_STEP_CHANGED, sync);
    eventBus.on(EVENTS.GRID_VISIBILITY_CHANGED, sync);
    eventBus.on(EVENTS.EDGES_VISIBILITY_CHANGED, sync);
    eventBus.on(EVENTS.HUD_VISIBILITY_CHANGED, sync);
    eventBus.on(EVENTS.COUNTERS_VISIBILITY_CHANGED, sync);
    eventBus.on(EVENTS.FOCUS_DIM_CHANGED, sync);
    eventBus.on(EVENTS.SUBSPACE_LOD_CHANGED, sync);
    eventBus.on(EVENTS.STATION_LABELS_VISIBILITY_CHANGED, sync);
    eventBus.on(EVENTS.STATION_PLAYGROUND_VISIBILITY_CHANGED, sync);
    eventBus.on(EVENTS.DRAWER_OPENED, sync);
    eventBus.on(EVENTS.DRAWER_CLOSED, sync);

    return {
        ...initialState,
        omniQuery: '',
        gatewayRoute: { type: 'brand', slug: 'symbolfield' }, // Default route

        // Theme Defaults
        themeGlass: true,
        themeNoise: true,
        themeAccent: 'taupe', // "White-grey" default
        themeGlowStrength: 0.5,

        accountSettingsOpen: false,
        setAccountSettingsOpen: (open) => set({ accountSettingsOpen: open }),

        setThemeOption: (key, value) => {
            set((prev) => ({ ...prev, [key]: value }));
            // Side effect: update document CSS variables if needed, 
            // but we will handle this in Shell for reactivity
        },


        // Actions are just proxies to Engine
        setAppMode: (mode: AppModeType) => {
            stateEngine.setAppMode(mode);
            sync();
        },
        setViewContext: (context: ViewContextType) => {
            stateEngine.setViewContext(context);
            sync();
        },
        setTool: (tool: ToolType) => {
            stateEngine.setTool(tool); // Event listener will handle sync
        },
        setSpace: (spaceId: string) => {
            stateEngine.setSpace(spaceId);
            sync();
        },
        setFieldScope: (hubId: NodeId | null) => {
            stateEngine.setFieldScope(hubId);
            sync();
        },
        enterNode: (nodeId: NodeId) => {
            stateEngine.enterNode(nodeId);
        },
        exitNode: () => {
            stateEngine.exitNode();
        },
        enterNow: (nodeId: NodeId) => {
            stateEngine.enterNow(nodeId);
        },
        exitNow: () => {
            stateEngine.exitNow();
        },
        startFocusSession: (label: string) => {
            stateEngine.startFocusSession(label);
        },
        stopFocusSession: () => {
            stateEngine.stopFocusSession();
        },
        togglePalette: () => {
            stateEngine.togglePalette();
        },
        closePalette: () => {
            stateEngine.closePalette();
        },
        toggleSettings: () => {
            stateEngine.toggleSettings();
        },
        openSettings: () => {
            stateEngine.openSettings();
        },
        closeSettings: () => {
            stateEngine.closeSettings();
        }
        ,
        setContextMenuMode: (mode: 'bar' | 'radial') => {
            stateEngine.setContextMenuMode(mode);
        },
        toggleContextMenuMode: () => {
            stateEngine.toggleContextMenuMode();
        }
        ,
        setGridSnapEnabled: (enabled: boolean) => {
            const spaceId = stateEngine.getState().currentSpaceId;
            if (spaceId) {
                spaceManager.setGridSnapEnabled(spaceId, enabled);
            } else {
                stateEngine.setGridSnapEnabled(enabled);
            }
            sync();
        },
        toggleGridSnap: () => {
            const enabled = !stateEngine.getState().gridSnapEnabled;
            const spaceId = stateEngine.getState().currentSpaceId;
            if (spaceId) {
                spaceManager.setGridSnapEnabled(spaceId, enabled);
            } else {
                stateEngine.setGridSnapEnabled(enabled);
            }
            sync();
        },
        setGridStepMul: (multiplier: number) => {
            stateEngine.setGridStepMul(multiplier);
            sync();
        },
        setShowGrid: (enabled: boolean) => {
            stateEngine.setShowGrid(enabled);
            sync();
        },
        setShowEdges: (enabled: boolean) => {
            stateEngine.setShowEdges(enabled);
            sync();
        },
        setShowHud: (enabled: boolean) => {
            stateEngine.setShowHud(enabled);
            sync();
        },
        setShowCounters: (enabled: boolean) => {
            stateEngine.setShowCounters(enabled);
            sync();
        },
        setFocusDimEnabled: (enabled: boolean) => {
            stateEngine.setFocusDimEnabled(enabled);
            sync();
        },
        setSubspaceLod: (level: 1 | 2 | 3) => {
            stateEngine.setSubspaceLod(level);
            sync();
        },
        setShowStationLabels: (enabled: boolean) => {
            stateEngine.setShowStationLabels(enabled);
            sync();
        },
        setShowPlaygroundOnStation: (enabled: boolean) => {
            stateEngine.setShowPlaygroundOnStation(enabled);
            sync();
        },
        setOmniQuery: (query: string) => {
            set({ omniQuery: query });
        },
        setDrawerOpen: (side: 'left' | 'right', open: boolean) => {
            stateEngine.setDrawerOpen(side, open);
            sync();
        },
        toggleDrawerOpen: (side: 'left' | 'right') => {
            stateEngine.toggleDrawerOpen(side);
            sync();
        },
        setDrawerPinned: (side: 'left' | 'right', pinned: boolean) => {
            stateEngine.setDrawerPinned(side, pinned);
            sync();
        },
        setDrawerWidth: (side: 'left' | 'right', width: 'sm' | 'md' | 'lg') => {
            stateEngine.setDrawerWidth(side, width);
            sync();
        },
        setDrawerWidthPx: (side: 'left' | 'right', width: number) => {
            stateEngine.setDrawerWidthPx(side, width);
            sync();
        },
        setLayoutMode: (mode: 'overlay' | 'pinned' | 'split') => {
            stateEngine.setLayoutMode(mode);
            sync();
        },
        setDrawerRightTab: (tab: DrawerRightTab | null) => {
            stateEngine.setDrawerRightTab(tab);
            sync();
        },
        setGatewayRoute: (route) => {
            set({ gatewayRoute: route });
        }
    };
});
