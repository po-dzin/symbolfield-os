import type { Brand, Listing } from '../types/gateway';

type GatewayRemoteConfig = {
    enabled: boolean;
    baseUrl: string;
    token: string;
};

const normalizeBaseUrl = (value: string): string => {
    try {
        return new URL(value).toString().replace(/\/$/, '');
    } catch {
        return '';
    }
};

const readGatewayRemoteConfig = (): GatewayRemoteConfig => {
    const mode = (import.meta.env.VITE_GATEWAY_BACKEND ?? import.meta.env.VITE_UI_STATE_BACKEND ?? 'local').toLowerCase();
    const baseUrlRaw = (import.meta.env.VITE_GATEWAY_API_BASE_URL ?? import.meta.env.VITE_UI_STATE_API_BASE_URL ?? '').trim();
    const token = (import.meta.env.VITE_GATEWAY_API_TOKEN ?? import.meta.env.VITE_UI_STATE_API_TOKEN ?? '').trim();
    const baseUrl = normalizeBaseUrl(baseUrlRaw);

    if (mode !== 'remote' || !baseUrl) {
        return { enabled: false, baseUrl: '', token: '' };
    }

    return { enabled: true, baseUrl, token };
};

const config = readGatewayRemoteConfig();

const buildHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json'
    };
    if (config.token) {
        headers.Authorization = `Bearer ${config.token}`;
    }
    return headers;
};

const unwrapPayload = (input: unknown): unknown => {
    if (!input || typeof input !== 'object') return input;
    const raw = input as Record<string, unknown>;
    if ('payload' in raw) return raw.payload;
    if ('data' in raw) return raw.data;
    if ('state' in raw) return raw.state;
    return input;
};

const toRecord = (value: unknown): Record<string, unknown> | null => (
    value && typeof value === 'object' ? (value as Record<string, unknown>) : null
);

const toStringSafe = (value: unknown): string => (
    typeof value === 'string' ? value.trim() : ''
);

const toNumberSafe = (value: unknown): number | null => (
    typeof value === 'number' && Number.isFinite(value) ? value : null
);

const toArrayOfStrings = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value
            .map(entry => (typeof entry === 'string' ? entry.trim() : ''))
            .filter(Boolean);
    }
    if (typeof value === 'string') {
        return value
            .split(',')
            .map(part => part.trim())
            .filter(Boolean);
    }
    return [];
};

const normalizePortalConfig = (value: unknown): Brand['portal'] | undefined => {
    const raw = toRecord(value);
    if (!raw) return undefined;
    const skinCandidate = toStringSafe(raw.skin).toLowerCase();
    const skin = skinCandidate === 'deep' || skinCandidate === 'flow' || skinCandidate === 'luma'
        ? skinCandidate
        : undefined;
    const subdomain = toStringSafe(raw.subdomain);
    const customDomainRaw = raw.customDomain ?? raw.custom_domain;
    const customDomain = customDomainRaw === null ? null : toStringSafe(customDomainRaw) || undefined;
    const builderRaw = toRecord(raw.builder);
    const layoutPreset = toStringSafe(builderRaw?.layoutPreset ?? builderRaw?.layout_preset) === 'core-shell'
        ? 'core-shell' as const
        : null;
    const moduleSlots = Array.isArray(builderRaw?.moduleSlots)
        ? builderRaw.moduleSlots.filter(
            (slot): slot is 'signals' | 'chronos' | 'offers' | 'community' => (
                slot === 'signals' || slot === 'chronos' || slot === 'offers' || slot === 'community'
            )
        )
        : [];
    const panelSlots = Array.isArray(builderRaw?.panelSlots)
        ? builderRaw.panelSlots.filter(
            (slot): slot is 'insights' | 'activity' | 'links' => (
                slot === 'insights' || slot === 'activity' || slot === 'links'
            )
        )
        : [];
    const builder = layoutPreset || moduleSlots.length > 0 || panelSlots.length > 0
        ? {
            ...(layoutPreset ? { layoutPreset } : {}),
            ...(moduleSlots.length > 0 ? { moduleSlots } : {}),
            ...(panelSlots.length > 0 ? { panelSlots } : {})
        }
        : undefined;

    if (!subdomain && customDomain === undefined && !skin && !builder) return undefined;
    return {
        ...(subdomain ? { subdomain } : {}),
        ...(customDomain !== undefined ? { customDomain } : {}),
        ...(skin ? { skin } : {}),
        ...(builder ? { builder } : {})
    };
};

