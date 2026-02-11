/**
 * StateEngine.js
 * Manages the high-level Application Shell State.
 * 
 * Responsibilities:
 * - Current App Mode (Deep/Flow/Luma)
 * - View Context (Home / SpaceField / Node)
 * - Active Session State (Focus/Rest)
 * - Tool State (Pointer/Link/Area)
 */

import { eventBus, EVENTS } from '../events/EventBus';
import type { NodeId } from '../types';
import { settingsStorage } from '../storage/SettingsStorage';

export const APP_MODES = {
    DEEP: 'deep',
    FLOW: 'flow',
    LUMA: 'luma'
} as const;

export const VIEW_CONTEXTS = {
    HOME: 'home',
    SPACE: 'space',
    CLUSTER: 'cluster',
    NODE: 'node',
    // Legacy alias kept for backward compatibility with older deep links/state snapshots.
    NOW: 'now',
    GATEWAY: 'gateway'
} as const;

export const TOOLS = {
    POINTER: 'pointer',
    LINK: 'link',
    AREA: 'area'
} as const;

type AppMode = typeof APP_MODES[keyof typeof APP_MODES];
type ViewContext = typeof VIEW_CONTEXTS[keyof typeof VIEW_CONTEXTS];
type ToolId = typeof TOOLS[keyof typeof TOOLS];
export type DrawerRightTab = 'analytics' | 'now' | 'cycles' | 'chronos' | 'log' | 'props' | 'ai' | 'signals';

interface SessionState {
    isActive: boolean;
    startTime: number | null;
    label: string | null;
}

interface StateSnapshot {
    appMode: AppMode;
    viewContext: ViewContext;
    currentSpaceId: string | null;
    fieldScopeId: NodeId | null;
    activeTool: ToolId;
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
    glassOpacity: number;
    glassNoise: number;
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
    session: SessionState;
}

class StateEngine {
    private state: StateSnapshot;

    constructor() {
        // Initial State
        this.state = {
            appMode: APP_MODES.DEEP,
            viewContext: VIEW_CONTEXTS.HOME,
            currentSpaceId: null,
            fieldScopeId: null,
            activeTool: TOOLS.POINTER,
            activeScope: null, // If in Node view, which node ID
            settingsOpen: false,
            paletteOpen: false,
            contextMenuMode: 'bar',
            gridSnapEnabled: true,
            gridStepMul: 1,
            showGrid: true,
            showEdges: true,
            showHud: true,
            showCounters: true,
            focusDimEnabled: true,
            subspaceLod: 2,
            showStationLabels: true,
            showPlaygroundOnStation: true,
            glassOpacity: 0.72,
            glassNoise: 0.14,
            drawerLeftOpen: false,
            drawerLeftPinned: false,
            drawerLeftWidth: 'md',
            drawerLeftWidthPx: 320,
            drawerRightOpen: false,
            drawerRightPinned: false,
            drawerRightWidth: 'lg',
            drawerRightWidthPx: 360,
            drawerRightTab: null,
            layoutMode: 'overlay',

            // Session (HUD)
            session: {
                isActive: false,
                startTime: null,
                label: null
            }
        };

        this._loadPersistedSettings();
        this._applyGlassSettings();
    }

    // --- Actions ---

    setAppMode(mode: AppMode) {
        if (!Object.values(APP_MODES).includes(mode)) return;
        this.state.appMode = mode;
        this._emitChange();

        // Also update DOM for global theme CSS
        document.body.className = `mode-${mode}`;
    }

    setTool(toolId: ToolId) {
        if (this.state.activeTool === toolId) return;
        this.state.activeTool = toolId;
        eventBus.emit(EVENTS.TOOL_CHANGED, { tool: toolId });
        this._emitChange();
    }

    setSpace(spaceId: string) {
        if (!spaceId) return;
        if (this.state.currentSpaceId === spaceId) {
            if (this.state.viewContext !== VIEW_CONTEXTS.SPACE) {
                this.state.viewContext = VIEW_CONTEXTS.SPACE;
                eventBus.emit(EVENTS.SPACE_CHANGED, { spaceId });
                this._emitChange();
            }
            return;
        }
        this.state.currentSpaceId = spaceId;
        // When setting space, we typically enter SPACE context unless hidden
        this.state.viewContext = VIEW_CONTEXTS.SPACE;
        if (this.state.activeTool !== TOOLS.POINTER) {
            this.state.activeTool = TOOLS.POINTER;
            eventBus.emit(EVENTS.TOOL_CHANGED, { tool: TOOLS.POINTER });
        }
        if (this.state.fieldScopeId) {
            this.state.fieldScopeId = null;
            eventBus.emit(EVENTS.FIELD_SCOPE_CHANGED, { clusterId: null });
        }
        eventBus.emit(EVENTS.SPACE_CHANGED, { spaceId });
        this._emitChange();
    }

