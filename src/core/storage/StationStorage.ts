import { clearRemoteUiState, isUiStateRemoteEnabled, readRemoteUiState, writeRemoteUiState } from '../data/uiStateRemote';

const STATION_LAYOUT_KEY = 'station_layout.v0.5';

export type StationLayout = Record<string, { x: number; y: number }>;

const normalizeStationLayout = (input: unknown): StationLayout => {
    if (!input || typeof input !== 'object') return {};
    const raw = input as Record<string, unknown>;
    const next: StationLayout = {};

    Object.entries(raw).forEach(([id, value]) => {
        if (!value || typeof value !== 'object') return;
        const coords = value as Record<string, unknown>;
        const x = coords.x;
        const y = coords.y;
        if (typeof x !== 'number' || !Number.isFinite(x)) return;
        if (typeof y !== 'number' || !Number.isFinite(y)) return;
        next[id] = { x, y };
    });

    return next;
};

const loadLocalStationLayout = (): StationLayout => {
    if (typeof window === 'undefined') return {};
    try {
        const raw = window.localStorage.getItem(STATION_LAYOUT_KEY);
        if (!raw) return {};
        return normalizeStationLayout(JSON.parse(raw));
    } catch {
        return {};
    }
};

const saveLocalStationLayout = (layout: StationLayout) => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STATION_LAYOUT_KEY, JSON.stringify(layout));
    } catch {
        // ignore
    }
};

const clearLocalStationLayout = () => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(STATION_LAYOUT_KEY);
    } catch {
        // ignore
    }
};

let stationLayoutHydrated = false;
let stationLayoutHydrating = false;

const hydrateStationLayoutFromRemote = () => {
    if (!isUiStateRemoteEnabled()) return;
    if (stationLayoutHydrated || stationLayoutHydrating) return;
    stationLayoutHydrating = true;
    void (async () => {
        const payload = await readRemoteUiState('station-layout');
        const remote = normalizeStationLayout(payload);
        if (Object.keys(remote).length > 0) {
            saveLocalStationLayout(remote);
        }
        stationLayoutHydrated = true;
        stationLayoutHydrating = false;
    })();
};

const loadStationLayout = (): StationLayout => {
    hydrateStationLayoutFromRemote();
    return loadLocalStationLayout();
};

const saveStationLayout = (layout: StationLayout) => {
    const normalized = normalizeStationLayout(layout);
    saveLocalStationLayout(normalized);
    if (isUiStateRemoteEnabled()) {
        void writeRemoteUiState('station-layout', normalized);
    }
};

const clearStationLayout = () => {
    clearLocalStationLayout();
    if (isUiStateRemoteEnabled()) {
        void clearRemoteUiState('station-layout');
    }
};

export const stationStorage = {
    loadStationLayout,
    saveStationLayout,
    clearStationLayout
};