const normalizeBrand = (value: unknown): Brand | null => {
    const raw = toRecord(value);
    if (!raw) return null;
    const slug = toStringSafe(raw.slug);
    if (!slug) return null;
    const id = toStringSafe(raw.id ?? raw.brand_id ?? slug);
    const name = toStringSafe(raw.name ?? raw.title ?? slug);
    const bio = toStringSafe(raw.bio ?? raw.description);
    const linksRaw = Array.isArray(raw.links) ? raw.links : [];
    const links = linksRaw
        .map((entry) => {
            const link = toRecord(entry);
            if (!link) return null;
            const label = toStringSafe(link.label ?? link.title);
            const url = toStringSafe(link.url ?? link.href);
            if (!label || !url) return null;
            return { label, url };
        })
        .filter((entry): entry is { label: string; url: string } => !!entry);
    const portal = normalizePortalConfig(raw.portal ?? raw.portal_config);

    return {
        id: id || slug,
        slug,
        name: name || slug,
        bio,
        ...(toStringSafe(raw.coverImage ?? raw.cover_image) ? { coverImage: toStringSafe(raw.coverImage ?? raw.cover_image) } : {}),
        ...(toStringSafe(raw.avatar ?? raw.avatar_url) ? { avatar: toStringSafe(raw.avatar ?? raw.avatar_url) } : {}),
        ...(links.length > 0 ? { links } : {}),
        ...(portal ? { portal } : {})
    };
};

const normalizeListingType = (value: unknown): Listing['type'] => {
    const candidate = toStringSafe(value).toLowerCase();
    if (candidate === 'brand_base' || candidate === 'course' || candidate === 'template' || candidate === 'map') {
        return candidate;
    }
    return 'template';
};

const normalizeListing = (value: unknown): Listing | null => {
    const raw = toRecord(value);
    if (!raw) return null;
    const slug = toStringSafe(raw.slug);
    if (!slug) return null;
    const id = toStringSafe(raw.id ?? raw.listing_id ?? slug);
    const brandId = toStringSafe(raw.brandId ?? raw.brand_id ?? toRecord(raw.brand)?.id);
    const title = toStringSafe(raw.title ?? raw.name ?? slug);
    const description = toStringSafe(raw.description ?? raw.bio);
    const tags = toArrayOfStrings(raw.tags);
    const statsRaw = toRecord(raw.stats);
    const views = toNumberSafe(statsRaw?.views ?? raw.views);
    const forks = toNumberSafe(statsRaw?.forks ?? raw.forks);
    const updatedAt = toNumberSafe(statsRaw?.updatedAt ?? statsRaw?.updated_at ?? raw.updatedAt ?? raw.updated_at);
    const hasStats = views !== null || forks !== null || updatedAt !== null;
    const snapshotValue = raw.spaceSnapshot ?? raw.space_snapshot ?? raw.snapshot;
    const snapshot = toRecord(snapshotValue)
        ? (snapshotValue as Listing['spaceSnapshot'])
        : null;

    return {
        id: id || slug,
        brandId,
        slug,
        type: normalizeListingType(raw.type),
        title: title || slug,
        description,
        tags,
        ...(hasStats
            ? {
                stats: {
                    views: views ?? 0,
                    forks: forks ?? 0,
                    updatedAt: updatedAt ?? Date.now()
                }
            }
            : {}),
        ...(snapshot ? { spaceSnapshot: snapshot } : {})
    };
};

const normalizeBrandCollection = (payload: unknown): Brand[] => {
    const unwrapped = unwrapPayload(payload);
    if (Array.isArray(unwrapped)) {
        return unwrapped
            .map(normalizeBrand)
            .filter((entry): entry is Brand => !!entry);
    }
    const raw = toRecord(unwrapped);
    if (!raw) return [];
    const nested = raw.items ?? raw.brands;
    if (!Array.isArray(nested)) return [];
    return nested
        .map(normalizeBrand)
        .filter((entry): entry is Brand => !!entry);
};

const normalizeListingCollection = (payload: unknown): Listing[] => {
    const unwrapped = unwrapPayload(payload);
    if (Array.isArray(unwrapped)) {
        return unwrapped
            .map(normalizeListing)
            .filter((entry): entry is Listing => !!entry);
    }
    const raw = toRecord(unwrapped);
    if (!raw) return [];
    const nested = raw.items ?? raw.listings ?? raw.portals;
    if (!Array.isArray(nested)) return [];
    return nested
        .map(normalizeListing)
        .filter((entry): entry is Listing => !!entry);
};