    setSubspaceLod(level: 1 | 2 | 3) {
        if (this.state.subspaceLod === level) return;
        this.state.subspaceLod = level;
        eventBus.emit(EVENTS.SUBSPACE_LOD_CHANGED, { level });
        this._emitChange();
    }

    setFieldScope(clusterId: NodeId | null) {
        if (this.state.fieldScopeId === clusterId) return;
        this.state.fieldScopeId = clusterId;
        if (!clusterId && this.state.viewContext === VIEW_CONTEXTS.CLUSTER) {
            this.state.viewContext = VIEW_CONTEXTS.SPACE;
        }
        eventBus.emit(EVENTS.FIELD_SCOPE_CHANGED, { clusterId });
        this._emitChange();
    }

    enterClusterScope(clusterId: NodeId) {
        if (!clusterId) return;

        if (this.state.viewContext === VIEW_CONTEXTS.NODE) {
            this.state.viewContext = VIEW_CONTEXTS.CLUSTER;
            this.state.activeScope = null;
            eventBus.emit(EVENTS.NODE_EXITED);
        } else if (this.state.viewContext !== VIEW_CONTEXTS.CLUSTER) {
            this.state.viewContext = VIEW_CONTEXTS.CLUSTER;
        }

        if (this.state.fieldScopeId !== clusterId) {
            this.state.fieldScopeId = clusterId;
            eventBus.emit(EVENTS.FIELD_SCOPE_CHANGED, { clusterId });
        }

        this._emitChange();
    }

    toggleClusterScope(clusterId: NodeId) {
        if (!clusterId) return;
        if (this.state.fieldScopeId === clusterId && this.state.viewContext === VIEW_CONTEXTS.CLUSTER) {
            this.setFieldScope(null);
            return;
        }
        this.enterClusterScope(clusterId);
    }

    setViewContext(context: ViewContext) {
        if (!Object.values(VIEW_CONTEXTS).includes(context)) return;
        if (context === VIEW_CONTEXTS.CLUSTER && !this.state.fieldScopeId) {
            this.state.viewContext = VIEW_CONTEXTS.SPACE;
            this._emitChange();
            return;
        }
        this.state.viewContext = context;
        if (context !== VIEW_CONTEXTS.CLUSTER && this.state.fieldScopeId) {
            this.state.fieldScopeId = null;
            eventBus.emit(EVENTS.FIELD_SCOPE_CHANGED, { clusterId: null });
        }
        // Previously cleared currentSpaceId here, but for "Flattened Navigation" (Tabs),
        // we want to persist the "Active Space" even when viewing Station.
        this._emitChange();
    }

    setContextMenuMode(mode: 'bar' | 'radial') {
        if (this.state.contextMenuMode === mode) return;
        this.state.contextMenuMode = mode;
        this._persistSettings({ contextMenuMode: mode });
        eventBus.emit(EVENTS.CONTEXT_MENU_MODE_CHANGED, { mode });
        this._emitChange();
    }

    toggleContextMenuMode() {
        this.setContextMenuMode(this.state.contextMenuMode === 'bar' ? 'radial' : 'bar');
    }

    enterNode(nodeId: NodeId) {
        this.state.viewContext = VIEW_CONTEXTS.NODE;
        this.state.activeScope = nodeId;
        this.state.drawerRightOpen = false;
        this.state.drawerRightTab = null;
        eventBus.emit(EVENTS.NODE_ENTERED, { nodeId });
        this._emitChange();
    }

    exitNode() {
        this.state.viewContext = this.state.fieldScopeId ? VIEW_CONTEXTS.CLUSTER : VIEW_CONTEXTS.SPACE;
        this.state.activeScope = null;
        eventBus.emit(EVENTS.NODE_EXITED);
        this._emitChange();
    }

    // Legacy aliases: keep old API while callers are being migrated.
    enterNow(nodeId: NodeId) {
        this.state.activeScope = nodeId;
        eventBus.emit(EVENTS.NOW_ENTERED, { nodeId });
        this.startFocusSession('Now');
    }

    exitNow() {
        eventBus.emit(EVENTS.NOW_EXITED);
        this.stopFocusSession();
    }

    startFocusSession(label = 'Focus') {
        this.state.session = {
            isActive: true,
            startTime: Date.now(),
            label
        };
        eventBus.emit(EVENTS.SESSION_STATE_SET, this.state.session);
        this._emitChange();
    }

    stopFocusSession() {
        this.state.session = {
            isActive: false,
            startTime: null,
            label: null
        };
        eventBus.emit(EVENTS.SESSION_STATE_SET, this.state.session);
        this._emitChange();
    }

