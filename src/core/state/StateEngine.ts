/**
 * StateEngine.js
 * Manages the high-level Application Shell State.
 * 
 * Responsibilities:
 * - Current App Mode (Deep/Flow/Luma)
 * - View Context (Home / SpaceField / Now)
 * - Active Session State (Focus/Rest)
 * - Tool State (Pointer/Link/Area)
 */

import { eventBus, EVENTS } from '../events/EventBus';
import type { NodeId } from '../types';

export const APP_MODES = {
    DEEP: 'deep',
    FLOW: 'flow',
    LUMA: 'luma'
} as const;

export const VIEW_CONTEXTS = {
    HOME: 'home',
    SPACE: 'space',
    NOW: 'now'
} as const;

export const TOOLS = {
    POINTER: 'pointer',
    LINK: 'link',
    AREA: 'area'
} as const;

type AppMode = typeof APP_MODES[keyof typeof APP_MODES];
type ViewContext = typeof VIEW_CONTEXTS[keyof typeof VIEW_CONTEXTS];
type ToolId = typeof TOOLS[keyof typeof TOOLS];

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
            activeScope: null, // If in NOW, which node ID
            settingsOpen: false,
            paletteOpen: false,
            contextMenuMode: 'bar',

            // Session (HUD)
            session: {
                isActive: false,
                startTime: null,
                label: null
            }
        };
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
            eventBus.emit(EVENTS.FIELD_SCOPE_CHANGED, { hubId: null });
        }
        eventBus.emit(EVENTS.SPACE_CHANGED, { spaceId });
        this._emitChange();
    }

    setFieldScope(hubId: NodeId | null) {
        if (this.state.fieldScopeId === hubId) return;
        this.state.fieldScopeId = hubId;
        eventBus.emit(EVENTS.FIELD_SCOPE_CHANGED, { hubId });
        this._emitChange();
    }

    setViewContext(context: ViewContext) {
        if (!Object.values(VIEW_CONTEXTS).includes(context)) return;
        this.state.viewContext = context;
        // Clear currentSpaceId when returning to home to allow re-navigation to the same space
        if (context === VIEW_CONTEXTS.HOME) {
            this.state.currentSpaceId = null;
        }
        this._emitChange();
    }

    setContextMenuMode(mode: 'bar' | 'radial') {
        if (this.state.contextMenuMode === mode) return;
        this.state.contextMenuMode = mode;
        eventBus.emit(EVENTS.CONTEXT_MENU_MODE_CHANGED, { mode });
        this._emitChange();
    }

    toggleContextMenuMode() {
        this.setContextMenuMode(this.state.contextMenuMode === 'bar' ? 'radial' : 'bar');
    }

    enterNow(nodeId: NodeId) {
        this.state.viewContext = VIEW_CONTEXTS.NOW;
        this.state.activeScope = nodeId;
        eventBus.emit(EVENTS.NOW_ENTERED, { nodeId });
        this._emitChange();
    }

    exitNow() {
        this.state.viewContext = VIEW_CONTEXTS.SPACE;
        this.state.activeScope = null;
        eventBus.emit(EVENTS.NOW_EXITED);
        this._emitChange();
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

    closeSettings() {
        if (!this.state.settingsOpen) return;
        this.state.settingsOpen = false;
        eventBus.emit(EVENTS.SETTINGS_TOGGLED, { open: false });
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
}

export const stateEngine = new StateEngine();
