import type { SpaceData } from '../state/SpaceManager';
import type { Brand, ExternalGraphLinkVisibility, Listing, ListingType } from '../types/gateway';
import { isUiStateRemoteEnabled, readRemoteUiStateKey, writeRemoteUiStateKey } from '../data/uiStateRemote';

const STORAGE_KEY = 'sf_published_spaces.v0.5';
const REMOTE_KEY = 'published-spaces';
const REMOTE_WRITE_DEBOUNCE_MS = 180;

export interface PublishedSpaceRecord {
    id: string;
    spaceId: string;
    brandSlug: string;
    portalSlug: string;
    title: string;
    description: string;
    visibility: ExternalGraphLinkVisibility;
    type: ListingType;
    tags: string[];
    spaceSnapshot: SpaceData;
    createdAt: number;
    updatedAt: number;
}

const slugify = (value: string): string => (
    value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
);

const toVisibility = (value: unknown): ExternalGraphLinkVisibility => (
    value === 'shared' || value === 'public' ? value : 'private'
);

const normalizeRecord = (value: unknown): PublishedSpaceRecord | null => {
    if (!value || typeof value !== 'object') return null;
    const raw = value as Record<string, unknown>;
    const spaceId = typeof raw.spaceId === 'string' ? raw.spaceId.trim() : '';
    const brandSlug = typeof raw.brandSlug === 'string' ? slugify(raw.brandSlug) : '';
    const portalSlug = typeof raw.portalSlug === 'string' ? slugify(raw.portalSlug) : '';
    if (!spaceId || !brandSlug || !portalSlug) return null;
    const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : 'Published Space';
    const description = typeof raw.description === 'string' ? raw.description.trim() : '';
    const visibility = toVisibility(raw.visibility);
    const type = raw.type === 'brand_base' || raw.type === 'course' || raw.type === 'template' || raw.type === 'map'
        ? raw.type
        : 'map';
    const tags = Array.isArray(raw.tags)
        ? raw.tags.map(tag => (typeof tag === 'string' ? tag.trim() : '')).filter(Boolean)
        : [];
    const snapshot = raw.spaceSnapshot;
    if (!snapshot || typeof snapshot !== 'object') return null;
    const createdAt = typeof raw.createdAt === 'number' && Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now();
    const updatedAt = typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt) ? raw.updatedAt : createdAt;
    const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `published:${brandSlug}:${portalSlug}`;
    return {
        id,
        spaceId,
        brandSlug,
        portalSlug,
        title,
        description,
        visibility,
        type,
        tags,
        spaceSnapshot: snapshot as SpaceData,
        createdAt,
        updatedAt
    };
};

const sortRecords = (records: PublishedSpaceRecord[]): PublishedSpaceRecord[] => (
    [...records].sort((a, b) => b.updatedAt - a.updatedAt)
);

const normalizeRecords = (value: unknown): PublishedSpaceRecord[] => (
    Array.isArray(value)
        ? sortRecords(
            value
                .map(entry => normalizeRecord(entry))
                .filter((entry): entry is PublishedSpaceRecord => !!entry)
        )
        : []
);

const mergeRecords = (
    localRecords: PublishedSpaceRecord[],
    remoteRecords: PublishedSpaceRecord[]
): PublishedSpaceRecord[] => {
    const next = new Map<string, PublishedSpaceRecord>();
    const upsert = (record: PublishedSpaceRecord) => {
        const key = `${record.brandSlug}/${record.portalSlug}`;
        const current = next.get(key);
        if (!current || record.updatedAt >= current.updatedAt) {
            next.set(key, record);
        }
    };
    localRecords.forEach(upsert);
    remoteRecords.forEach(upsert);
    return sortRecords(Array.from(next.values()));
};

const loadLocalRecords = (): PublishedSpaceRecord[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return normalizeRecords(JSON.parse(raw));
    } catch {
        return [];
    }
};

let remoteWriteTimer: number | null = null;

const scheduleRemoteWrite = (records: PublishedSpaceRecord[]) => {
    if (!isUiStateRemoteEnabled()) return;
    if (remoteWriteTimer !== null) window.clearTimeout(remoteWriteTimer);
    remoteWriteTimer = window.setTimeout(() => {
        remoteWriteTimer = null;
        void writeRemoteUiStateKey(REMOTE_KEY, records);
    }, REMOTE_WRITE_DEBOUNCE_MS);
};

const saveLocalRecords = (records: PublishedSpaceRecord[], options: { syncRemote?: boolean } = {}) => {
    if (typeof window === 'undefined') return;
    try {
        const normalized = sortRecords(records);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        if (options.syncRemote !== false) {
            scheduleRemoteWrite(normalized);
        }
    } catch {
        // Ignore local storage write failures in MVP.
    }
};

let hydrated = false;
let hydrating = false;
let hydrationPromise: Promise<void> | null = null;

const hydrateFromRemote = (): Promise<void> => {
    if (!isUiStateRemoteEnabled()) return Promise.resolve();
    if (hydrated) return Promise.resolve();
    if (hydrating && hydrationPromise) return hydrationPromise;
    hydrating = true;
    hydrationPromise = (async () => {
        try {
            const payload = await readRemoteUiStateKey(REMOTE_KEY);
            const remoteRecords = normalizeRecords(payload);
            const localRecords = loadLocalRecords();
            const merged = mergeRecords(localRecords, remoteRecords);
            const changed = merged.length !== localRecords.length
                || merged.some((record, index) => localRecords[index]?.id !== record.id);
            if (changed) {
                saveLocalRecords(merged, { syncRemote: false });
                if (merged.length > remoteRecords.length) {
                    scheduleRemoteWrite(merged);
                }
            }
            hydrated = true;
        } finally {
            hydrating = false;
            hydrationPromise = null;
        }
    })();
    return hydrationPromise;
};