    togglePalette() {
        this.state.paletteOpen = !this.state.paletteOpen;
        eventBus.emit(EVENTS.PALETTE_TOGGLED, { open: this.state.paletteOpen });
        this._emitChange();
    }

    closePalette() {
        if (!this.state.paletteOpen) return;
        this.state.paletteOpen = false;
        eventBus.emit(EVENTS.PALETTE_TOGGLED, { open: false });
        this._emitChange();
    }

    toggleSettings() {
        this.state.settingsOpen = !this.state.settingsOpen;
        eventBus.emit(EVENTS.SETTINGS_TOGGLED, { open: this.state.settingsOpen });
        this._emitChange();
    }

    openSettings() {
        if (this.state.settingsOpen) return;
        this.state.settingsOpen = true;
        eventBus.emit(EVENTS.SETTINGS_TOGGLED, { open: true });
        this._emitChange();
    }

    closeSettings() {
        if (!this.state.settingsOpen) return;
        this.state.settingsOpen = false;
        eventBus.emit(EVENTS.SETTINGS_TOGGLED, { open: false });
        this._emitChange();
    }

    setGridSnapEnabled(enabled: boolean) {
        if (this.state.gridSnapEnabled === enabled) return;
        this.state.gridSnapEnabled = enabled;
        this._persistSettings({ gridSnapEnabled: enabled });
        eventBus.emit(EVENTS.GRID_SNAP_CHANGED, { enabled });
        this._emitChange();
    }

    setGridStepMul(multiplier: number) {
        if (this.state.gridStepMul === multiplier) return;
        this.state.gridStepMul = multiplier;
        this._persistSettings({ gridStepMul: multiplier });
        eventBus.emit(EVENTS.GRID_STEP_CHANGED, { multiplier });
        this._emitChange();
    }

    setShowGrid(enabled: boolean) {
        if (this.state.showGrid === enabled) return;
        this.state.showGrid = enabled;
        this._persistSettings({ showGrid: enabled });
        eventBus.emit(EVENTS.GRID_VISIBILITY_CHANGED, { enabled });
        this._emitChange();
    }

    setShowEdges(enabled: boolean) {
        if (this.state.showEdges === enabled) return;
        this.state.showEdges = enabled;
        this._persistSettings({ showEdges: enabled });
        eventBus.emit(EVENTS.EDGES_VISIBILITY_CHANGED, { enabled });
        this._emitChange();
    }

    setShowHud(enabled: boolean) {
        if (this.state.showHud === enabled) return;
        this.state.showHud = enabled;
        this._persistSettings({ showHud: enabled });
        eventBus.emit(EVENTS.HUD_VISIBILITY_CHANGED, { enabled });
        this._emitChange();
    }

    setShowCounters(enabled: boolean) {
        if (this.state.showCounters === enabled) return;
        this.state.showCounters = enabled;
        this._persistSettings({ showCounters: enabled });
        eventBus.emit(EVENTS.COUNTERS_VISIBILITY_CHANGED, { enabled });
        this._emitChange();
    }

    setFocusDimEnabled(enabled: boolean) {
        if (this.state.focusDimEnabled === enabled) return;
        this.state.focusDimEnabled = enabled;
        this._persistSettings({ focusDimEnabled: enabled });
        eventBus.emit(EVENTS.FOCUS_DIM_CHANGED, { enabled });
        this._emitChange();
    }

    setShowStationLabels(enabled: boolean) {
        if (this.state.showStationLabels === enabled) return;
        this.state.showStationLabels = enabled;
        this._persistSettings({ showStationLabels: enabled });
        eventBus.emit(EVENTS.STATION_LABELS_VISIBILITY_CHANGED, { enabled });
        this._emitChange();
    }

    setShowPlaygroundOnStation(enabled: boolean) {
        if (this.state.showPlaygroundOnStation === enabled) return;
        this.state.showPlaygroundOnStation = enabled;
        this._persistSettings({ showPlaygroundOnStation: enabled });
        eventBus.emit(EVENTS.STATION_PLAYGROUND_VISIBILITY_CHANGED, { enabled });
        this._emitChange();
    }

    // --- Drawer state ---

    setDrawerOpen(side: 'left' | 'right', open: boolean) {
        if (side === 'left') {
            if (this.state.drawerLeftOpen === open) return;
            this.state.drawerLeftOpen = open;
        } else {
            if (this.state.drawerRightOpen === open) return;
            this.state.drawerRightOpen = open;
            if (!open) {
                this.state.drawerRightTab = null;
            }
        }
        eventBus.emit(open ? EVENTS.DRAWER_OPENED : EVENTS.DRAWER_CLOSED, { side });
        this._emitChange();
    }

