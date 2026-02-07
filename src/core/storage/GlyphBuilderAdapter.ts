import { registerGeneratedGlyph, unregisterGeneratedGlyph, type GeneratedGlyphDefinition } from '../../utils/sfGlyphLayer';

const GLYPH_BUILDER_STORAGE_KEY = 'glyph.builder.v0.5';
const GLYPH_BUILDER_STORAGE_VERSION = 1;

export type GlyphBuilderStoredGlyph = GeneratedGlyphDefinition & {
    source: 'generated';
    createdAt: number;
    updatedAt: number;
};

type GlyphBuilderSnapshot = {
    version: number;
    glyphs: Record<string, GlyphBuilderStoredGlyph>;
};

interface GlyphBuilderStorageDriver {
    read(): GlyphBuilderSnapshot | undefined;
    write(snapshot: GlyphBuilderSnapshot): void;
    clear(): void;
}

const dedupeStrings = (values: string[]) => {
    const seen = new Set<string>();
    const next: string[] = [];
    values.forEach((value) => {
        const normalized = value.trim();
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);
        next.push(normalized);
    });
    return next;
};

const normalizeGeneratedGlyph = (input: unknown): GeneratedGlyphDefinition | undefined => {
    if (!input || typeof input !== 'object') return undefined;
    const raw = input as Record<string, unknown>;

    const id = typeof raw.id === 'string' ? raw.id.trim() : '';
    if (!id) return undefined;

    const svg = typeof raw.svg === 'string' ? raw.svg.trim() : '';
    const symbol = typeof raw.symbol === 'string' ? raw.symbol.trim() : '';
    if (!svg && !symbol) return undefined;

    const label = typeof raw.label === 'string' && raw.label.trim() ? raw.label.trim() : id;
    const categories = Array.isArray(raw.categories)
        ? dedupeStrings(raw.categories.filter((item): item is string => typeof item === 'string'))
        : undefined;

    return {
        id,
        label,
        categories: categories && categories.length > 0 ? categories : undefined,
        svg: svg || undefined,
        symbol: symbol || undefined
    };
};

const normalizeStoredGlyph = (input: unknown): GlyphBuilderStoredGlyph | undefined => {
    if (!input || typeof input !== 'object') return undefined;
    const raw = input as Record<string, unknown>;
    const glyph = normalizeGeneratedGlyph(raw);
    if (!glyph) return undefined;

    const createdAt = typeof raw.createdAt === 'number' && Number.isFinite(raw.createdAt)
        ? raw.createdAt
        : Date.now();
    const updatedAt = typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt)
        ? raw.updatedAt
        : createdAt;

    return {
        ...glyph,
        source: 'generated',
        createdAt,
        updatedAt
    };
};

const normalizeSnapshot = (input: unknown): GlyphBuilderSnapshot => {
    if (!input || typeof input !== 'object') {
        return { version: GLYPH_BUILDER_STORAGE_VERSION, glyphs: {} };
    }

    const raw = input as Record<string, unknown>;
    const rawGlyphs = raw.glyphs && typeof raw.glyphs === 'object' ? raw.glyphs as Record<string, unknown> : {};
    const glyphs: Record<string, GlyphBuilderStoredGlyph> = {};

    Object.entries(rawGlyphs).forEach(([id, value]) => {
        const normalized = normalizeStoredGlyph(value);
        if (!normalized || normalized.id !== id) return;
        glyphs[id] = normalized;
    });

    return {
        version: GLYPH_BUILDER_STORAGE_VERSION,
        glyphs
    };
};

class LocalGlyphBuilderStorageDriver implements GlyphBuilderStorageDriver {
    read(): GlyphBuilderSnapshot | undefined {
        if (typeof window === 'undefined') return undefined;
        try {
            const raw = window.localStorage.getItem(GLYPH_BUILDER_STORAGE_KEY);
            if (!raw) return undefined;
            return normalizeSnapshot(JSON.parse(raw));
        } catch {
            return undefined;
        }
    }

    write(snapshot: GlyphBuilderSnapshot): void {
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(GLYPH_BUILDER_STORAGE_KEY, JSON.stringify(snapshot));
        } catch {
            // Ignore persistence errors for now.
        }
    }

    clear(): void {
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.removeItem(GLYPH_BUILDER_STORAGE_KEY);
        } catch {
            // Ignore clear errors.
        }
    }
}

export class GlyphBuilderAdapter {
    private driver: GlyphBuilderStorageDriver;
    private initialized: boolean;

    constructor(driver: GlyphBuilderStorageDriver) {
        this.driver = driver;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        const snapshot = this.loadSnapshot();
        Object.values(snapshot.glyphs).forEach((glyph) => {
            registerGeneratedGlyph({
                id: glyph.id,
                label: glyph.label,
                categories: glyph.categories,
                svg: glyph.svg,
                symbol: glyph.symbol
            });
        });
        this.initialized = true;
    }

    list(): GlyphBuilderStoredGlyph[] {
        const snapshot = this.loadSnapshot();
        return Object.values(snapshot.glyphs).sort((a, b) => b.updatedAt - a.updatedAt);
    }

    get(id: string): GlyphBuilderStoredGlyph | undefined {
        const snapshot = this.loadSnapshot();
        return snapshot.glyphs[id];
    }

    upsert(glyph: GeneratedGlyphDefinition): GlyphBuilderStoredGlyph | undefined {
        const normalized = normalizeGeneratedGlyph(glyph);
        if (!normalized) return undefined;

        const snapshot = this.loadSnapshot();
        const existing = snapshot.glyphs[normalized.id];
        const now = Date.now();

        const stored: GlyphBuilderStoredGlyph = {
            ...normalized,
            source: 'generated',
            createdAt: existing?.createdAt ?? now,
            updatedAt: now
        };

        snapshot.glyphs[stored.id] = stored;
        this.persistSnapshot(snapshot);
        registerGeneratedGlyph({
            id: stored.id,
            label: stored.label,
            categories: stored.categories,
            svg: stored.svg,
            symbol: stored.symbol
        });

        return stored;
    }

    remove(id: string): boolean {
        const glyphId = id.trim();
        if (!glyphId) return false;

        const snapshot = this.loadSnapshot();
        if (!snapshot.glyphs[glyphId]) return false;

        delete snapshot.glyphs[glyphId];
        this.persistSnapshot(snapshot);
        unregisterGeneratedGlyph(glyphId);
        return true;
    }

    clear(): void {
        const snapshot = this.loadSnapshot();
        Object.keys(snapshot.glyphs).forEach((id) => unregisterGeneratedGlyph(id));
        this.driver.clear();
    }

    private loadSnapshot(): GlyphBuilderSnapshot {
        const stored = this.driver.read();
        return stored ? normalizeSnapshot(stored) : { version: GLYPH_BUILDER_STORAGE_VERSION, glyphs: {} };
    }

    private persistSnapshot(snapshot: GlyphBuilderSnapshot): void {
        this.driver.write(normalizeSnapshot(snapshot));
    }
}

export const glyphBuilderAdapter = new GlyphBuilderAdapter(new LocalGlyphBuilderStorageDriver());
