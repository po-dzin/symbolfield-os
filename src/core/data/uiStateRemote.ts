export type UiScope = 'settings' | 'station-layout';

type UiStateConfig = {
    enabled: boolean;
    baseUrl: string;
    token: string;
};

const readUiStateConfig = (): UiStateConfig => {
    const mode = (import.meta.env.VITE_UI_STATE_BACKEND ?? 'local').toLowerCase();
    const baseUrl = (import.meta.env.VITE_UI_STATE_API_BASE_URL ?? '').trim();
    const token = (import.meta.env.VITE_UI_STATE_API_TOKEN ?? '').trim();

    if (mode !== 'remote' || !baseUrl) {
        return { enabled: false, baseUrl: '', token: '' };
    }

    try {
        const parsed = new URL(baseUrl);
        return {
            enabled: true,
            baseUrl: parsed.toString().replace(/\/$/, ''),
            token
        };
    } catch {
        return { enabled: false, baseUrl: '', token: '' };
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

const getScopePath = (scope: UiScope): string => `/ui-state/${scope}`;

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
        const init: RequestInit = {
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
