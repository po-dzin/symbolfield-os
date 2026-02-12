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

export const isGatewayRemoteEnabled = (): boolean => config.enabled;

export const fetchRemoteBrands = async (): Promise<Brand[] | null> => {
    const payload = await request<unknown>('/gateway/brands');
    const unwrapped = unwrapPayload(payload);
    return Array.isArray(unwrapped) ? (unwrapped as Brand[]) : null;
};

export const fetchRemoteBrandBySlug = async (slug: string): Promise<Brand | null> => {
    const normalizedSlug = slug.trim();
    if (!normalizedSlug) return null;
    const payload = await request<unknown>(`/gateway/brands/${encodeURIComponent(normalizedSlug)}`);
    const unwrapped = unwrapPayload(payload);
    if (!unwrapped || typeof unwrapped !== 'object') return null;
    return unwrapped as Brand;
};

export const fetchRemoteBrandListings = async (brandSlug: string): Promise<Listing[] | null> => {
    const normalizedSlug = brandSlug.trim();
    if (!normalizedSlug) return null;
    const payload = await request<unknown>(`/gateway/brands/${encodeURIComponent(normalizedSlug)}/listings`);
    const unwrapped = unwrapPayload(payload);
    return Array.isArray(unwrapped) ? (unwrapped as Listing[]) : null;
};

export const fetchRemoteListingBySlug = async (
    brandSlug: string,
    listingSlug: string
): Promise<Listing | null> => {
    const normalizedBrandSlug = brandSlug.trim();
    const normalizedListingSlug = listingSlug.trim();
    if (!normalizedBrandSlug || !normalizedListingSlug) return null;
    const payload = await request<unknown>(`/gateway/portals/${encodeURIComponent(normalizedBrandSlug)}/${encodeURIComponent(normalizedListingSlug)}`);
    const unwrapped = unwrapPayload(payload);
    if (!unwrapped || typeof unwrapped !== 'object') return null;
    return unwrapped as Listing;
};

export const fetchRemoteFeaturedListings = async (): Promise<Listing[] | null> => {
    const payload = await request<unknown>('/gateway/listings/featured');
    const unwrapped = unwrapPayload(payload);
    return Array.isArray(unwrapped) ? (unwrapped as Listing[]) : null;
};
