import { eventBus, EVENTS, type AnyBusEvent, type EventKey } from './EventBus';
import { buildGraphAddressSnapshot } from '../navigation/GraphAddress';
import { stateEngine } from '../state/StateEngine';
import type { EdgeId, NodeId, GraphAddress } from '../types';

export interface EventLogEntry {
    id: string;
    ts: number;
    userId: string;
    spaceId: string | null;
    address?: GraphAddress | null;
    actionType: string;
    entityKind?: string | null;
    entityId?: string | null;
    payload: Record<string, unknown> | unknown;
    undo?: Record<string, unknown> | null;
    meta?: Record<string, unknown> | null;
}

const NAV_EVENTS = new Set<EventKey>([
    EVENTS.NODE_ENTERED,
    EVENTS.NODE_EXITED,
    EVENTS.NOW_ENTERED,
    EVENTS.NOW_EXITED,
    EVENTS.PORTAL_ENTERED,
    EVENTS.ADDRESS_RESOLVED,
    EVENTS.ADDRESS_FAILED
]);

const ACTION_MAP: Partial<Record<EventKey, { actionType: string; entityKind?: string; entityId?: (e: AnyBusEvent) => string | null }>> = {
    [EVENTS.NODE_CREATED]: {
        actionType: 'create_node',
        entityKind: 'node',
        entityId: e => (e.payload as { id: NodeId }).id
    },
    [EVENTS.NODE_UPDATED]: {
        actionType: 'update_node',
        entityKind: 'node',
        entityId: e => (e.payload as { id: NodeId }).id
    },
    [EVENTS.NODE_DELETED]: {
        actionType: 'delete_node',
        entityKind: 'node',
        entityId: e => (e.payload as { id: NodeId }).id
    },
    [EVENTS.LINK_CREATED]: {
        actionType: 'connect_nodes',
        entityKind: 'edge',
        entityId: e => (e.payload as { id: EdgeId }).id
    },
    [EVENTS.LINK_DELETED]: {
        actionType: 'delete_edge',
        entityKind: 'edge',
        entityId: e => (e.payload as { id: EdgeId }).id
    },
    [EVENTS.CLUSTER_CREATED]: {
        actionType: 'group_to_cluster',
        entityKind: 'cluster',
        entityId: e => (e.payload as { id: string }).id
    },
    [EVENTS.SESSION_STATE_SET]: {
        actionType: 'session_state_set',
        entityKind: 'session'
    }
};

const EVENT_MAP: Partial<Record<EventKey, string>> = {
    [EVENTS.NODE_ENTERED]: 'node_entered',
    [EVENTS.NODE_EXITED]: 'node_exited',
    [EVENTS.NOW_ENTERED]: 'now_entered',
    [EVENTS.NOW_EXITED]: 'now_exited',
    [EVENTS.PORTAL_ENTERED]: 'portal_entered',
    [EVENTS.ADDRESS_RESOLVED]: 'address_resolved',
    [EVENTS.ADDRESS_FAILED]: 'address_failed'
};

const getActorId = () => {
    if (typeof window === 'undefined') return 'local';
    try {
        const storageKey = 'sf_installation_id';
        const existing = window.localStorage.getItem(storageKey);
        if (existing) return `local:${existing}`;
        const created = crypto.randomUUID();
        window.localStorage.setItem(storageKey, created);
        return `local:${created}`;
    } catch {
        return 'local';
    }
};

class EventLog {
    private entries: EventLogEntry[] = [];

    append(entry: EventLogEntry) {
        this.entries.push(entry);
    }

    getEntries() {
        return [...this.entries];
    }

    handleEvent(event: AnyBusEvent) {
        const actionSpec = ACTION_MAP[event.type];
        const eventType = EVENT_MAP[event.type];

        if (!actionSpec && !eventType) return;

        const state = stateEngine.getState();
        const payloadAddress = (event.payload as { address?: GraphAddress } | undefined)?.address;
        const address = NAV_EVENTS.has(event.type) ? (payloadAddress ?? buildGraphAddressSnapshot()) : null;

        const entry: EventLogEntry = {
            id: crypto.randomUUID(),
            ts: Date.now(),
            userId: getActorId(),
            spaceId: state.currentSpaceId ?? null,
            address,
            actionType: actionSpec?.actionType ?? eventType ?? String(event.type),
            entityKind: actionSpec?.entityKind ?? null,
            entityId: actionSpec?.entityId ? actionSpec.entityId(event) : null,
            payload: event.payload ?? {},
            undo: null,
            meta: {
                source: 'eventBus',
                category: event.meta?.category
            }
        };

        this.append(entry);
    }
}

export const eventLog = new EventLog();

export const initEventLog = () => {
    const middleware = (event: AnyBusEvent) => {
        try {
            eventLog.handleEvent(event);
        } catch (error) {
            console.warn('EventLog append failed:', error);
        }
    };

    return eventBus.use(middleware);
};
