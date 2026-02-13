const RGBA_WHITE_RE = /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/i;

const isHexWhiteLike = (value: string): boolean => {
    const normalized = value.trim().toLowerCase();
    return normalized === '#fff'
        || normalized === '#ffffff'
        || normalized === '#ffffffff'
        || normalized === '#ffff';
};

const isLegacyWhiteLike = (value: string): boolean => {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    if (normalized === 'white') return true;
    if (isHexWhiteLike(normalized)) return true;

    const match = normalized.match(RGBA_WHITE_RE);
    if (!match) return false;
    const r = Number(match[1]);
    const g = Number(match[2]);
    const b = Number(match[3]);
    if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return false;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return max >= 230 && (max - min) <= 10;
};

export const adaptLegacyGraphColor = (
    rawColor: string | undefined | null,
    fallbackToken: string,
    adapt: boolean
): string => {
    if (!rawColor || !rawColor.trim()) return fallbackToken;
    const next = rawColor.trim();
    if (!adapt) return next;
    if (next.includes('var(--semantic-color-')) return next;
    if (isLegacyWhiteLike(next)) return fallbackToken;
    return next;
};
