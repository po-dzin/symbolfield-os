/**
 * EventBus.ts
 * Central nervous system for SymbolField OS.
 * Handles:
 * - DomainEvents (persisted, undoable)
 * - UIEvents (app state, transient)
 * - OverlayEvents (high-frequency, visual only)
 */

import type { Edge, NodeBase, NodeId, EdgeId, GraphAddress, Area, Position } from '../types';

// Event Types Constants
export const EVENTS = {
    // Domain (Persisted)
    NODE_CREATED: 'NodeCreated',
    NODE_UPDATED: 'NodeUpdated',
    NODE_MOVED: 'NodeMoved', // Maybe debounced
    NODE_DELETED: 'NodeDeleted',
    LINK_CREATED: 'LinkCreated',
    LINK_DELETED: 'LinkDeleted',
    HUB_CREATED: 'HubCreated',
    SESSION_STATE_SET: 'SessionStateSet',

    // UI (App State)
    SELECTION_CHANGED: 'SelectionChanged',
    TOOL_CHANGED: 'ToolChanged',
    DRAWER_OPENED: 'DrawerOpened',
    DRAWER_CLOSED: 'DrawerClosed',
    NODE_ENTERED: 'NodeEntered',
    NODE_EXITED: 'NodeExited',
    NOW_ENTERED: 'NowEntered',
    NOW_EXITED: 'NowExited',
    SETTINGS_TOGGLED: 'SettingsToggled',
    PALETTE_TOGGLED: 'PaletteToggled',
    EDGE_SELECTED: 'EdgeSelected',
    SPACE_CHANGED: 'SpaceChanged',
    FIELD_SCOPE_CHANGED: 'FieldScopeChanged',
    CONTEXT_MENU_MODE_CHANGED: 'ContextMenuModeChanged',
    GRID_SNAP_CHANGED: 'GridSnapChanged',
    GRID_VISIBILITY_CHANGED: 'GridVisibilityChanged',
    EDGES_VISIBILITY_CHANGED: 'EdgesVisibilityChanged',
    HUD_VISIBILITY_CHANGED: 'HudVisibilityChanged',
    COUNTERS_VISIBILITY_CHANGED: 'CountersVisibilityChanged',
    GRID_STEP_CHANGED: 'GridStepChanged',
    FOCUS_DIM_CHANGED: 'FocusDimChanged',
    SUBSPACE_LOD_CHANGED: 'SubspaceLodChanged',
    STATION_LABELS_VISIBILITY_CHANGED: 'StationLabelsVisibilityChanged',
    STATION_PLAYGROUND_VISIBILITY_CHANGED: 'StationPlaygroundVisibilityChanged',
    SPACE_CREATED: 'SpaceCreated',
    SPACE_RENAMED: 'SpaceRenamed',
    SPACE_DELETED: 'SpaceDeleted',
    PORTAL_ENTERED: 'PortalEntered',
    PORTAL_HOVERED: 'PortalHovered',
    ADDRESS_RESOLVED: 'AddressResolved',
    ADDRESS_FAILED: 'AddressFailed',
    REGION_CREATED: 'RegionCreated',
    REGION_UPDATED: 'RegionUpdated',
    REGION_DELETED: 'RegionDeleted',

    // Onboarding & Playground
    PLAYGROUND_CREATED: 'PlaygroundCreated',
    PLAYGROUND_RESET: 'PlaygroundReset',
    ONBOARDING_STARTED: 'OnboardingStarted',
    ONBOARDING_COMPLETED: 'OnboardingCompleted',

    // Overlay (Transient)
    LINK_PREVIEW_UPDATED: 'LinkPreviewUpdated',
    SELECTION_PREVIEW_UPDATED: 'SelectionPreviewUpdated',
    GRAPH_CLEARED: 'GraphCleared',
    UI_REQ_EDIT_LABEL: 'UIReqEditLabel'
} as const;

type EventCategory = 'DOMAIN' | 'ERROR' | 'OVERLAY' | 'UI';

export interface InteractionPayload {
    type: 'BOX_SELECT' | 'LINK_DRAG' | 'PAN' | 'DRAG_NODES' | 'REGION_DRAW';
    x?: number;
    y?: number;
    rect?: { x: number; y: number; width: number; height: number };
    circle?: { cx: number; cy: number; r: number };
    shape?: 'rect' | 'circle';
    line?: { x1: number; y1: number; x2: number; y2: number };
    associative?: boolean;
    screenX?: number;
    screenY?: number;
    nodeIds?: NodeId[];
    startPositions?: Record<string, Position>;
    endPositions?: Record<string, Position>;
    moved?: boolean;
}

export interface UISignalPayload {
    x: number;
    y: number;
    id?: string;
    sourceId?: string;
    type?: 'OPEN_NODE' | 'ENTER_NOW' | 'GROUP_CREATED' | string;
}

