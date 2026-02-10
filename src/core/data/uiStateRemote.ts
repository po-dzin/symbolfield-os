export type UiScope = 'settings' | 'station-layout';

type UiStateConfig = {
    enabled: boolean;
    baseUrl: string;
    token: string;
    scope: string;
};

const readUiStateConfig = (): UiStateConfig => {
    const mode = (import.meta.env.VITE_UI_STATE_BACKEND ?? 'local').toLowerCase();
    const baseUrl = (import.meta.env.VITE_UI_STATE_API_BASE_URL ?? '').trim();
    const token = (import.meta.env.VITE_UI_STATE_API_TOKEN ?? '').trim();
    const scope = (import.meta.env.VITE_UI_STATE_SCOPE ?? '').trim();

    if (mode !== 'remote' || !baseUrl) {
        return { enabled: false, baseUrl: '', token: '', scope: '' };
    }

    try {
        const parsed = new URL(baseUrl);
        return {
            enabled: true,
            baseUrl: parsed.toString().replace(/\/$/, ''),
            token,
            scope
        };
    } catch {
        return { enabled: false, baseUrl: '', token: '', scope: '' };
    }
};

const config = readUiStateConfig();

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

const withScopeQuery = (path: string): string => {
    if (!config.scope) return path;
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}scope=${encodeURIComponent(config.scope)}`;
};

const getScopePath = (scope: UiScope): string => withScopeQuery(`/ui-state/${scope}`);
const getKeyPath = (key: string): string => withScopeQuery(`/ui-state/${encodeURIComponent(key)}`);

const unwrapPayload = (input: unknown): unknown => {
    if (!input || typeof input !== 'object') return input;
    const raw = input as Record<string, unknown>;
    if ('payload' in raw) return raw.payload;
    if ('state' in raw) return raw.state;
    if ('data' in raw) return raw.data;
    return input;
};

const request = async <T>(
    method: 'GET' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown
): Promise<T | undefined> => {
    if (!config.enabled || typeof window === 'undefined') return undefined;
    try {
        const init: globalThis.RequestInit = {
            method,
            headers: buildHeaders(),
            credentials: 'include',
            cache: 'no-store'
        };
        if (body !== undefined) {
            init.body = JSON.stringify(body);
        }
        const response = await fetch(`${config.baseUrl}${path}`, init);
        if (!response.ok) return undefined;

        const text = await response.text();
        if (!text) return undefined;
        return JSON.parse(text) as T;
    } catch {
        return undefined;
    }
};

export const isUiStateRemoteEnabled = (): boolean => config.enabled;

export const readRemoteUiState = async (scope: UiScope): Promise<unknown | undefined> => {
    const payload = await request<unknown>('GET', getScopePath(scope));
    return unwrapPayload(payload);
};

export const writeRemoteUiState = async (scope: UiScope, payload: unknown): Promise<void> => {
    await request<unknown>('PUT', getScopePath(scope), { payload });
};

export const clearRemoteUiState = async (scope: UiScope): Promise<void> => {
    await request<unknown>('DELETE', getScopePath(scope));
};

export const readRemoteUiStateKey = async (key: string): Promise<unknown | undefined> => {
    if (!key.trim()) return undefined;
    const payload = await request<unknown>('GET', getKeyPath(key));
    return unwrapPayload(payload);
};

export const writeRemoteUiStateKey = async (key: string, payload: unknown): Promise<void> => {
    if (!key.trim()) return;
    await request<unknown>('PUT', getKeyPath(key), { payload });
};

export const clearRemoteUiStateKey = async (key: string): Promise<void> => {
    if (!key.trim()) return;
    await request<unknown>('DELETE', getKeyPath(key));
};
