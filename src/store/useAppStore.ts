/**
 * useAppStore.ts
 * React binding for StateEngine.
 */

import { create } from 'zustand';
import { stateEngine, type DrawerRightTab } from '../core/state/StateEngine';
import { eventBus, EVENTS } from '../core/events/EventBus';
import type { NodeId } from '../core/types';
import { spaceManager } from '../core/state/SpaceManager';
import { settingsStorage } from '../core/storage/SettingsStorage';
import {
    normalizeHarmonyMatrix,
    type HarmonyAccentId,
    type HarmonyDensity,
    type HarmonyMatrix,
    type HarmonyMode,
    type HarmonyMotion,
    type HarmonyPresetSelection,
    type HarmonySpeed,
    type HarmonyTexture
} from '../core/harmony/HarmonyEngine';
import { getSystemMotionMetrics } from '../core/ui/SystemMotion';
import type { BreadcrumbLens, NavigationFlowMode } from '../core/navigation/PathProjection';

// Matches StateEngine constants
type AppModeType = 'deep' | 'flow' | 'luma';
type ViewContextType = 'home' | 'space' | 'cluster' | 'node' | 'now' | 'gateway';
type ToolType = 'pointer' | 'link' | 'area';

interface Session {
    isActive: boolean;
    startTime: number | null;
    label: string | null;
}

type ThemeOptionKey =
    | 'themePreset'
    | 'themeAccent'
    | 'themeDensity'
    | 'themeMotion'
    | 'themeSpeed'
    | 'themeTexture'
    | 'themeIntensity'
    | 'themeModeSource'
    | 'themeModeOverride';

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

    // Harmony Theme Matrix (constrained customization)
    themePreset: HarmonyPresetSelection;
    themeAccent: HarmonyAccentId;
    themeDensity: HarmonyDensity;
    themeMotion: HarmonyMotion;
    themeSpeed: HarmonySpeed;
    themeTexture: HarmonyTexture;
    themeIntensity: number;
    themeModeSource: 'auto' | 'manual';
    themeModeOverride: HarmonyMode;
    pathDisplayMode: 'full' | 'compact';
    breadcrumbLens: BreadcrumbLens;
    navigationFlowMode: NavigationFlowMode;

    // Global UI State
    accountSettingsOpen: boolean;
    setAccountSettingsOpen: (open: boolean) => void;
}

interface AppStoreState extends AppState {
    omniQuery: string;
    stationInspectorSpaceId: string | null;
    setAppMode: (mode: AppModeType) => void;
    setViewContext: (context: ViewContextType) => void;
    setTool: (tool: ToolType) => void;
    setSpace: (spaceId: string) => void;
    setFieldScope: (clusterId: NodeId | null) => void;
    enterClusterScope: (clusterId: NodeId) => void;
    toggleClusterScope: (clusterId: NodeId) => void;
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
    setThemeOption: (key: ThemeOptionKey, value: string | number) => void;
    setPathDisplayMode: (mode: 'full' | 'compact') => void;
    setBreadcrumbLens: (lens: BreadcrumbLens) => void;
    setNavigationFlowMode: (mode: NavigationFlowMode) => void;
    setStationInspectorSpaceId: (spaceId: string | null) => void;
}