export interface EventMap {
    [EVENTS.NODE_CREATED]: NodeBase;
    [EVENTS.NODE_UPDATED]: { id: NodeId; patch: Partial<Omit<NodeBase, 'id'>>; before: NodeBase; after: NodeBase };
    [EVENTS.NODE_DELETED]: { id: NodeId; node: NodeBase | undefined; edges: Edge[] };
    [EVENTS.LINK_CREATED]: Edge & { type?: string };
    [EVENTS.LINK_DELETED]: { id: EdgeId; edge: (Edge & { type?: string }) | undefined };
    [EVENTS.HUB_CREATED]: { id: string } | undefined;
    [EVENTS.SESSION_STATE_SET]: { isActive: boolean; startTime: number | null; label: string | null };
    [EVENTS.SELECTION_CHANGED]: {
        selection: NodeId[];
        primary: NodeId | null;
        mode: 'single' | 'multi' | 'box';
        bounds: { x1: number; y1: number; x2: number; y2: number } | null;
    };
    [EVENTS.TOOL_CHANGED]: { tool: string };
    [EVENTS.DRAWER_OPENED]: { side?: string } | undefined;
    [EVENTS.DRAWER_CLOSED]: { side?: string } | undefined;
    [EVENTS.NODE_ENTERED]: { nodeId: NodeId };
    [EVENTS.NODE_EXITED]: undefined;
    [EVENTS.NOW_ENTERED]: { nodeId: NodeId };
    [EVENTS.NOW_EXITED]: undefined;
    [EVENTS.SETTINGS_TOGGLED]: { open: boolean };
    [EVENTS.PALETTE_TOGGLED]: { open: boolean };
    [EVENTS.EDGE_SELECTED]: { id: EdgeId } | undefined;
    [EVENTS.SPACE_CHANGED]: { spaceId: string };
    [EVENTS.FIELD_SCOPE_CHANGED]: { hubId: NodeId | null };
    [EVENTS.CONTEXT_MENU_MODE_CHANGED]: { mode: 'bar' | 'radial' };
    [EVENTS.GRID_SNAP_CHANGED]: { enabled: boolean };
    [EVENTS.GRID_VISIBILITY_CHANGED]: { enabled: boolean };
    [EVENTS.EDGES_VISIBILITY_CHANGED]: { enabled: boolean };
    [EVENTS.HUD_VISIBILITY_CHANGED]: { enabled: boolean };
    [EVENTS.COUNTERS_VISIBILITY_CHANGED]: { enabled: boolean };
    [EVENTS.GRID_STEP_CHANGED]: { multiplier: number };
    [EVENTS.FOCUS_DIM_CHANGED]: { enabled: boolean };
    [EVENTS.SUBSPACE_LOD_CHANGED]: { level: 1 | 2 | 3 };
    [EVENTS.STATION_LABELS_VISIBILITY_CHANGED]: { enabled: boolean };
    [EVENTS.STATION_PLAYGROUND_VISIBILITY_CHANGED]: { enabled: boolean };
    [EVENTS.SPACE_CREATED]: { spaceId: string; name: string; kind?: string };
    [EVENTS.SPACE_RENAMED]: { spaceId: string; name: string };
    [EVENTS.SPACE_DELETED]: { spaceId: string; deletedAt: number };
    [EVENTS.PORTAL_ENTERED]: { address: GraphAddress };
    [EVENTS.PORTAL_HOVERED]: { address?: GraphAddress; spaceId?: string };
    [EVENTS.ADDRESS_RESOLVED]: { address: GraphAddress };
    [EVENTS.ADDRESS_FAILED]: { address: GraphAddress; reason: string };
    [EVENTS.PLAYGROUND_CREATED]: { spaceId: string };
    [EVENTS.PLAYGROUND_RESET]: { archivedCount: number; newSpaceId: string };
    [EVENTS.ONBOARDING_STARTED]: undefined;
    [EVENTS.ONBOARDING_COMPLETED]: undefined;
    [EVENTS.REGION_CREATED]: { region: Area };
    [EVENTS.REGION_UPDATED]: { regionId: string; before: Area; after: Area };
    [EVENTS.REGION_DELETED]: { region: Area };
    [EVENTS.LINK_PREVIEW_UPDATED]: undefined;
    [EVENTS.SELECTION_PREVIEW_UPDATED]: undefined;
    GRAPH_UNDO: undefined;
    GRAPH_REDO: undefined;
    UI_SIGNAL: UISignalPayload;
    UI_INTERACTION_START: InteractionPayload;
    UI_INTERACTION_UPDATE: InteractionPayload;
    UI_INTERACTION_END: InteractionPayload;
    UI_FOCUS_NODE: { id: NodeId };
    UI_DRAWER_TOGGLE: { side: 'right' | 'left' };
    [EVENTS.UI_REQ_EDIT_LABEL]: { nodeId: NodeId };
    [EVENTS.GRAPH_CLEARED]: undefined;
}

