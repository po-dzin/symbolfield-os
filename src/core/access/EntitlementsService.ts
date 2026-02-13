type EntitlementsSource = 'local' | 'remote';
type EntitlementsPlan = 'free' | 'beta_tester' | 'pro' | 'studio';
type RemoteEntitlementAction = 'create_space' | 'create_share_link' | 'import' | 'use_portal_builder';
type EntitlementErrorCode =
    'spaces_max_reached'
    | 'share_disabled'
    | 'share_max_reached'
    | 'import_disabled'
    | 'portal_builder_disabled';

export interface EntitlementsSnapshot {
    source: EntitlementsSource;
    plan: EntitlementsPlan;
    features: {
        shareEnabled: boolean;
        importEnabled: boolean;
        portalBuilderEnabled: boolean;
    };
    limits: {
        spacesMax: number;
        shareReadonlyLinksMax: number;
        collabMaxMembersPerSpace: number;
    };
    updatedAt: number;
}

const STORAGE_KEY = 'sf_entitlements.v0.5';

const DEFAULT_ENTITLEMENTS: EntitlementsSnapshot = {
    source: 'local',
    plan: 'free',
    features: {
        shareEnabled: true,
        importEnabled: true,
        portalBuilderEnabled: true
    },
    limits: {
        spacesMax: 12,
        shareReadonlyLinksMax: 8,
        collabMaxMembersPerSpace: 1
    },
    updatedAt: Date.now()
};

const normalizeBaseUrl = (value: string): string => {
    try {
        return new URL(value).toString().replace(/\/$/, '');
    } catch {
        return '';
    }
};

const readRemoteConfig = (): { enabled: boolean; baseUrl: string; token: string; failClosed: boolean } => {
    const mode = (import.meta.env.VITE_ENTITLEMENTS_BACKEND ?? import.meta.env.VITE_UI_STATE_BACKEND ?? 'local').toLowerCase();
    const baseUrl = normalizeBaseUrl(
        (import.meta.env.VITE_ENTITLEMENTS_API_BASE_URL ?? import.meta.env.VITE_UI_STATE_API_BASE_URL ?? '').trim()
    );
    const token = (import.meta.env.VITE_ENTITLEMENTS_API_TOKEN ?? import.meta.env.VITE_UI_STATE_API_TOKEN ?? '').trim();
    const failClosed = (import.meta.env.VITE_ENTITLEMENTS_REMOTE_FAIL_CLOSED ?? 'false').toLowerCase() === 'true';
    if (mode !== 'remote' || !baseUrl) {
        return { enabled: false, baseUrl: '', token: '', failClosed: false };
    }
    return { enabled: true, baseUrl, token, failClosed };
};

const defaultRemoteConfig = readRemoteConfig();
let remoteConfig = defaultRemoteConfig;

const readPersistedSnapshot = (): EntitlementsSnapshot => {
    if (typeof window === 'undefined') return DEFAULT_ENTITLEMENTS;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_ENTITLEMENTS;
        const parsed = JSON.parse(raw) as unknown;
        return normalizeEntitlementsPayload(parsed) ?? DEFAULT_ENTITLEMENTS;
    } catch {
        return DEFAULT_ENTITLEMENTS;
    }
};

const persistSnapshot = (snapshot: EntitlementsSnapshot) => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
        // Storage write errors are non-fatal in MVP mode.
    }
};

