import { EVENTS, eventBus } from '../events/EventBus';
import { isSfContentRemoteEnabled, removeSfLink, upsertSfLink } from '../data/sfContentRemote';

let sfContentSyncStarted = false;

export const initSfContentSync = () => {
    if (sfContentSyncStarted) {
        return () => {};
    }
    if (typeof window === 'undefined' || !isSfContentRemoteEnabled()) {
        return () => {};
    }

    sfContentSyncStarted = true;

    const disposeLinkCreated = eventBus.on(EVENTS.LINK_CREATED, ({ payload }) => {
        const now = Date.now();
        void upsertSfLink({
            linkId: String(payload.id),
            fromDocId: String(payload.source),
            fromBlockId: null,
            toNodeId: String(payload.target),
            linkType: payload.type === 'portal' ? 'portal' : 'ref',
            createdAt: now,
            updatedAt: now
        });
    });

    const disposeLinkDeleted = eventBus.on(EVENTS.LINK_DELETED, ({ payload }) => {
        void removeSfLink(String(payload.id));
    });

    return () => {
        disposeLinkCreated();
        disposeLinkDeleted();
        sfContentSyncStarted = false;
    };
};