export type EventKey = keyof EventMap;
export type AnyBusEvent = { [K in EventKey]: BusEvent<K> }[EventKey];

export interface BusEvent<K extends EventKey = EventKey> {
    id: string;
    type: K;
    payload: EventMap[K];
    meta: {
        timestamp: number;
        category: EventCategory;
        [key: string]: unknown;
    };
}

type EventHandler<K extends EventKey = EventKey> = (event: BusEvent<K>) => void;
type EventMiddleware = (event: AnyBusEvent) => void;
type Listener = (event: AnyBusEvent) => void;

type OptionalPayloadKeys = {
    [K in EventKey]: EventMap[K] extends undefined ? K : never
}[EventKey];

class EventBus {
    private listeners: Map<string, Set<Listener>>;
    private history: Array<AnyBusEvent>;
    private middlewares: EventMiddleware[];

    constructor() {
        this.listeners = new Map();
        this.history = []; // Simplified local history for v0.5
        this.middlewares = [];
    }

    /**
     * Subscribe to an event type
     * @param {string} type - Event type (e.g., 'NodeCreated', 'SelectionChanged')
     * @param {Function} callback - Handler function
     * @returns {Function} unsubscribe function
     */
    on<K extends EventKey>(type: K, callback: EventHandler<K>) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set());
        }
        this.listeners.get(type)!.add(callback as unknown as Listener);

        // Return unsubscribe
        return () => this.off(type, callback);
    }

    /**
     * Register middleware (logging, persistence, validation).
     */
    use(middleware: EventMiddleware) {
        this.middlewares.push(middleware);
        return () => {
            const idx = this.middlewares.indexOf(middleware);
            if (idx >= 0) this.middlewares.splice(idx, 1);
        };
    }

    /**
     * Unsubscribe
     */
    off<K extends EventKey>(type: K, callback: EventHandler<K>) {
        if (!this.listeners.has(type)) return;
        this.listeners.get(type)!.delete(callback as unknown as Listener);
    }

    /**
     * Emit an event
     * @param {string} type - Event name
     * @param {Object} payload - Event data
     * @param {Object} meta - Metadata (timestamp, source, category)
     */
    emit<K extends OptionalPayloadKeys>(type: K, payload?: EventMap[K], meta?: Record<string, unknown>): void;
    emit<K extends Exclude<EventKey, OptionalPayloadKeys>>(type: K, payload: EventMap[K], meta?: Record<string, unknown>): void;
    emit<K extends EventKey>(type: K, payload?: EventMap[K], meta: Record<string, unknown> = {}) {
        const event: BusEvent<K> = {
            id: crypto.randomUUID(),
            type,
            payload: payload as EventMap[K],
            meta: {
                timestamp: Date.now(),
                category: this._categorize(type),
                ...meta
            }
        };

        // Run middlewares (logging, validation, etc)
        for (const mw of this.middlewares) {
            try {
                mw(event as AnyBusEvent);
            } catch (e) {
                console.error('Middleware error:', e);
            }
        }

        // Persist Domain events
        if (event.meta.category === 'DOMAIN') {
            this.history.push(event as AnyBusEvent);
            // TODO: Connect to backend persistence here
        }

        // Notify listeners
        if (this.listeners.has(type)) {
            this.listeners.get(type)!.forEach(cb => {
                try {
                    cb(event as AnyBusEvent);
                } catch (e) {
                    console.error(`Error in listener for ${type}:`, e);
                }
            });
        }

        // Wildcard listeners (for devtools/logging)
        if (this.listeners.has('*')) {
            this.listeners.get('*')!.forEach(cb => cb(event as AnyBusEvent));
        }
    }

    /**
     * Helper to categorize events based on naming convention or list
     */
    private _categorize(type: string): EventCategory {
        // Defined in UI_INTERACTION_PIPELINE_SoT_v0.5
        if (type.startsWith('Node') || type.startsWith('Link') || type.startsWith('Hub') || type.startsWith('Region') || type.startsWith('Session') || type.startsWith('Playground') || type.startsWith('Onboarding') || type.startsWith('Space')) return 'DOMAIN';
        if (type.startsWith('Limit') || type.startsWith('Constraint')) return 'ERROR';
        if (type.includes('Preview') || type.includes('Hint')) return 'OVERLAY';
        return 'UI';
    }

    /**
     * Get recent history (for debug/undo)
     */
    getHistory() {
        return this.history;
    }
}

// Singleton instance
export const eventBus = new EventBus();