const normalizeSingleBrand = (payload: unknown): Brand | null => {
    const unwrapped = unwrapPayload(payload);
    const direct = normalizeBrand(unwrapped);
    if (direct) return direct;
    const raw = toRecord(unwrapped);
    if (!raw) return null;
    return normalizeBrand(raw.brand);
};

const normalizeSingleListing = (payload: unknown): Listing | null => {
    const unwrapped = unwrapPayload(payload);
    const direct = normalizeListing(unwrapped);
    if (direct) return direct;
    const raw = toRecord(unwrapped);
    if (!raw) return null;
    return normalizeListing(raw.listing ?? raw.portal);
};

const request = async <T>(path: string): Promise<T | null> => {
    if (!config.enabled || typeof window === 'undefined') return null;
    try {
        const response = await fetch(`${config.baseUrl}${path}`, {
            method: 'GET',
            headers: buildHeaders(),
            credentials: 'include',
            cache: 'no-store'
        });
        if (!response.ok) return null;
        const text = await response.text();
        if (!text) return null;
        return JSON.parse(text) as T;
    } catch {
        return null;
    }
};

const requestFromPaths = async <T>(paths: string[]): Promise<T | null> => {
    for (const path of paths) {
        const payload = await request<T>(path);
        if (payload !== null) return payload;
    }
    return null;
};

export const isGatewayRemoteEnabled = (): boolean => config.enabled;

export const fetchRemoteBrands = async (): Promise<Brand[] | null> => {
    const payload = await requestFromPaths<unknown>([
        '/gateway/brands',
        '/brands'
    ]);
    if (payload === null) return null;
    return normalizeBrandCollection(payload);
};

export const fetchRemoteBrandBySlug = async (slug: string): Promise<Brand | null> => {
    const normalizedSlug = slug.trim();
    if (!normalizedSlug) return null;
    const payload = await requestFromPaths<unknown>([
        `/gateway/brands/${encodeURIComponent(normalizedSlug)}`,
        `/brands/${encodeURIComponent(normalizedSlug)}`
    ]);
    if (payload === null) return null;
    return normalizeSingleBrand(payload);
};

export const fetchRemoteBrandListings = async (brandSlug: string): Promise<Listing[] | null> => {
    const normalizedSlug = brandSlug.trim();
    if (!normalizedSlug) return null;
    const payload = await requestFromPaths<unknown>([
        `/gateway/brands/${encodeURIComponent(normalizedSlug)}/listings`,
        `/brands/${encodeURIComponent(normalizedSlug)}/listings`,
        `/gateway/portals?brand=${encodeURIComponent(normalizedSlug)}`,
        `/portals?brand=${encodeURIComponent(normalizedSlug)}`
    ]);
    if (payload === null) return null;
    return normalizeListingCollection(payload);
};

export const fetchRemoteListingBySlug = async (
    brandSlug: string,
    listingSlug: string
): Promise<Listing | null> => {
    const normalizedBrandSlug = brandSlug.trim();
    const normalizedListingSlug = listingSlug.trim();
    if (!normalizedBrandSlug || !normalizedListingSlug) return null;
    const payload = await requestFromPaths<unknown>([
        `/gateway/portals/${encodeURIComponent(normalizedBrandSlug)}/${encodeURIComponent(normalizedListingSlug)}`,
        `/portals/${encodeURIComponent(normalizedBrandSlug)}/${encodeURIComponent(normalizedListingSlug)}`,
        `/gateway/brands/${encodeURIComponent(normalizedBrandSlug)}/listings/${encodeURIComponent(normalizedListingSlug)}`
    ]);
    if (payload === null) return null;
    return normalizeSingleListing(payload);
};

export const fetchRemoteFeaturedListings = async (): Promise<Listing[] | null> => {
    const payload = await requestFromPaths<unknown>([
        '/gateway/listings/featured',
        '/listings/featured',
        '/portals/featured'
    ]);
    if (payload === null) return null;
    return normalizeListingCollection(payload);
};

export const __gatewayRemote = {
    normalizeBrand,
    normalizeListing,
    normalizeBrandCollection,
    normalizeListingCollection
};