export const useAppStore = create<AppStoreState>((set, get) => {
    // Initial Sync
    const initialState = stateEngine.getState() as unknown as AppState;
    const persistedSettings = settingsStorage.load();
    const initialModeSource = persistedSettings.themeModeSource === 'manual' ? 'manual' : 'auto';
    const initialModeOverride: HarmonyMode = (
        persistedSettings.themeModeOverride === 'deep'
        || persistedSettings.themeModeOverride === 'flow'
        || persistedSettings.themeModeOverride === 'luma'
    )
        ? persistedSettings.themeModeOverride
        : initialState.appMode;
    const initialHarmonyMode = initialModeSource === 'auto' ? initialState.appMode : initialModeOverride;
    const initialPathDisplayMode = persistedSettings.pathDisplayMode === 'compact' ? 'compact' : 'full';
    const initialBreadcrumbLens: BreadcrumbLens = (
        persistedSettings.breadcrumbLens === 'full'
        || persistedSettings.breadcrumbLens === 'external'
        || persistedSettings.breadcrumbLens === 'internal'
        || persistedSettings.breadcrumbLens === 'focus'
    )
        ? persistedSettings.breadcrumbLens
        : 'focus';
    const initialNavigationFlowMode: NavigationFlowMode = (
        persistedSettings.navigationFlowMode === 'build'
        || persistedSettings.navigationFlowMode === 'explore'
        || persistedSettings.navigationFlowMode === 'auto'
    )
        ? persistedSettings.navigationFlowMode
        : 'auto';
    const initialHarmonyInput: Partial<HarmonyMatrix> = {
        mode: initialHarmonyMode
    };
    if (persistedSettings.themePreset) initialHarmonyInput.preset = persistedSettings.themePreset;
    if (persistedSettings.themeAccent) initialHarmonyInput.accent = persistedSettings.themeAccent;
    if (persistedSettings.themeDensity) initialHarmonyInput.density = persistedSettings.themeDensity;
    if (persistedSettings.themeMotion) initialHarmonyInput.motion = persistedSettings.themeMotion;
    if (persistedSettings.themeSpeed) initialHarmonyInput.speed = persistedSettings.themeSpeed;
    if (persistedSettings.themeTexture) initialHarmonyInput.texture = persistedSettings.themeTexture;
    if (typeof persistedSettings.themeIntensity === 'number') initialHarmonyInput.intensity = persistedSettings.themeIntensity;

    const initialHarmony = normalizeHarmonyMatrix(initialHarmonyInput, initialState.appMode);

    // Subscribe to changes
    const sync = () =>
        set(prev => ({
            ...prev,
            ...(stateEngine.getState() as unknown as AppState)
        }));

    const drawerCloseTimers: Record<'left' | 'right', number | null> = { left: null, right: null };
    const clearDrawerCloseTimer = (side: 'left' | 'right') => {
        const timer = drawerCloseTimers[side];
        if (timer !== null) {
            clearTimeout(timer);
            drawerCloseTimers[side] = null;
        }
    };

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
        stationInspectorSpaceId: null,
        gatewayRoute: { type: 'brand', slug: 'symbolfield' }, // Default route

        // Harmony Defaults (guardrailed custom matrix)
        themePreset: initialHarmony.preset,
        themeAccent: initialHarmony.accent,
        themeDensity: initialHarmony.density,
        themeMotion: initialHarmony.motion,
        themeSpeed: initialHarmony.speed,
        themeTexture: initialHarmony.texture,
        themeIntensity: initialHarmony.intensity,
        themeModeSource: initialModeSource,
        themeModeOverride: initialModeOverride,
        pathDisplayMode: initialPathDisplayMode,
        breadcrumbLens: initialBreadcrumbLens,
        navigationFlowMode: initialNavigationFlowMode,

        accountSettingsOpen: false,
        setAccountSettingsOpen: (open) => set({ accountSettingsOpen: open }),

        setThemeOption: (key, value) => {
            const prev = get();
            const asMode = (candidate: unknown): HarmonyMode => (
                candidate === 'deep' || candidate === 'flow' || candidate === 'luma'
            )
                ? candidate
                : prev.themeModeOverride;

            let nextModeSource: 'auto' | 'manual' = prev.themeModeSource;
            if (key === 'themeModeSource' && (value === 'auto' || value === 'manual')) {
                nextModeSource = value;
            }
            if (key === 'themeModeOverride') {
                nextModeSource = 'manual';
            }

            const nextModeOverride: HarmonyMode = key === 'themeModeOverride'
                ? asMode(value)
                : prev.themeModeOverride;
            const effectiveMode: HarmonyMode = nextModeSource === 'auto' ? prev.appMode : nextModeOverride;

            const next = normalizeHarmonyMatrix({
                mode: effectiveMode,
                preset: (key === 'themePreset' ? value : prev.themePreset) as HarmonyPresetSelection,
                accent: (key === 'themeAccent' ? value : prev.themeAccent) as HarmonyAccentId,
                density: (key === 'themeDensity' ? value : prev.themeDensity) as HarmonyDensity,
                motion: (key === 'themeMotion' ? value : prev.themeMotion) as HarmonyMotion,
                speed: (key === 'themeSpeed' ? value : prev.themeSpeed) as HarmonySpeed,
                texture: (key === 'themeTexture' ? value : prev.themeTexture) as HarmonyTexture,
                intensity: key === 'themeIntensity' ? Number(value) : prev.themeIntensity
            }, effectiveMode);

            set({
                themePreset: next.preset,
                themeAccent: next.accent,
                themeDensity: next.density,
                themeMotion: next.motion,
                themeSpeed: next.speed,
                themeTexture: next.texture,
                themeIntensity: next.intensity,
                themeModeSource: nextModeSource,
                themeModeOverride: nextModeOverride
            });
            settingsStorage.save({
                themePreset: next.preset,
                themeAccent: next.accent,
                themeDensity: next.density,
                themeMotion: next.motion,
                themeSpeed: next.speed,
                themeTexture: next.texture,
                themeIntensity: next.intensity,
                themeModeSource: nextModeSource,
                themeModeOverride: nextModeOverride
            });
        },
        setPathDisplayMode: (mode) => {
            const nextMode = mode === 'compact' ? 'compact' : 'full';
            set({ pathDisplayMode: nextMode });
            settingsStorage.save({ pathDisplayMode: nextMode });
        },
        setBreadcrumbLens: (lens) => {
            const nextLens: BreadcrumbLens = (
                lens === 'full'
                || lens === 'external'
                || lens === 'internal'
                || lens === 'focus'
            )
                ? lens
                : 'focus';
            set({ breadcrumbLens: nextLens });
            settingsStorage.save({ breadcrumbLens: nextLens });
        },
        setNavigationFlowMode: (mode) => {
            const nextMode: NavigationFlowMode = (
                mode === 'build' || mode === 'explore' || mode === 'auto'
            )
                ? mode
                : 'auto';
            set({ navigationFlowMode: nextMode });
            settingsStorage.save({ navigationFlowMode: nextMode });
        },
        setStationInspectorSpaceId: (spaceId) => set({ stationInspectorSpaceId: spaceId }),


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
        setFieldScope: (clusterId: NodeId | null) => {
            stateEngine.setFieldScope(clusterId);
            sync();
        },
        enterClusterScope: (clusterId: NodeId) => {
            stateEngine.enterClusterScope(clusterId);
            sync();
        },
        toggleClusterScope: (clusterId: NodeId) => {
            stateEngine.toggleClusterScope(clusterId);
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
            if (open) {
                clearDrawerCloseTimer(side);
                stateEngine.setDrawerOpen(side, true);
                sync();
                return;
            }

            const current = get();
            const alreadyClosed = side === 'left' ? !current.drawerLeftOpen : !current.drawerRightOpen;
            if (alreadyClosed) {
                clearDrawerCloseTimer(side);
                return;
            }

            const closeDelayMs = getSystemMotionMetrics(current.themeMotion, current.themeSpeed).drawerCloseDelayMs;
            if (typeof window === 'undefined' || closeDelayMs <= 0) {
                stateEngine.setDrawerOpen(side, false);
                sync();
                return;
            }

            clearDrawerCloseTimer(side);
            drawerCloseTimers[side] = window.setTimeout(() => {
                drawerCloseTimers[side] = null;
                stateEngine.setDrawerOpen(side, false);
                sync();
            }, closeDelayMs);
        },
        toggleDrawerOpen: (side: 'left' | 'right') => {
            const current = get();
            const isOpen = side === 'left' ? current.drawerLeftOpen : current.drawerRightOpen;
            current.setDrawerOpen(side, !isOpen);
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
            clearDrawerCloseTimer('right');
            stateEngine.setDrawerRightTab(tab);
            sync();
        },
        setGatewayRoute: (route) => {
            set({ gatewayRoute: route });
        }
    };
});
