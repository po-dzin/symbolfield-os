type SfContentConfig = {
    enabled: boolean;
    baseUrl: string;
    token: string;
};

export type SfDocRecord = {
    docId: string;
    spaceId: string;
    nodeId: string | null;
    title: string;
    snapshotJson: unknown;
    schemaVersion: number;
    updatedAt: number;
};

export type SfDocVersionRecord = {
    versionId: string;
    docId: string;
    snapshotJson: unknown;
    createdAt: number;
    comment?: string;
};

export type SfLinkRecord = {
    linkId: string;
    fromDocId: string;
    fromBlockId: string | null;
    toNodeId: string;
    linkType: 'portal' | 'ref';
    createdAt: number;
    updatedAt: number;
};

const readSfContentConfig = (): SfContentConfig => {
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

const config = readSfContentConfig();

export const isSfContentRemoteEnabled = (): boolean => config.enabled;

const buildHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json'
    };
    if (config.token) headers.Authorization = `Bearer ${config.token}`;
    return headers;
};

const request = async <T>(
    method: 'GET' | 'PUT' | 'POST' | 'DELETE',
    path: string,
    body?: unknown
): Promise<T | null> => {
    if (!config.enabled || typeof window === 'undefined') return null;
    try {
        const init: {
            method: 'GET' | 'PUT' | 'POST' | 'DELETE';
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
        if (body !== undefined) init.body = JSON.stringify(body);
        const response = await fetch(`${config.baseUrl}${path}`, init);
        if (!response.ok) return null;
        const raw = await response.text();
        if (!raw) return null;
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
};

export const listSfDocs = async (): Promise<SfDocRecord[]> => {
    const payload = await request<SfDocRecord[]>('GET', '/sf/docs');
    return Array.isArray(payload) ? payload : [];
};

export const upsertSfDoc = async (record: SfDocRecord): Promise<boolean> => {
    const payload = await request<unknown>('PUT', `/sf/docs/${record.docId}`, record);
    return payload !== null;
};

export const listSfDocVersions = async (docId: string): Promise<SfDocVersionRecord[]> => {
    const payload = await request<SfDocVersionRecord[]>('GET', `/sf/doc-versions/${docId}`);
    return Array.isArray(payload) ? payload : [];
};

export const createSfDocVersion = async (record: SfDocVersionRecord): Promise<boolean> => {
    const payload = await request<unknown>('POST', '/sf/doc-versions', record);
    return payload !== null;
};

export const listSfLinks = async (): Promise<SfLinkRecord[]> => {
    const payload = await request<SfLinkRecord[]>('GET', '/sf/links');
    return Array.isArray(payload) ? payload : [];
};

export const upsertSfLink = async (record: SfLinkRecord): Promise<boolean> => {
    const payload = await request<unknown>('PUT', `/sf/links/${record.linkId}`, record);
    return payload !== null;
};

export const removeSfLink = async (linkId: string): Promise<boolean> => {
    const payload = await request<unknown>('DELETE', `/sf/links/${linkId}`);
    return payload !== null;
};
