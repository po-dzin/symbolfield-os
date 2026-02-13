type EntitlementsSource = 'local' | 'remote';
type EntitlementsPlan = 'free' | 'beta_tester' | 'pro' | 'studio';

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

const readRemoteConfig = (): { enabled: boolean; baseUrl: string; token: string } => {
    const mode = (import.meta.env.VITE_ENTITLEMENTS_BACKEND ?? import.meta.env.VITE_UI_STATE_BACKEND ?? 'local').toLowerCase();
    const baseUrl = normalizeBaseUrl(
        (import.meta.env.VITE_ENTITLEMENTS_API_BASE_URL ?? import.meta.env.VITE_UI_STATE_API_BASE_URL ?? '').trim()
    );
    const token = (import.meta.env.VITE_ENTITLEMENTS_API_TOKEN ?? import.meta.env.VITE_UI_STATE_API_TOKEN ?? '').trim();
    if (mode !== 'remote' || !baseUrl) {
        return { enabled: false, baseUrl: '', token: '' };
    }
    return { enabled: true, baseUrl, token };
};

const remoteConfig = readRemoteConfig();

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
    code: 'spaces_max_reached' | 'share_disabled' | 'share_max_reached';
    limit?: number;
    used?: number;

    constructor(
        code: 'spaces_max_reached' | 'share_disabled' | 'share_max_reached',
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

let snapshot: EntitlementsSnapshot = readPersistedSnapshot();
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
        if (!remoteSnapshot) return snapshot;
        snapshot = remoteSnapshot;
        persistSnapshot(snapshot);
        return snapshot;
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
        persistSnapshot(snapshot);
    }
};
