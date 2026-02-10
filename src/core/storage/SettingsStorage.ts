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
    themePreset?: 'auto' | 'monolith' | 'pulse' | 'halo';
    themeAccent?: 'gold' | 'rose' | 'sage' | 'lavender' | 'cyan' | 'peach' | 'taupe';
    themeDensity?: 'compact' | 'normal' | 'cozy';
    themeMotion?: 'normal' | 'reduce';
    themeSpeed?: 0.5 | 1 | 2;
    themeTexture?: 'clean' | 'grain' | 'glass';
    themeIntensity?: number;
    themeModeSource?: 'auto' | 'manual';
    themeModeOverride?: 'deep' | 'flow' | 'luma';
    pathDisplayMode?: 'full' | 'compact';
};

export interface SettingsStorage {
    load(): SettingsSnapshot;
    save(patch: SettingsSnapshot): void;
    clear(): void;
}

const SETTINGS_STORAGE_KEY = 'settings.global.v0.5';

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
    if (raw.themePreset === 'auto' || raw.themePreset === 'monolith' || raw.themePreset === 'pulse' || raw.themePreset === 'halo') {
        next.themePreset = raw.themePreset;
    }
    if (
        raw.themeAccent === 'gold'
        || raw.themeAccent === 'rose'
        || raw.themeAccent === 'sage'
        || raw.themeAccent === 'lavender'
        || raw.themeAccent === 'cyan'
        || raw.themeAccent === 'peach'
        || raw.themeAccent === 'taupe'
    ) {
        next.themeAccent = raw.themeAccent;
    }
    if (raw.themeDensity === 'compact' || raw.themeDensity === 'normal' || raw.themeDensity === 'cozy') {
        next.themeDensity = raw.themeDensity;
    }
    if (raw.themeMotion === 'normal' || raw.themeMotion === 'reduce') {
        next.themeMotion = raw.themeMotion;
    }
    if (raw.themeSpeed === 0.5 || raw.themeSpeed === 1 || raw.themeSpeed === 2) {
        next.themeSpeed = raw.themeSpeed;
    }
    if (raw.themeTexture === 'clean' || raw.themeTexture === 'grain' || raw.themeTexture === 'glass') {
        next.themeTexture = raw.themeTexture;
    }
    if (typeof raw.themeIntensity === 'number' && Number.isFinite(raw.themeIntensity)) {
        next.themeIntensity = raw.themeIntensity;
    }
    if (raw.themeModeSource === 'auto' || raw.themeModeSource === 'manual') {
        next.themeModeSource = raw.themeModeSource;
    }
    if (raw.themeModeOverride === 'deep' || raw.themeModeOverride === 'flow' || raw.themeModeOverride === 'luma') {
        next.themeModeOverride = raw.themeModeOverride;
    }
    if (raw.pathDisplayMode === 'full' || raw.pathDisplayMode === 'compact') {
        next.pathDisplayMode = raw.pathDisplayMode;
    }

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
