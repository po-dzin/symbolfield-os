export type UiScope = 'settings' | 'station-layout' | 'glyph-builder';

type UiStateRemoteConfig = {
    enabled: boolean;
    baseUrl: string;
    token: string;
    scopeId: string;
};

const DEFAULT_SCOPE_ID = 'default';

const readUiStateRemoteConfig = (): UiStateRemoteConfig => {
    const mode = (import.meta.env.VITE_UI_STATE_BACKEND ?? 'local').toLowerCase();
    const baseUrl = (import.meta.env.VITE_UI_STATE_API_BASE_URL ?? '').trim();
    const token = (import.meta.env.VITE_UI_STATE_API_TOKEN ?? '').trim();
    const scopeId = (import.meta.env.VITE_UI_STATE_SCOPE ?? DEFAULT_SCOPE_ID).trim() || DEFAULT_SCOPE_ID;

    if (mode !== 'remote' || !baseUrl) {
        return {
            enabled: false,
            baseUrl: '',
            token: '',
            scopeId: DEFAULT_SCOPE_ID
        };
    }

    try {
        const parsed = new URL(baseUrl);
        return {
            enabled: true,
            baseUrl: parsed.toString().replace(/\/$/, ''),
            token,
            scopeId
        };
    } catch {
        return {
            enabled: false,
            baseUrl: '',
            token: '',
            scopeId: DEFAULT_SCOPE_ID
        };
    }
};

const config = readUiStateRemoteConfig();

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

const buildPath = (scope: UiScope) => {
    const scopeParam = encodeURIComponent(config.scopeId);
    return `/ui-state/${scope}?scope=${scopeParam}`;
};

const request = async <T>(
    method: 'GET' | 'PUT' | 'DELETE',
    scope: UiScope,
    body?: unknown
): Promise<T | undefined> => {
    if (!config.enabled || typeof window === 'undefined') return undefined;

    try {
        const init: {
            method: 'GET' | 'PUT' | 'DELETE';
            headers: Record<string, string>;
            credentials: 'include';
            cache: 'no-store';
            body?: string;
        } = {
            method,
            headers: buildHeaders(),
            credentials: 'include',
            cache: 'no-store'
        };

        if (body !== undefined) {
            init.body = JSON.stringify(body);
        }

        const response = await fetch(`${config.baseUrl}${buildPath(scope)}`, init);
        if (!response.ok) return undefined;

        const raw = await response.text();
        if (!raw) return undefined;

        return JSON.parse(raw) as T;
    } catch {
        return undefined;
    }
};

export const isUiStateRemoteEnabled = () => config.enabled;

export const readRemoteUiState = async (scope: UiScope): Promise<unknown | undefined> => {
    return request<unknown>('GET', scope);
};

export const writeRemoteUiState = async (scope: UiScope, payload: unknown): Promise<void> => {
    await request<unknown>('PUT', scope, payload);
};

export const clearRemoteUiState = async (scope: UiScope): Promise<void> => {
    await request<unknown>('DELETE', scope);
};
