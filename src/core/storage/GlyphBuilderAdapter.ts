import { registerGeneratedGlyph, unregisterGeneratedGlyph, type GeneratedGlyphDefinition } from '../../utils/sfGlyphLayer';
import { clearRemoteUiState, isUiStateRemoteEnabled, readRemoteUiState, writeRemoteUiState } from '../data/uiStateRemote';

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

    const normalized: GeneratedGlyphDefinition = {
        id,
        label
    };
    if (categories && categories.length > 0) {
        normalized.categories = categories;
    }
    if (svg) {
        normalized.svg = svg;
    }
    if (symbol) {
        normalized.symbol = symbol;
    }
    return normalized;
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

const mergeSnapshots = (localSnapshot: GlyphBuilderSnapshot, remoteSnapshot: GlyphBuilderSnapshot): GlyphBuilderSnapshot => {
    const mergedGlyphs: Record<string, GlyphBuilderStoredGlyph> = {};
    const allIds = new Set<string>([
        ...Object.keys(localSnapshot.glyphs),
        ...Object.keys(remoteSnapshot.glyphs)
    ]);

    allIds.forEach((id) => {
        const localGlyph = localSnapshot.glyphs[id];
        const remoteGlyph = remoteSnapshot.glyphs[id];
        if (localGlyph && remoteGlyph) {
            mergedGlyphs[id] = localGlyph.updatedAt >= remoteGlyph.updatedAt ? localGlyph : remoteGlyph;
            return;
        }
        if (localGlyph) {
            mergedGlyphs[id] = localGlyph;
            return;
        }
        if (remoteGlyph) {
            mergedGlyphs[id] = remoteGlyph;
        }
    });

    return {
        version: GLYPH_BUILDER_STORAGE_VERSION,
        glyphs: mergedGlyphs
    };
};

const serializeSnapshot = (snapshot: GlyphBuilderSnapshot): string => {
    const sortedGlyphIds = Object.keys(snapshot.glyphs).sort();
    const sortedGlyphs: Record<string, GlyphBuilderStoredGlyph> = {};
    sortedGlyphIds.forEach((id) => {
        const glyph = snapshot.glyphs[id];
        if (!glyph) return;
        sortedGlyphs[id] = glyph;
    });
    return JSON.stringify({
        version: snapshot.version,
        glyphs: sortedGlyphs
    });
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
    private remoteHydrated: boolean;
    private remoteHydrating: boolean;
    private remoteFlushTimer: number | null;
    private pendingRemoteSnapshot: GlyphBuilderSnapshot | null;

    constructor(driver: GlyphBuilderStorageDriver) {
        this.driver = driver;
        this.initialized = false;
        this.remoteHydrated = false;
        this.remoteHydrating = false;
        this.remoteFlushTimer = null;
        this.pendingRemoteSnapshot = null;
    }

    init() {
        if (this.initialized) return;
        const snapshot = this.loadSnapshot();
        this.applySnapshotToRegistry(snapshot);
        this.initialized = true;
        void this.hydrateFromRemote();
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
        const generatedGlyph: GeneratedGlyphDefinition = {
            id: stored.id,
            label: stored.label
        };
        if (stored.categories && stored.categories.length > 0) {
            generatedGlyph.categories = stored.categories;
        }
        if (stored.svg) {
            generatedGlyph.svg = stored.svg;
        }
        if (stored.symbol) {
            generatedGlyph.symbol = stored.symbol;
        }
        registerGeneratedGlyph(generatedGlyph);

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
        if (isUiStateRemoteEnabled()) {
            void clearRemoteUiState('glyph-builder');
        }
    }

    private loadSnapshot(): GlyphBuilderSnapshot {
        const stored = this.driver.read();
        return stored ? normalizeSnapshot(stored) : { version: GLYPH_BUILDER_STORAGE_VERSION, glyphs: {} };
    }

    private persistSnapshot(snapshot: GlyphBuilderSnapshot): void {
        const normalized = normalizeSnapshot(snapshot);
        this.driver.write(normalized);
        this.scheduleRemoteFlush(normalized);
    }

    private applySnapshotToRegistry(snapshot: GlyphBuilderSnapshot): void {
        Object.values(snapshot.glyphs).forEach((glyph) => {
            const generatedGlyph: GeneratedGlyphDefinition = {
                id: glyph.id,
                label: glyph.label
            };
            if (glyph.categories && glyph.categories.length > 0) {
                generatedGlyph.categories = glyph.categories;
            }
            if (glyph.svg) {
                generatedGlyph.svg = glyph.svg;
            }
            if (glyph.symbol) {
                generatedGlyph.symbol = glyph.symbol;
            }
            registerGeneratedGlyph(generatedGlyph);
        });
    }

    private syncRegistryWithSnapshotDiff(before: GlyphBuilderSnapshot, after: GlyphBuilderSnapshot): void {
        Object.keys(before.glyphs).forEach((id) => {
            if (!after.glyphs[id]) {
                unregisterGeneratedGlyph(id);
            }
        });
        this.applySnapshotToRegistry(after);
    }

    private async hydrateFromRemote(): Promise<void> {
        if (!isUiStateRemoteEnabled() || typeof window === 'undefined') return;
        if (this.remoteHydrated || this.remoteHydrating) return;

        this.remoteHydrating = true;
        try {
            const localSnapshot = this.loadSnapshot();
            const payload = await readRemoteUiState('glyph-builder');
            const remoteSnapshot = normalizeSnapshot(payload);
            const mergedSnapshot = mergeSnapshots(localSnapshot, remoteSnapshot);
            if (serializeSnapshot(localSnapshot) !== serializeSnapshot(mergedSnapshot)) {
                this.driver.write(mergedSnapshot);
                this.syncRegistryWithSnapshotDiff(localSnapshot, mergedSnapshot);
            }
        } finally {
            this.remoteHydrated = true;
            this.remoteHydrating = false;
        }
    }

    private scheduleRemoteFlush(snapshot: GlyphBuilderSnapshot): void {
        if (!isUiStateRemoteEnabled() || typeof window === 'undefined') return;
        this.pendingRemoteSnapshot = snapshot;
        if (this.remoteFlushTimer !== null) {
            window.clearTimeout(this.remoteFlushTimer);
        }
        this.remoteFlushTimer = window.setTimeout(() => {
            this.remoteFlushTimer = null;
            void this.flushRemoteSnapshot();
        }, 220);
    }

    private async flushRemoteSnapshot(): Promise<void> {
        if (!isUiStateRemoteEnabled()) return;
        const snapshot = this.pendingRemoteSnapshot;
        this.pendingRemoteSnapshot = null;
        if (!snapshot) return;

        if (Object.keys(snapshot.glyphs).length === 0) {
            await clearRemoteUiState('glyph-builder');
            return;
        }

        await writeRemoteUiState('glyph-builder', snapshot);
    }
}

export const glyphBuilderAdapter = new GlyphBuilderAdapter(new LocalGlyphBuilderStorageDriver());