const toListing = (record: PublishedSpaceRecord): Listing => ({
    id: record.id,
    brandId: `brand:${record.brandSlug}`,
    slug: record.portalSlug,
    type: record.type,
    title: record.title,
    description: record.description,
    tags: [...record.tags],
    visibility: record.visibility,
    stats: {
        views: 0,
        forks: 0,
        updatedAt: record.updatedAt
    },
    spaceSnapshot: record.spaceSnapshot
});

const toBrand = (brandSlug: string): Brand => {
    const label = brandSlug
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
    return {
        id: `brand:${brandSlug}`,
        slug: brandSlug,
        name: label || 'Brand',
        bio: 'Published brand portal'
    };
};

export const publishedSpacesStorage = {
    hydrate: async () => {
        await hydrateFromRemote();
    },
    loadPublishedSpaces: () => {
        void hydrateFromRemote();
        return loadLocalRecords();
    },
    loadPublishedSpacesAsync: async () => {
        await hydrateFromRemote();
        return loadLocalRecords();
    },
    upsertPublishedSpace: (input: {
        spaceId: string;
        brandSlug: string;
        portalSlug: string;
        title: string;
        description?: string;
        visibility: ExternalGraphLinkVisibility;
        type?: ListingType;
        tags?: string[];
        spaceSnapshot: SpaceData;
    }): PublishedSpaceRecord | null => {
        const spaceId = input.spaceId.trim();
        const brandSlug = slugify(input.brandSlug);
        const portalSlug = slugify(input.portalSlug);
        if (!spaceId || !brandSlug || !portalSlug) return null;
        const now = Date.now();
        const current = loadLocalRecords();
        const existing = current.find(record => record.brandSlug === brandSlug && record.portalSlug === portalSlug);
        const nextRecord: PublishedSpaceRecord = {
            id: existing?.id ?? `published:${brandSlug}:${portalSlug}`,
            spaceId,
            brandSlug,
            portalSlug,
            title: input.title.trim() || 'Published Space',
            description: input.description?.trim() ?? '',
            visibility: input.visibility,
            type: input.type ?? 'map',
            tags: Array.isArray(input.tags)
                ? input.tags.map(tag => tag.trim()).filter(Boolean)
                : [],
            spaceSnapshot: input.spaceSnapshot,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now
        };

        const next = sortRecords([
            nextRecord,
            ...current.filter(record => record.id !== nextRecord.id)
        ]);
        saveLocalRecords(next);
        return nextRecord;
    },
    updateVisibilityBySpaceId: (
        spaceId: string,
        visibility: ExternalGraphLinkVisibility
    ): { updatedCount: number; records: PublishedSpaceRecord[] } => {
        const normalizedSpaceId = spaceId.trim();
        if (!normalizedSpaceId) {
            return { updatedCount: 0, records: [] };
        }
        const normalizedVisibility = toVisibility(visibility);
        const current = loadLocalRecords();
        if (current.length === 0) {
            return { updatedCount: 0, records: [] };
        }

        const now = Date.now();
        let updatedCount = 0;
        const next = current.map((record) => {
            if (record.spaceId !== normalizedSpaceId || record.visibility === normalizedVisibility) {
                return record;
            }
            updatedCount += 1;
            return {
                ...record,
                visibility: normalizedVisibility,
                updatedAt: now
            };
        });

        if (updatedCount > 0) {
            saveLocalRecords(next);
        }

        return {
            updatedCount,
            records: sortRecords(next).filter(record => record.spaceId === normalizedSpaceId)
        };
    },
    getPublishedListingsByBrandSlug: async (
        brandSlug: string,
        options: { includePrivate?: boolean } = {}
    ): Promise<Listing[]> => {
        const normalized = slugify(brandSlug);
        if (!normalized) return [];
        const includePrivate = options.includePrivate === true;
        const records = await publishedSpacesStorage.loadPublishedSpacesAsync();
        return records
            .filter(record => record.brandSlug === normalized)
            .filter(record => includePrivate || record.visibility !== 'private')
            .map(toListing);
    },
    getPublishedListingBySlug: async (
        brandSlug: string,
        portalSlug: string,
        options: { includePrivate?: boolean } = {}
    ): Promise<Listing | null> => {
        const normalizedBrand = slugify(brandSlug);
        const normalizedPortal = slugify(portalSlug);
        if (!normalizedBrand || !normalizedPortal) return null;
        const includePrivate = options.includePrivate === true;
        const records = await publishedSpacesStorage.loadPublishedSpacesAsync();
        const record = records.find(item => (
            item.brandSlug === normalizedBrand && item.portalSlug === normalizedPortal
        ));
        if (!record) return null;
        if (!includePrivate && record.visibility === 'private') return null;
        return toListing(record);
    },
    getPublishedBrands: async (): Promise<Brand[]> => {
        const records = await publishedSpacesStorage.loadPublishedSpacesAsync();
        const seen = new Set<string>();
        const brands: Brand[] = [];
        records.forEach(record => {
            if (record.visibility === 'private') return;
            if (seen.has(record.brandSlug)) return;
            seen.add(record.brandSlug);
            brands.push(toBrand(record.brandSlug));
        });
        return brands;
    },
    __resetForTests: () => {
        if (typeof window !== 'undefined') {
            window.localStorage.removeItem(STORAGE_KEY);
        }
        hydrated = false;
        hydrating = false;
        hydrationPromise = null;
        if (remoteWriteTimer !== null) {
            window.clearTimeout(remoteWriteTimer);
            remoteWriteTimer = null;
        }
    }
};