    toggleDrawerOpen(side: 'left' | 'right') {
        const open = side === 'left' ? !this.state.drawerLeftOpen : !this.state.drawerRightOpen;
        this.setDrawerOpen(side, open);
    }

    setDrawerPinned(side: 'left' | 'right', pinned: boolean) {
        if (side === 'left') {
            if (this.state.drawerLeftPinned === pinned) return;
            this.state.drawerLeftPinned = pinned;
        } else {
            if (this.state.drawerRightPinned === pinned) return;
            this.state.drawerRightPinned = pinned;
        }
        this._emitChange();
    }

    setDrawerWidth(side: 'left' | 'right', width: 'sm' | 'md' | 'lg') {
        if (side === 'left') {
            if (this.state.drawerLeftWidth === width) return;
            this.state.drawerLeftWidth = width;
            // Sync pixel width for consistency
            if (width === 'sm') this.state.drawerLeftWidthPx = 280;
            if (width === 'md') this.state.drawerLeftWidthPx = 320;
            if (width === 'lg') this.state.drawerLeftWidthPx = 360;
        } else {
            if (this.state.drawerRightWidth === width) return;
            this.state.drawerRightWidth = width;
            if (width === 'sm') this.state.drawerRightWidthPx = 280;
            if (width === 'md') this.state.drawerRightWidthPx = 320;
            if (width === 'lg') this.state.drawerRightWidthPx = 360;
        }
        this._emitChange();
    }

    setDrawerWidthPx(side: 'left' | 'right', width: number) {
        if (side === 'left') {
            this.state.drawerLeftWidthPx = width;
        } else {
            this.state.drawerRightWidthPx = width;
        }
        this._emitChange();
    }

    setLayoutMode(mode: 'overlay' | 'pinned' | 'split') {
        if (this.state.layoutMode === mode) return;
        this.state.layoutMode = mode;
        this._emitChange();
    }

    setDrawerRightTab(tab: DrawerRightTab | null) {
        if (this.state.drawerRightTab === tab) return;
        this.state.drawerRightTab = tab;
        if (tab) {
            this.state.drawerRightOpen = true;
        }
        this._emitChange();
    }

    // --- Getters ---

    getState() {
        return { ...this.state };
    }

    // --- Internal ---

    _emitChange() {
        // We don't emit a generic "StateChanged" event on EventBus to avoid noise.
        // Instead, Stores subscribe to specific events or pull from here.
        // However, for React syncing, we might need a signal.
        // For v0.5, we will let the Zustand store handle the reactivity by
        // polling or manually triggering updates when calling these methods.
    }

    private _loadPersistedSettings() {
        const data = settingsStorage.load();
        if (data.contextMenuMode === 'bar' || data.contextMenuMode === 'radial') {
            this.state.contextMenuMode = data.contextMenuMode;
        }
        if (typeof data.gridSnapEnabled === 'boolean') {
            this.state.gridSnapEnabled = data.gridSnapEnabled;
        }
        if (typeof data.gridStepMul === 'number') {
            this.state.gridStepMul = data.gridStepMul;
        }
        if (typeof data.showGrid === 'boolean') {
            this.state.showGrid = data.showGrid;
        }
        if (typeof data.showEdges === 'boolean') {
            this.state.showEdges = data.showEdges;
        }
        if (typeof data.showHud === 'boolean') {
            this.state.showHud = data.showHud;
        }
        if (typeof data.showCounters === 'boolean') {
            this.state.showCounters = data.showCounters;
        }
        if (typeof data.focusDimEnabled === 'boolean') {
            this.state.focusDimEnabled = data.focusDimEnabled;
        }
        if (typeof data.showStationLabels === 'boolean') {
            this.state.showStationLabels = data.showStationLabels;
        }
        if (typeof data.showPlaygroundOnStation === 'boolean') {
            this.state.showPlaygroundOnStation = data.showPlaygroundOnStation;
        }
        if (typeof data.glassOpacity === 'number') {
            this.state.glassOpacity = data.glassOpacity;
        }
        if (typeof data.glassNoise === 'number') {
            this.state.glassNoise = data.glassNoise;
        }
    }

    private _persistSettings(patch: Partial<StateSnapshot>) {
        settingsStorage.save(patch);
    }

    private _applyGlassSettings() {
        if (typeof document === 'undefined') return;
        const opacity = this.state.glassOpacity;
        const noise = this.state.glassNoise;
        const root = document.documentElement;
        root.style.setProperty('--glass-bg', `rgba(10, 10, 14, ${opacity})`);
        root.style.setProperty('--bar-bg', `rgba(10, 10, 14, ${opacity})`);
        root.style.setProperty('--glass-grain-opacity', `${noise}`);
    }
}

export const stateEngine = new StateEngine();
