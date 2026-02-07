import { clearRemoteUiState, isUiStateRemoteEnabled, readRemoteUiState, writeRemoteUiState } from '../data/uiStateRemote';

export type SettingsSnapshot = {
    contextMenuMode?: 'bar' | 'radial';
    gridSnapEnabled?: boolean;
    gridStepMul?: number;
    showGrid?: boolean;
    showEdges?: boolean;
    showHud?: boolean;
    showCounters?: boolean;
    focusDimEnabled?: boolean;
    showStationLabels?: boolean;
    showPlaygroundOnStation?: boolean;
    glassOpacity?: number;
    glassNoise?: number;
};

export interface SettingsStorage {
    load(): SettingsSnapshot;
    save(patch: SettingsSnapshot): void;
    clear(): void;
}

const SETTINGS_STORAGE_KEY = 'settings.global.v0.5';
export const REMOTE_SETTINGS_HYDRATED_EVENT = 'sf:remote-settings-hydrated';

const normalizeSettingsSnapshot = (input: unknown): SettingsSnapshot => {
    if (!input || typeof input !== 'object') return {};
    const raw = input as Record<string, unknown>;
    const next: SettingsSnapshot = {};

    if (raw.contextMenuMode === 'bar' || raw.contextMenuMode === 'radial') {
        next.contextMenuMode = raw.contextMenuMode;
    }
    if (typeof raw.gridSnapEnabled === 'boolean') next.gridSnapEnabled = raw.gridSnapEnabled;
    if (typeof raw.gridStepMul === 'number' && Number.isFinite(raw.gridStepMul)) next.gridStepMul = raw.gridStepMul;
    if (typeof raw.showGrid === 'boolean') next.showGrid = raw.showGrid;
    if (typeof raw.showEdges === 'boolean') next.showEdges = raw.showEdges;
    if (typeof raw.showHud === 'boolean') next.showHud = raw.showHud;
    if (typeof raw.showCounters === 'boolean') next.showCounters = raw.showCounters;
    if (typeof raw.focusDimEnabled === 'boolean') next.focusDimEnabled = raw.focusDimEnabled;
    if (typeof raw.showStationLabels === 'boolean') next.showStationLabels = raw.showStationLabels;
    if (typeof raw.showPlaygroundOnStation === 'boolean') next.showPlaygroundOnStation = raw.showPlaygroundOnStation;
    if (typeof raw.glassOpacity === 'number' && Number.isFinite(raw.glassOpacity)) next.glassOpacity = raw.glassOpacity;
    if (typeof raw.glassNoise === 'number' && Number.isFinite(raw.glassNoise)) next.glassNoise = raw.glassNoise;

    return next;
};

class LocalSettingsStorage implements SettingsStorage {
    load(): SettingsSnapshot {
        if (typeof window === 'undefined') return {};
        try {
            const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
            return raw ? normalizeSettingsSnapshot(JSON.parse(raw)) : {};
        } catch {
            return {};
        }
    }

    save(patch: SettingsSnapshot): void {
        if (typeof window === 'undefined') return;
        try {
            const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
            const current = raw ? normalizeSettingsSnapshot(JSON.parse(raw)) : {};
            const next = {
                ...current,
                ...normalizeSettingsSnapshot(patch)
            };
            window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
        } catch {
            // Ignore storage write errors.
        }
    }

    clear(): void {
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
        } catch {
            // Ignore storage clear errors.
        }
    }
}

class RemoteSettingsStorage implements SettingsStorage {
    private local: LocalSettingsStorage;
    private hydrated: boolean;
    private hydrating: boolean;

    constructor() {
        this.local = new LocalSettingsStorage();
        this.hydrated = false;
        this.hydrating = false;
    }

    load(): SettingsSnapshot {
        this.hydrateFromRemote();
        return this.local.load();
    }

    save(patch: SettingsSnapshot): void {
        this.local.save(patch);
        void this.pushSnapshot();
    }

    clear(): void {
        this.local.clear();
        void clearRemoteUiState('settings');
    }

    private hydrateFromRemote(): void {
        if (this.hydrated || this.hydrating) return;
        this.hydrating = true;
        void (async () => {
            const payload = await readRemoteUiState('settings');
            const remote = normalizeSettingsSnapshot(payload);
            if (Object.keys(remote).length > 0) {
                this.local.save(remote);
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent(REMOTE_SETTINGS_HYDRATED_EVENT, { detail: remote }));
                }
            }
            this.hydrated = true;
            this.hydrating = false;
        })();
    }

    private async pushSnapshot(): Promise<void> {
        await writeRemoteUiState('settings', this.local.load());
    }
}

const USE_REMOTE_SETTINGS_STORAGE = isUiStateRemoteEnabled();

export const settingsStorage: SettingsStorage = USE_REMOTE_SETTINGS_STORAGE
    ? new RemoteSettingsStorage()
    : new LocalSettingsStorage();
