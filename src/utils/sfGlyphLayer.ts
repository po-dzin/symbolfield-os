import { CUSTOM_GLYPHS, GLYPH_CATEGORIES, getGlyphById } from './customGlyphs';
import { GLYPHS, GLYPH_LIBRARY } from './glyphLibrary';

export type GlyphSource = 'sf' | 'generated' | 'blocksuite' | 'unicode';
export type GlyphRenderKind = 'svg' | 'symbol';

export interface ResolvedGlyph {
    id: string;
    source: GlyphSource;
    kind: GlyphRenderKind;
    label: string;
    svg?: string;
    symbol?: string;
}

export interface GeneratedGlyphDefinition {
    id: string;
    label: string;
    categories?: string[];
    svg?: string;
    symbol?: string;
}

export interface GlyphPickerCategory {
    id: string;
    label: string;
    source: GlyphSource | 'mixed';
    glyphs: string[];
}

type ResolveNodeGlyphInput = {
    iconValue?: string | null;
    iconSource?: string | null;
    fallbackId?: string;
    fallbackSource?: GlyphSource;
};

const generatedGlyphs = new Map<string, GeneratedGlyphDefinition>();
const unicodeGlyphSymbols = new Set<string>(GLYPH_LIBRARY.flatMap(category => category.glyphs));
const unicodeMetaBySymbol = new Map<string, string>(
    Object.values(GLYPHS).map(meta => [meta.symbol, meta.name ?? meta.id])
);

const looksLikeLiteralGlyph = (value: string) => (
    /[^\w:-]/u.test(value) || [...value].length <= 2
);

const resolveSfGlyph = (glyphId: string): ResolvedGlyph | undefined => {
    const glyph = getGlyphById(glyphId);
    if (!glyph) return undefined;
    return {
        id: glyph.id,
        source: 'sf',
        kind: 'svg',
        label: glyph.label,
        svg: glyph.svg
    };
};

const resolveGeneratedGlyph = (glyphId: string): ResolvedGlyph | undefined => {
    const glyph = generatedGlyphs.get(glyphId);
    if (!glyph) return undefined;
    if (glyph.svg) {
        return {
            id: glyph.id,
            source: 'generated',
            kind: 'svg',
            label: glyph.label,
            svg: glyph.svg
        };
    }
    if (glyph.symbol) {
        return {
            id: glyph.id,
            source: 'generated',
            kind: 'symbol',
            label: glyph.label,
            symbol: glyph.symbol
        };
    }
    return undefined;
};

const resolveUnicodeGlyph = (glyphId: string): ResolvedGlyph | undefined => {
    if (!glyphId) return undefined;
    if (!unicodeGlyphSymbols.has(glyphId) && !looksLikeLiteralGlyph(glyphId)) return undefined;
    return {
        id: glyphId,
        source: 'unicode',
        kind: 'symbol',
        label: unicodeMetaBySymbol.get(glyphId) ?? glyphId,
        symbol: glyphId
    };
};

const resolveBlockSuiteGlyph = (glyphId: string): ResolvedGlyph | undefined => {
    if (!glyphId.startsWith('bs:')) return undefined;
    const label = glyphId.slice(3) || 'blocksuite';
    return {
        id: glyphId,
        source: 'blocksuite',
        kind: 'symbol',
        label: `BlockSuite: ${label}`,
        symbol: '◌'
    };
};

const normalizeSource = (source?: string | null): GlyphSource | undefined => {
    if (!source) return undefined;
    if (source === 'sf' || source === 'generated' || source === 'blocksuite' || source === 'unicode') {
        return source;
    }
    return undefined;
};

export const registerGeneratedGlyph = (glyph: GeneratedGlyphDefinition) => {
    generatedGlyphs.set(glyph.id, glyph);
};

export const unregisterGeneratedGlyph = (glyphId: string) => {
    generatedGlyphs.delete(glyphId);
};

export const listGeneratedGlyphs = () => Array.from(generatedGlyphs.values());

export const inferGlyphSource = (glyphId: string): GlyphSource => {
    if (resolveSfGlyph(glyphId)) return 'sf';
    if (resolveGeneratedGlyph(glyphId)) return 'generated';
    if (resolveBlockSuiteGlyph(glyphId)) return 'blocksuite';
    return 'unicode';
};

export const resolveGlyph = (glyphId?: string | null, preferredSource?: GlyphSource): ResolvedGlyph | undefined => {
    if (!glyphId) return undefined;

    if (preferredSource === 'sf') return resolveSfGlyph(glyphId);
    if (preferredSource === 'generated') return resolveGeneratedGlyph(glyphId);
    if (preferredSource === 'blocksuite') return resolveBlockSuiteGlyph(glyphId);
    if (preferredSource === 'unicode') return resolveUnicodeGlyph(glyphId);

    return (
        resolveSfGlyph(glyphId)
        ?? resolveGeneratedGlyph(glyphId)
        ?? resolveBlockSuiteGlyph(glyphId)
        ?? resolveUnicodeGlyph(glyphId)
    );
};

export const resolveNodeGlyph = ({ iconValue, iconSource, fallbackId, fallbackSource = 'sf' }: ResolveNodeGlyphInput): ResolvedGlyph | undefined => {
    const value = typeof iconValue === 'string' ? iconValue.trim() : '';
    const source = normalizeSource(iconSource);

    if (value) {
        return resolveGlyph(value, source) ?? resolveGlyph(value);
    }

    if (fallbackId) {
        return resolveGlyph(fallbackId, fallbackSource) ?? resolveGlyph(fallbackId);
    }

    return undefined;
};

export const getGlyphDisplayLabel = (glyphId: string) => (
    resolveGlyph(glyphId)?.label ?? glyphId
);

export const getGlyphPickerCategories = (): GlyphPickerCategory[] => {
    const sfCategories: GlyphPickerCategory[] = GLYPH_CATEGORIES.map(category => ({
        id: category.id,
        label: category.label,
        source: 'sf',
        glyphs: category.glyphs.filter(glyphId => Boolean(resolveSfGlyph(glyphId)))
    }));

    const unicodeCategories: GlyphPickerCategory[] = GLYPH_LIBRARY.map(category => ({
        id: category.id,
        label: category.label,
        source: 'unicode',
        glyphs: category.glyphs
    }));

    const generated = listGeneratedGlyphs();
    if (generated.length === 0) {
        return [...sfCategories, ...unicodeCategories];
    }

    const generatedCategory: GlyphPickerCategory = {
        id: 'generated',
        label: 'Generated',
        source: 'generated',
        glyphs: generated.map(item => item.id)
    };

    return [generatedCategory, ...sfCategories, ...unicodeCategories];
};

export const getGlyphRingPalette = (categories: GlyphPickerCategory[]) => {
    const getCategoryGlyphs = (id: string, fallback: string[] = []) => (
        categories.find(category => category.id === id)?.glyphs ?? fallback
    );

    return {
        ring1: getCategoryGlyphs('base', getCategoryGlyphs('core')).slice(0, 6),
        ring2: getCategoryGlyphs('math', getCategoryGlyphs('nodes')).slice(0, 6),
        ring3: getCategoryGlyphs('runes', getCategoryGlyphs('cosmic')).slice(0, 6)
    };
};

// Keep static glyphs discoverable for UIs that need quick access to SF-defined SVGs.
export const SF_STATIC_GLYPHS = CUSTOM_GLYPHS;
