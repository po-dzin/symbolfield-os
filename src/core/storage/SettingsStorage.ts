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
};

export interface SettingsStorage {
    load(): SettingsSnapshot;
    save(patch: SettingsSnapshot): void;
    clear(): void;
}

const SETTINGS_STORAGE_KEY = 'settings.global.v0.5';

class LocalSettingsStorage implements SettingsStorage {
    load(): SettingsSnapshot {
        if (typeof window === 'undefined') return {};
        try {
            const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
            return raw ? (JSON.parse(raw) as SettingsSnapshot) : {};
        } catch {
            return {};
        }
    }

    save(patch: SettingsSnapshot): void {
        if (typeof window === 'undefined') return;
        try {
            const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
            const current = raw ? (JSON.parse(raw) as SettingsSnapshot) : {};
            const next = {
                ...current,
                ...patch
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
    load(): SettingsSnapshot {
        // TODO: Replace with unified storage (profile) load.
        return {};
    }

    save(_patch: SettingsSnapshot): void {
        // TODO: Replace with unified storage (profile) save.
    }

    clear(): void {
        // TODO: Replace with unified storage (profile) clear/reset.
    }
}

const USE_REMOTE_SETTINGS_STORAGE = false;

export const settingsStorage: SettingsStorage = USE_REMOTE_SETTINGS_STORAGE
    ? new RemoteSettingsStorage()
    : new LocalSettingsStorage();
