const STATION_LAYOUT_KEY = 'station_layout.v0.5';

export type StationLayout = Record<string, { x: number; y: number }>;

const loadStationLayout = (): StationLayout => {
    try {
        const raw = localStorage.getItem(STATION_LAYOUT_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as StationLayout;
        if (!parsed || typeof parsed !== 'object') return {};
        return parsed;
    } catch {
        return {};
    }
};

const saveStationLayout = (layout: StationLayout) => {
    try {
        localStorage.setItem(STATION_LAYOUT_KEY, JSON.stringify(layout));
    } catch {
        // ignore
    }
};

const clearStationLayout = () => {
    try {
        localStorage.removeItem(STATION_LAYOUT_KEY);
    } catch {
        // ignore
    }
};

export const stationStorage = {
    loadStationLayout,
    saveStationLayout,
    clearStationLayout
};