const toNumber = (value: unknown, fallback: number): number => (
    typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

const toBool = (value: unknown, fallback: boolean): boolean => (
    typeof value === 'boolean' ? value : fallback
);

const readNestedValue = (input: Record<string, unknown>, key: string): unknown => {
    if (key in input) return input[key];
    const nested = key.split('.');
    let current: unknown = input;
    for (const part of nested) {
        if (!current || typeof current !== 'object') return undefined;
        current = (current as Record<string, unknown>)[part];
    }
    return current;
};

const pickFirstDefined = (input: Record<string, unknown>, keys: string[]): unknown => {
    for (const key of keys) {
        const value = readNestedValue(input, key);
        if (value !== undefined) return value;
    }
    return undefined;
};

const normalizeEntitlementsPayload = (payload: unknown): EntitlementsSnapshot | null => {
    if (!payload || typeof payload !== 'object') return null;
    const raw = payload as Record<string, unknown>;
    const unwrapped = (
        (raw.payload && typeof raw.payload === 'object' ? raw.payload : undefined)
        || (raw.data && typeof raw.data === 'object' ? raw.data : undefined)
        || (raw.state && typeof raw.state === 'object' ? raw.state : undefined)
        || raw
    ) as Record<string, unknown>;

    const entitlementsMap = (
        unwrapped.entitlements && typeof unwrapped.entitlements === 'object'
            ? unwrapped.entitlements as Record<string, unknown>
            : {}
    );
    const featuresMap = (
        unwrapped.features && typeof unwrapped.features === 'object'
            ? unwrapped.features as Record<string, unknown>
            : {}
    );
    const limitsMap = (
        unwrapped.limits && typeof unwrapped.limits === 'object'
            ? unwrapped.limits as Record<string, unknown>
            : {}
    );

    const planCandidate = String(unwrapped.plan ?? DEFAULT_ENTITLEMENTS.plan).trim().toLowerCase();
    const plan: EntitlementsPlan = (
        planCandidate === 'beta_tester'
        || planCandidate === 'pro'
        || planCandidate === 'studio'
    )
        ? planCandidate
        : 'free';

    const spacesMax = toNumber(
        pickFirstDefined(
            {
                ...unwrapped,
                ...entitlementsMap,
                ...limitsMap
            },
            ['spaces.max', 'spacesMax', 'limits.spaces.max', 'limits.spacesMax']
        ),
        DEFAULT_ENTITLEMENTS.limits.spacesMax
    );

    const shareReadonlyLinksMax = toNumber(
        pickFirstDefined(
            {
                ...unwrapped,
                ...entitlementsMap,
                ...limitsMap
            },
            ['share.readonly_links.max', 'shareReadonlyLinksMax', 'limits.share.readonly_links.max', 'limits.shareReadonlyLinksMax']
        ),
        DEFAULT_ENTITLEMENTS.limits.shareReadonlyLinksMax
    );

    const collabMaxMembersPerSpace = toNumber(
        pickFirstDefined(
            {
                ...unwrapped,
                ...entitlementsMap,
                ...limitsMap
            },
            ['collab.max_members_per_space', 'collabMaxMembersPerSpace']
        ),
        DEFAULT_ENTITLEMENTS.limits.collabMaxMembersPerSpace
    );

    const shareEnabled = toBool(
        pickFirstDefined(
            {
                ...unwrapped,
                ...entitlementsMap,
                ...featuresMap
            },
            ['share.enabled', 'shareEnabled', 'features.share.enabled', 'features.shareEnabled']
        ),
        DEFAULT_ENTITLEMENTS.features.shareEnabled
    );

    const importEnabled = toBool(
        pickFirstDefined(
            {
                ...unwrapped,
                ...entitlementsMap,
                ...featuresMap
            },
            ['import.enabled', 'importEnabled', 'features.import.enabled', 'features.importEnabled']
        ),
        DEFAULT_ENTITLEMENTS.features.importEnabled
    );

    const portalBuilderEnabled = toBool(
        pickFirstDefined(
            {
                ...unwrapped,
                ...entitlementsMap,
                ...featuresMap
            },
            ['portal.builder.enabled', 'portalBuilderEnabled', 'features.portal.builder.enabled', 'features.portalBuilderEnabled']
        ),
        DEFAULT_ENTITLEMENTS.features.portalBuilderEnabled
    );

    return {
        source: 'remote',
        plan,
        features: {
            shareEnabled,
            importEnabled,
            portalBuilderEnabled
        },
        limits: {
            spacesMax,
            shareReadonlyLinksMax,
            collabMaxMembersPerSpace
        },
        updatedAt: Date.now()
    };
};

export class EntitlementLimitError extends Error {
    code: EntitlementErrorCode;
    limit?: number;
    used?: number;

    constructor(
        code: EntitlementErrorCode,
        message: string,
        details?: { limit?: number; used?: number }
    ) {
        super(message);
        this.name = 'EntitlementLimitError';
        this.code = code;
        if (details?.limit !== undefined) this.limit = details.limit;
        if (details?.used !== undefined) this.used = details.used;
    }
}

const requestRemoteEntitlements = async (): Promise<EntitlementsSnapshot | null> => {
    if (!remoteConfig.enabled || typeof window === 'undefined') return null;
    const headers: Record<string, string> = {
        Accept: 'application/json'
    };
    if (remoteConfig.token) {
        headers.Authorization = `Bearer ${remoteConfig.token}`;
    }

    const paths = ['/entitlements/me', '/entitlements', '/billing/entitlements'];
    for (const path of paths) {
        try {
            const response = await fetch(`${remoteConfig.baseUrl}${path}`, {
                method: 'GET',
                headers,
                credentials: 'include',
                cache: 'no-store'
            });
            if (!response.ok) continue;
            const text = await response.text();
            if (!text) continue;
            const snapshot = normalizeEntitlementsPayload(JSON.parse(text));
            if (snapshot) return snapshot;
        } catch {
            // Try next endpoint.
        }
    }
    return null;
};

type RemoteEntitlementDecision = {
    allowed: boolean;
    code?: EntitlementErrorCode;
    message?: string;
    limit?: number;
    used?: number;
};

const normalizeDecisionCode = (value: unknown): EntitlementErrorCode | undefined => {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toLowerCase();
    if (
        normalized === 'spaces_max_reached'
        || normalized === 'share_disabled'
        || normalized === 'share_max_reached'
        || normalized === 'import_disabled'
        || normalized === 'portal_builder_disabled'
    ) {
        return normalized;
    }
    if (normalized.includes('space')) return 'spaces_max_reached';
    if (normalized.includes('share') && normalized.includes('disabled')) return 'share_disabled';
    if (normalized.includes('share')) return 'share_max_reached';
    if (normalized.includes('import')) return 'import_disabled';
    if (normalized.includes('portal')) return 'portal_builder_disabled';
    return undefined;
};

const parseRemoteDecision = (payload: unknown): RemoteEntitlementDecision | null => {
    if (!payload || typeof payload !== 'object') return null;
    const raw = payload as Record<string, unknown>;
    const unwrapped = (
        (raw.payload && typeof raw.payload === 'object' ? raw.payload : undefined)
        || (raw.data && typeof raw.data === 'object' ? raw.data : undefined)
        || (raw.state && typeof raw.state === 'object' ? raw.state : undefined)
        || raw
    ) as Record<string, unknown>;
    const decisionRaw = (
        unwrapped.decision && typeof unwrapped.decision === 'object'
            ? unwrapped.decision as Record<string, unknown>
            : unwrapped
    );
    const allowedValue = pickFirstDefined(decisionRaw, ['allowed', 'allow', 'ok']);
    if (typeof allowedValue !== 'boolean') return null;
    const code = normalizeDecisionCode(pickFirstDefined(decisionRaw, ['code', 'error.code', 'errorCode']));
    const messageRaw = pickFirstDefined(decisionRaw, ['message', 'reason', 'error.message']);
    const message = typeof messageRaw === 'string' ? messageRaw.trim() : undefined;
    const limitRaw = pickFirstDefined(decisionRaw, ['limit', 'limits.max']);
    const usedRaw = pickFirstDefined(decisionRaw, ['used', 'usage.current']);
    const limit = typeof limitRaw === 'number' && Number.isFinite(limitRaw) ? limitRaw : undefined;
    const used = typeof usedRaw === 'number' && Number.isFinite(usedRaw) ? usedRaw : undefined;
    return {
        allowed: allowedValue,
        ...(code ? { code } : {}),
        ...(message ? { message } : {}),
        ...(limit !== undefined ? { limit } : {}),
        ...(used !== undefined ? { used } : {})
    };
};

const requestRemoteDecision = async (
    action: RemoteEntitlementAction,
    context: Record<string, unknown>
): Promise<RemoteEntitlementDecision | null> => {
    if (!remoteConfig.enabled || typeof window === 'undefined') return null;
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json'
    };
    if (remoteConfig.token) {
        headers.Authorization = `Bearer ${remoteConfig.token}`;
    }
    const paths = ['/entitlements/check', '/entitlements/authorize', '/billing/entitlements/check'];
    for (const path of paths) {
        try {
            const response = await fetch(`${remoteConfig.baseUrl}${path}`, {
                method: 'POST',
                headers,
                credentials: 'include',
                cache: 'no-store',
                body: JSON.stringify({ action, context })
            });
            if (response.status === 404) continue;
            const text = await response.text();
            if (!text) {
                if (!response.ok && remoteConfig.failClosed) {
                    return {
                        allowed: false,
                        message: `Remote entitlement preflight failed (${response.status})`
                    };
                }
                continue;
            }
            const decision = parseRemoteDecision(JSON.parse(text));
            if (decision) return decision;
            if (!response.ok && remoteConfig.failClosed) {
                return {
                    allowed: false,
                    message: `Remote entitlement preflight failed (${response.status})`
                };
            }
        } catch {
            if (remoteConfig.failClosed) {
                return {
                    allowed: false,
                    message: 'Remote entitlement preflight unavailable'
                };
            }
        }
    }
    if (remoteConfig.failClosed) {
        return {
            allowed: false,
            message: 'Remote entitlement preflight unavailable'
        };
    }
    return null;
};

