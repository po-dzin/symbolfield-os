/**
 * useAppStore.ts
 * React binding for StateEngine.
 */

import { create } from 'zustand';
import { stateEngine } from '../core/state/StateEngine';
import { eventBus, EVENTS } from '../core/events/EventBus';
import type { NodeId } from '../core/types';

// Matches StateEngine constants
type AppModeType = 'deep' | 'flow' | 'luma';
type ViewContextType = 'home' | 'space' | 'now';
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
    session: Session;
}

interface AppStoreState extends AppState {
    setAppMode: (mode: AppModeType) => void;
    setViewContext: (context: ViewContextType) => void;
    setTool: (tool: ToolType) => void;
    setSpace: (spaceId: string) => void;
    setFieldScope: (hubId: NodeId | null) => void;
    enterNow: (nodeId: NodeId) => void;
    exitNow: () => void;
    startFocusSession: (label: string) => void;
    stopFocusSession: () => void;
    togglePalette: () => void;
    closePalette: () => void;
    toggleSettings: () => void;
    closeSettings: () => void;
    setContextMenuMode: (mode: 'bar' | 'radial') => void;
    toggleContextMenuMode: () => void;
}

export const useAppStore = create<AppStoreState>((set) => {
    // Initial Sync
    const initialState = stateEngine.getState() as unknown as AppState;

    // Subscribe to changes
    const sync = () => set(stateEngine.getState() as unknown as AppState);

    eventBus.on(EVENTS.TOOL_CHANGED, sync);
    eventBus.on(EVENTS.NOW_ENTERED, sync);
    eventBus.on(EVENTS.NOW_EXITED, sync);
    eventBus.on(EVENTS.SESSION_STATE_SET, sync);
    eventBus.on(EVENTS.SETTINGS_TOGGLED, sync);
    eventBus.on(EVENTS.PALETTE_TOGGLED, sync);
    eventBus.on(EVENTS.SPACE_CHANGED, sync);
    eventBus.on(EVENTS.FIELD_SCOPE_CHANGED, sync);
    eventBus.on(EVENTS.CONTEXT_MENU_MODE_CHANGED, sync);

    return {
        ...initialState,

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
    };
});