const enforceRemoteDecision = (
    decision: RemoteEntitlementDecision | null,
    fallbackCode: EntitlementErrorCode,
    fallbackMessage: string
) => {
    if (!decision || decision.allowed) return;
    throw new EntitlementLimitError(
        decision.code ?? fallbackCode,
        decision.message || fallbackMessage,
        {
            ...(decision.limit !== undefined ? { limit: decision.limit } : {}),
            ...(decision.used !== undefined ? { used: decision.used } : {})
        }
    );
};

let snapshot: EntitlementsSnapshot = readPersistedSnapshot();
let lastRemoteRefreshAt = 0;
const REMOTE_REFRESH_TTL_MS = 20_000;
type EntitlementsSnapshotOverride =
    Partial<Omit<EntitlementsSnapshot, 'features' | 'limits'>>
    & {
        features?: Partial<EntitlementsSnapshot['features']>;
        limits?: Partial<EntitlementsSnapshot['limits']>;
    };

export const entitlementsService = {
    getSnapshot: (): EntitlementsSnapshot => snapshot,
    refreshRemote: async (): Promise<EntitlementsSnapshot> => {
        const remoteSnapshot = await requestRemoteEntitlements();
        if (remoteSnapshot) {
            snapshot = remoteSnapshot;
            persistSnapshot(snapshot);
        }
        lastRemoteRefreshAt = Date.now();
        return snapshot;
    },
    ensureFreshRemote: async (maxAgeMs = REMOTE_REFRESH_TTL_MS): Promise<EntitlementsSnapshot> => {
        if (!remoteConfig.enabled) return snapshot;
        if (lastRemoteRefreshAt > 0 && Date.now() - lastRemoteRefreshAt <= maxAgeMs) {
            return snapshot;
        }
        return entitlementsService.refreshRemote();
    },
    assertCanCreateSpace: (usedCount: number) => {
        const max = snapshot.limits.spacesMax;
        if (max > 0 && usedCount >= max) {
            throw new EntitlementLimitError(
                'spaces_max_reached',
                `Space limit reached (${usedCount}/${max}).`,
                { limit: max, used: usedCount }
            );
        }
    },
    assertCanCreateShareLink: (usedCount: number) => {
        if (!snapshot.features.shareEnabled) {
            throw new EntitlementLimitError(
                'share_disabled',
                'Sharing is disabled for the current entitlement.'
            );
        }
        const max = snapshot.limits.shareReadonlyLinksMax;
        if (max > 0 && usedCount >= max) {
            throw new EntitlementLimitError(
                'share_max_reached',
                `Share link limit reached (${usedCount}/${max}).`,
                { limit: max, used: usedCount }
            );
        }
    },
    assertCanImport: () => {
        if (!snapshot.features.importEnabled) {
            throw new EntitlementLimitError(
                'import_disabled',
                'Import is disabled for the current entitlement.'
            );
        }
    },
    assertCanUsePortalBuilder: () => {
        if (!snapshot.features.portalBuilderEnabled) {
            throw new EntitlementLimitError(
                'portal_builder_disabled',
                'Portal builder is disabled for the current entitlement.'
            );
        }
    },
    ensureCanCreateSpace: async (usedCount: number) => {
        await entitlementsService.ensureFreshRemote();
        entitlementsService.assertCanCreateSpace(usedCount);
        const decision = await requestRemoteDecision('create_space', {
            used: usedCount,
            limit: snapshot.limits.spacesMax,
            plan: snapshot.plan
        });
        enforceRemoteDecision(
            decision,
            'spaces_max_reached',
            `Space limit reached (${usedCount}/${snapshot.limits.spacesMax}).`
        );
    },
    ensureCanCreateShareLink: async (usedCount: number) => {
        await entitlementsService.ensureFreshRemote();
        entitlementsService.assertCanCreateShareLink(usedCount);
        const decision = await requestRemoteDecision('create_share_link', {
            used: usedCount,
            limit: snapshot.limits.shareReadonlyLinksMax,
            plan: snapshot.plan
        });
        enforceRemoteDecision(
            decision,
            'share_max_reached',
            `Share link limit reached (${usedCount}/${snapshot.limits.shareReadonlyLinksMax}).`
        );
    },
    ensureCanImport: async () => {
        await entitlementsService.ensureFreshRemote();
        entitlementsService.assertCanImport();
        const decision = await requestRemoteDecision('import', {
            enabled: snapshot.features.importEnabled,
            plan: snapshot.plan
        });
        enforceRemoteDecision(
            decision,
            'import_disabled',
            'Import is disabled for the current entitlement.'
        );
    },
    ensureCanUsePortalBuilder: async () => {
        await entitlementsService.ensureFreshRemote();
        entitlementsService.assertCanUsePortalBuilder();
        const decision = await requestRemoteDecision('use_portal_builder', {
            enabled: snapshot.features.portalBuilderEnabled,
            plan: snapshot.plan
        });
        enforceRemoteDecision(
            decision,
            'portal_builder_disabled',
            'Portal builder is disabled for the current entitlement.'
        );
    },
    __setSnapshotForTests: (next: EntitlementsSnapshotOverride) => {
        snapshot = {
            ...snapshot,
            ...next,
            features: {
                ...snapshot.features,
                ...(next.features ?? {})
            },
            limits: {
                ...snapshot.limits,
                ...(next.limits ?? {})
            }
        };
    },
    __resetForTests: () => {
        snapshot = DEFAULT_ENTITLEMENTS;
        lastRemoteRefreshAt = 0;
        remoteConfig = defaultRemoteConfig;
        persistSnapshot(snapshot);
    },
    __setRemoteConfigForTests: (next: Partial<typeof remoteConfig>) => {
        remoteConfig = {
            ...remoteConfig,
            ...next
        };
    }
};
