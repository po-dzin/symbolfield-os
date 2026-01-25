/**
 * glyphLibrary.ts
 * Relational glyph library with evolutionary metadata and similarity clustering.
 */

export type GlyphWeight = 'thin' | 'regular' | 'bold';
export type GlyphStyle = 'solid' | 'outline' | 'dashed';

export interface GlyphMetadata {
    id: string;
    symbol: string;
    name?: string;

    // Visual Properties
    weight: GlyphWeight;
    style: GlyphStyle;
    complexity: number; // 1-5 scale

    // Relational
    family?: string;
    parent?: string;
    variants?: string[];

    // Categorization
    categories: string[];
    tags?: string[];
}

// Glyph Database
export const GLYPHS: Record<string, GlyphMetadata> = {
    // Circle Family
    'circle-1': { id: 'circle-1', symbol: '·', name: 'dot', weight: 'thin', style: 'solid', complexity: 1, family: 'circle', categories: ['cosmic', 'shapes'], tags: ['minimal'] },
    'circle-2': { id: 'circle-2', symbol: '◦', name: 'small-circle', weight: 'thin', style: 'outline', complexity: 2, family: 'circle', parent: 'circle-1', categories: ['cosmic', 'shapes'] },
    'circle-3': { id: 'circle-3', symbol: '○', name: 'circle', weight: 'regular', style: 'outline', complexity: 2, family: 'circle', parent: 'circle-2', categories: ['cosmic', 'shapes'] },
    'circle-4': { id: 'circle-4', symbol: '◎', name: 'double-circle', weight: 'regular', style: 'outline', complexity: 3, family: 'circle', parent: 'circle-3', categories: ['cosmic', 'shapes'] },
    'circle-5': { id: 'circle-5', symbol: '◉', name: 'bullseye', weight: 'bold', style: 'solid', complexity: 3, family: 'circle', parent: 'circle-4', categories: ['cosmic', 'shapes'] },
    'circle-6': { id: 'circle-6', symbol: '●', name: 'filled-circle', weight: 'bold', style: 'solid', complexity: 2, family: 'circle', parent: 'circle-3', categories: ['cosmic', 'shapes'] },

    // Star Family
    'star-1': { id: 'star-1', symbol: '✦', name: 'small-star', weight: 'thin', style: 'outline', complexity: 3, family: 'star', categories: ['cosmic'], tags: ['sparkle'] },
    'star-2': { id: 'star-2', symbol: '★', name: 'star', weight: 'bold', style: 'solid', complexity: 3, family: 'star', parent: 'star-1', categories: ['cosmic', 'shapes'] },
    'star-3': { id: 'star-3', symbol: '☆', name: 'star-outline', weight: 'regular', style: 'outline', complexity: 3, family: 'star', variants: ['star-2'], categories: ['cosmic', 'shapes'] },
    'star-4': { id: 'star-4', symbol: '✶', name: 'six-star', weight: 'regular', style: 'outline', complexity: 4, family: 'star', parent: 'star-2', categories: ['cosmic'] },
    'star-5': { id: 'star-5', symbol: '✸', name: 'heavy-star', weight: 'bold', style: 'solid', complexity: 4, family: 'star', parent: 'star-4', categories: ['cosmic'] },

    // Square Family
    'square-1': { id: 'square-1', symbol: '▫', name: 'small-square', weight: 'thin', style: 'outline', complexity: 1, family: 'square', categories: ['shapes'] },
    'square-2': { id: 'square-2', symbol: '□', name: 'square', weight: 'regular', style: 'outline', complexity: 2, family: 'square', parent: 'square-1', categories: ['shapes'] },
    'square-3': { id: 'square-3', symbol: '■', name: 'filled-square', weight: 'bold', style: 'solid', complexity: 2, family: 'square', parent: 'square-2', categories: ['shapes'] },

    // Triangle Family
    'triangle-1': { id: 'triangle-1', symbol: '▵', name: 'small-triangle', weight: 'thin', style: 'outline', complexity: 2, family: 'triangle', categories: ['shapes'] },
    'triangle-2': { id: 'triangle-2', symbol: '△', name: 'triangle', weight: 'regular', style: 'outline', complexity: 2, family: 'triangle', parent: 'triangle-1', categories: ['shapes'] },
    'triangle-3': { id: 'triangle-3', symbol: '▲', name: 'filled-triangle', weight: 'bold', style: 'solid', complexity: 2, family: 'triangle', parent: 'triangle-2', categories: ['shapes'] },
    'triangle-4': { id: 'triangle-4', symbol: '▼', name: 'down-triangle', weight: 'bold', style: 'solid', complexity: 2, family: 'triangle', variants: ['triangle-3'], categories: ['shapes'] },

    // Diamond Family
    'diamond-1': { id: 'diamond-1', symbol: '◇', name: 'diamond', weight: 'regular', style: 'outline', complexity: 2, family: 'diamond', categories: ['cosmic', 'shapes'] },
    'diamond-2': { id: 'diamond-2', symbol: '◆', name: 'filled-diamond', weight: 'bold', style: 'solid', complexity: 2, family: 'diamond', parent: 'diamond-1', categories: ['cosmic', 'shapes'] },
    'diamond-3': { id: 'diamond-3', symbol: '◈', name: 'star-diamond', weight: 'bold', style: 'solid', complexity: 3, family: 'diamond', parent: 'diamond-2', categories: ['cosmic'] },
    'diamond-4': { id: 'diamond-4', symbol: '❖', name: 'heavy-diamond', weight: 'bold', style: 'solid', complexity: 3, family: 'diamond', parent: 'diamond-3', categories: ['cosmic'] },

    // Math Symbols
    'math-infinity': { id: 'math-infinity', symbol: '∞', name: 'infinity', weight: 'regular', style: 'solid', complexity: 3, categories: ['math'], tags: ['continuous'] },
    'math-sum': { id: 'math-sum', symbol: '∑', name: 'sum', weight: 'bold', style: 'solid', complexity: 3, categories: ['math'], tags: ['operator'] },
    'math-delta': { id: 'math-delta', symbol: '∆', name: 'delta', weight: 'bold', style: 'solid', complexity: 2, categories: ['math'], tags: ['change'] },
    'math-integral': { id: 'math-integral', symbol: '∫', name: 'integral', weight: 'regular', style: 'solid', complexity: 3, categories: ['math'], tags: ['operator'] },
    'math-partial': { id: 'math-partial', symbol: '∂', name: 'partial', weight: 'regular', style: 'solid', complexity: 3, categories: ['math'], tags: ['derivative'] },
    'math-sqrt': { id: 'math-sqrt', symbol: '√', name: 'sqrt', weight: 'regular', style: 'solid', complexity: 2, categories: ['math'], tags: ['operator'] },
    'math-pi': { id: 'math-pi', symbol: 'π', name: 'pi', weight: 'regular', style: 'solid', complexity: 2, categories: ['math'], tags: ['constant'] },
    'math-empty': { id: 'math-empty', symbol: 'Ø', name: 'empty-set', weight: 'regular', style: 'solid', complexity: 2, categories: ['math'], tags: ['set'] },
    'math-approx': { id: 'math-approx', symbol: '≈', name: 'approx', weight: 'regular', style: 'solid', complexity: 2, categories: ['math'], tags: ['relation'] },
    'math-neq': { id: 'math-neq', symbol: '≠', name: 'not-equal', weight: 'regular', style: 'solid', complexity: 2, categories: ['math'], tags: ['relation'] },
    'math-equiv': { id: 'math-equiv', symbol: '≡', name: 'equivalent', weight: 'regular', style: 'solid', complexity: 2, categories: ['math'], tags: ['relation'] },
    'math-pm': { id: 'math-pm', symbol: '±', name: 'plus-minus', weight: 'regular', style: 'solid', complexity: 2, categories: ['math'], tags: ['operator'] },

    // Logic Symbols
    'logic-forall': { id: 'logic-forall', symbol: '∀', name: 'forall', weight: 'bold', style: 'solid', complexity: 2, categories: ['logic'], tags: ['quantifier'] },
    'logic-exists': { id: 'logic-exists', symbol: '∃', name: 'exists', weight: 'bold', style: 'solid', complexity: 2, categories: ['logic'], tags: ['quantifier'] },
    'logic-nexists': { id: 'logic-nexists', symbol: '∄', name: 'not-exists', weight: 'bold', style: 'solid', complexity: 3, categories: ['logic'], tags: ['quantifier'] },
    'logic-therefore': { id: 'logic-therefore', symbol: '∴', name: 'therefore', weight: 'regular', style: 'solid', complexity: 2, categories: ['logic'], tags: ['inference'] },
    'logic-because': { id: 'logic-because', symbol: '∵', name: 'because', weight: 'regular', style: 'solid', complexity: 2, categories: ['logic'], tags: ['inference'] },
    'logic-xor': { id: 'logic-xor', symbol: '⊕', name: 'xor', weight: 'regular', style: 'solid', complexity: 2, categories: ['logic'], tags: ['operator'] },
    'logic-tensor': { id: 'logic-tensor', symbol: '⊗', name: 'tensor', weight: 'regular', style: 'solid', complexity: 2, categories: ['logic'], tags: ['operator'] },
    'logic-not': { id: 'logic-not', symbol: '¬', name: 'not', weight: 'regular', style: 'solid', complexity: 1, categories: ['logic'], tags: ['operator'] },
    'logic-and': { id: 'logic-and', symbol: '∧', name: 'and', weight: 'regular', style: 'solid', complexity: 2, categories: ['logic'], tags: ['operator'] },
    'logic-or': { id: 'logic-or', symbol: '∨', name: 'or', weight: 'regular', style: 'solid', complexity: 2, categories: ['logic'], tags: ['operator'] },
    'logic-intersect': { id: 'logic-intersect', symbol: '∩', name: 'intersection', weight: 'regular', style: 'solid', complexity: 2, categories: ['logic'], tags: ['set'] },
    'logic-union': { id: 'logic-union', symbol: '∪', name: 'union', weight: 'regular', style: 'solid', complexity: 2, categories: ['logic'], tags: ['set'] },

    // Tech Symbols
    'tech-cmd': { id: 'tech-cmd', symbol: '⌘', name: 'command', weight: 'regular', style: 'solid', complexity: 3, categories: ['tech'], tags: ['keyboard'] },
    'tech-opt': { id: 'tech-opt', symbol: '⌥', name: 'option', weight: 'regular', style: 'solid', complexity: 2, categories: ['tech'], tags: ['keyboard'] },
    'tech-ctrl': { id: 'tech-ctrl', symbol: '⌃', name: 'control', weight: 'regular', style: 'solid', complexity: 2, categories: ['tech'], tags: ['keyboard'] },
    'tech-shift': { id: 'tech-shift', symbol: '⇧', name: 'shift', weight: 'regular', style: 'solid', complexity: 2, categories: ['tech'], tags: ['keyboard'] },
    'tech-esc': { id: 'tech-esc', symbol: '⎋', name: 'escape', weight: 'regular', style: 'solid', complexity: 2, categories: ['tech'], tags: ['keyboard'] },
    'tech-return': { id: 'tech-return', symbol: '⏎', name: 'return', weight: 'regular', style: 'solid', complexity: 2, categories: ['tech'], tags: ['keyboard'] },
    'tech-eject': { id: 'tech-eject', symbol: '⏏', name: 'eject', weight: 'regular', style: 'solid', complexity: 2, categories: ['tech'], tags: ['media'] },
    'tech-lightning': { id: 'tech-lightning', symbol: '⚡︎', name: 'lightning', weight: 'bold', style: 'solid', complexity: 3, categories: ['tech'], tags: ['power'] },
    'tech-warning': { id: 'tech-warning', symbol: '⚠︎', name: 'warning', weight: 'bold', style: 'solid', complexity: 2, categories: ['tech'], tags: ['alert'] },
    'tech-anchor': { id: 'tech-anchor', symbol: '⚓︎', name: 'anchor', weight: 'bold', style: 'solid', complexity: 3, categories: ['tech'], tags: ['link'] },
    'tech-gear': { id: 'tech-gear', symbol: '⚙︎', name: 'gear', weight: 'regular', style: 'solid', complexity: 4, categories: ['tech'], tags: ['settings'] },
    'tech-flag': { id: 'tech-flag', symbol: '⚑︎', name: 'flag', weight: 'regular', style: 'solid', complexity: 2, categories: ['tech'], tags: ['marker'] },

    // Schemes / Diagrams
    'scheme-node': { id: 'scheme-node', symbol: '⎔', name: 'node', weight: 'regular', style: 'solid', complexity: 3, categories: ['schemes'], tags: ['diagram'] },
    'scheme-diamond': { id: 'scheme-diamond', symbol: '⟐', name: 'diamond', weight: 'regular', style: 'outline', complexity: 2, categories: ['schemes'], tags: ['diagram'] },
    'scheme-box': { id: 'scheme-box', symbol: '⧉', name: 'box', weight: 'regular', style: 'outline', complexity: 3, categories: ['schemes'], tags: ['diagram'] },
    'scheme-grid': { id: 'scheme-grid', symbol: '⌗', name: 'grid', weight: 'regular', style: 'solid', complexity: 3, categories: ['schemes'], tags: ['diagram'] },
    'scheme-loop': { id: 'scheme-loop', symbol: '⟲', name: 'loop', weight: 'regular', style: 'solid', complexity: 3, categories: ['schemes'], tags: ['diagram'] },

    // Alchemy
    'alchemy-air': { id: 'alchemy-air', symbol: '🜁', name: 'air', weight: 'regular', style: 'solid', complexity: 3, categories: ['alchemy'], tags: ['element'] },
    'alchemy-fire': { id: 'alchemy-fire', symbol: '🜂', name: 'fire', weight: 'regular', style: 'solid', complexity: 3, categories: ['alchemy'], tags: ['element'] },
    'alchemy-earth': { id: 'alchemy-earth', symbol: '🜃', name: 'earth', weight: 'regular', style: 'solid', complexity: 3, categories: ['alchemy'], tags: ['element'] },
    'alchemy-water': { id: 'alchemy-water', symbol: '🜄', name: 'water', weight: 'regular', style: 'solid', complexity: 3, categories: ['alchemy'], tags: ['element'] },
    'alchemy-salt': { id: 'alchemy-salt', symbol: '🜔', name: 'salt', weight: 'regular', style: 'solid', complexity: 3, categories: ['alchemy'], tags: ['element'] },
    'alchemy-sulfur': { id: 'alchemy-sulfur', symbol: '🜍', name: 'sulfur', weight: 'regular', style: 'solid', complexity: 3, categories: ['alchemy'], tags: ['element'] },
    'alchemy-mercury': { id: 'alchemy-mercury', symbol: '☿', name: 'mercury', weight: 'regular', style: 'solid', complexity: 3, categories: ['alchemy'], tags: ['element'] },

    // Runes (Elder Futhark)
    'rune-f': { id: 'rune-f', symbol: 'ᚠ', name: 'fehu', weight: 'regular', style: 'solid', complexity: 2, categories: ['runes'], tags: ['wealth'] },
    'rune-u': { id: 'rune-u', symbol: 'ᚢ', name: 'uruz', weight: 'regular', style: 'solid', complexity: 2, categories: ['runes'], tags: ['strength'] },
    'rune-th': { id: 'rune-th', symbol: 'ᚦ', name: 'thurisaz', weight: 'regular', style: 'solid', complexity: 2, categories: ['runes'], tags: ['giant'] },
    'rune-a': { id: 'rune-a', symbol: 'ᚨ', name: 'ansuz', weight: 'regular', style: 'solid', complexity: 2, categories: ['runes'], tags: ['god'] },
    'rune-r': { id: 'rune-r', symbol: 'ᚱ', name: 'raidho', weight: 'regular', style: 'solid', complexity: 2, categories: ['runes'], tags: ['journey'] },
    'rune-k': { id: 'rune-k', symbol: 'ᚲ', name: 'kenaz', weight: 'regular', style: 'solid', complexity: 2, categories: ['runes'], tags: ['torch'] },
    'rune-g': { id: 'rune-g', symbol: 'ᚷ', name: 'gebo', weight: 'regular', style: 'solid', complexity: 2, categories: ['runes'], tags: ['gift'] },
    'rune-w': { id: 'rune-w', symbol: 'ᚹ', name: 'wunjo', weight: 'regular', style: 'solid', complexity: 2, categories: ['runes'], tags: ['joy'] },
    'rune-h': { id: 'rune-h', symbol: 'ᚺ', name: 'hagalaz', weight: 'regular', style: 'solid', complexity: 2, categories: ['runes'], tags: ['hail'] },
    'rune-n': { id: 'rune-n', symbol: 'ᚾ', name: 'naudiz', weight: 'regular', style: 'solid', complexity: 2, categories: ['runes'], tags: ['need'] },
    'rune-i': { id: 'rune-i', symbol: 'ᛁ', name: 'isa', weight: 'regular', style: 'solid', complexity: 1, categories: ['runes'], tags: ['ice'] },
    'rune-j': { id: 'rune-j', symbol: 'ᛃ', name: 'jera', weight: 'regular', style: 'solid', complexity: 2, categories: ['runes'], tags: ['year'] },

    // Typography
    'typo-para': { id: 'typo-para', symbol: '¶', name: 'paragraph', weight: 'regular', style: 'solid', complexity: 3, categories: ['typo'], tags: ['mark'] },
    'typo-section': { id: 'typo-section', symbol: '§', name: 'section', weight: 'regular', style: 'solid', complexity: 3, categories: ['typo'], tags: ['mark'] },
    'typo-dagger': { id: 'typo-dagger', symbol: '†', name: 'dagger', weight: 'regular', style: 'solid', complexity: 2, categories: ['typo'], tags: ['reference'] },
    'typo-ddagger': { id: 'typo-ddagger', symbol: '‡', name: 'double-dagger', weight: 'bold', style: 'solid', complexity: 3, categories: ['typo'], tags: ['reference'] },
    'typo-at': { id: 'typo-at', symbol: '@', name: 'at', weight: 'regular', style: 'solid', complexity: 3, categories: ['typo'], tags: ['address'] },
    'typo-amp': { id: 'typo-amp', symbol: '&', name: 'ampersand', weight: 'regular', style: 'solid', complexity: 3, categories: ['typo'], tags: ['conjunction'] },
    'typo-hash': { id: 'typo-hash', symbol: '#', name: 'hash', weight: 'regular', style: 'solid', complexity: 2, categories: ['typo'], tags: ['tag'] },
    'typo-bang': { id: 'typo-bang', symbol: '!', name: 'exclamation', weight: 'regular', style: 'solid', complexity: 1, categories: ['typo'], tags: ['emphasis'] },
    'typo-question': { id: 'typo-question', symbol: '?', name: 'question', weight: 'regular', style: 'solid', complexity: 2, categories: ['typo'], tags: ['query'] },
    'typo-lambda': { id: 'typo-lambda', symbol: 'λ', name: 'lambda', weight: 'regular', style: 'solid', complexity: 2, categories: ['math'], tags: ['function'] },
    'typo-mu': { id: 'typo-mu', symbol: 'µ', name: 'mu', weight: 'regular', style: 'solid', complexity: 2, categories: ['math'], tags: ['micro'] },
    'typo-omega': { id: 'typo-omega', symbol: 'Ω', name: 'omega', weight: 'bold', style: 'solid', complexity: 3, categories: ['math'], tags: ['end'] },

    // Celestial
    'cosm-sun': { id: 'cosm-sun', symbol: '☀︎', name: 'sun', weight: 'bold', style: 'solid', complexity: 4, categories: ['cosmic'], tags: ['light'] },
    'cosm-moon': { id: 'cosm-moon', symbol: '☾︎', name: 'moon', weight: 'regular', style: 'solid', complexity: 3, categories: ['cosmic'], tags: ['night'] },
    'cosm-snow': { id: 'cosm-snow', symbol: '❄︎', name: 'snowflake', weight: 'regular', style: 'solid', complexity: 4, categories: ['cosmic'], tags: ['cold'] },
    'cosm-atom': { id: 'cosm-atom', symbol: '⚛︎', name: 'atom', weight: 'regular', style: 'solid', complexity: 4, categories: ['cosmic'], tags: ['science'] },

    // Hexagons
    'hex-outline': { id: 'hex-outline', symbol: '⬡', name: 'hexagon', weight: 'regular', style: 'outline', complexity: 3, family: 'hexagon', categories: ['shapes'], tags: ['nature'] },
    'hex-filled': { id: 'hex-filled', symbol: '⬢', name: 'filled-hexagon', weight: 'bold', style: 'solid', complexity: 3, family: 'hexagon', parent: 'hex-outline', categories: ['shapes'], tags: ['nature'] },

    // Corners
    'corner-br': { id: 'corner-br', symbol: '◢', name: 'corner-br', weight: 'bold', style: 'solid', complexity: 2, categories: ['shapes'], tags: ['direction'] },
    'corner-bl': { id: 'corner-bl', symbol: '◣', name: 'corner-bl', weight: 'bold', style: 'solid', complexity: 2, categories: ['shapes'], tags: ['direction'] },
    'corner-tr': { id: 'corner-tr', symbol: '◤', name: 'corner-tr', weight: 'bold', style: 'solid', complexity: 2, categories: ['shapes'], tags: ['direction'] },
    'corner-tl': { id: 'corner-tl', symbol: '◥', name: 'corner-tl', weight: 'bold', style: 'solid', complexity: 2, categories: ['shapes'], tags: ['direction'] },
};

// Helper Functions

/**
 * Get all glyphs in an evolution family
 */
export function getFamily(glyphId: string): GlyphMetadata[] {
    const glyph = GLYPHS[glyphId];
    if (!glyph?.family) return [glyph];

    const family = Object.values(GLYPHS).filter(g => g.family === glyph.family);

    // Sort by complexity (evolution order)
    return family.sort((a, b) => a.complexity - b.complexity);
}

/**
 * Get visually similar glyphs based on properties
 */
export function getSimilar(glyphId: string, threshold = 1): GlyphMetadata[] {
    const glyph = GLYPHS[glyphId];
    if (!glyph) return [];

    return Object.values(GLYPHS).filter(g => {
        if (g.id === glyphId) return false;

        let distance = 0;
        if (g.weight !== glyph.weight) distance += 1;
        if (g.style !== glyph.style) distance += 1;
        distance += Math.abs(g.complexity - glyph.complexity);

        return distance <= threshold;
    });
}

/**
 * Get variants of a glyph (same family different branches)
 */
export function getVariants(glyphId: string): GlyphMetadata[] {
    const glyph = GLYPHS[glyphId];
    if (!glyph) return [];

    if (glyph.variants) {
        return glyph.variants.map(id => GLYPHS[id]).filter(Boolean);
    }

    return [];
}

/**
 * Get evolution chain (ancestors and descendants)
 */
export function getEvolutionChain(glyphId: string): { ancestors: GlyphMetadata[], descendants: GlyphMetadata[] } {
    const glyph = GLYPHS[glyphId];
    if (!glyph) return { ancestors: [], descendants: [] };

    const ancestors: GlyphMetadata[] = [];
    let current = glyph;
    while (current.parent) {
        const parent = GLYPHS[current.parent];
        if (!parent) break;
        ancestors.unshift(parent);
        current = parent;
    }

    const descendants = Object.values(GLYPHS).filter(g => g.parent === glyphId);

    return { ancestors, descendants };
}

// Category-based organization (existing structure for backwards compatibility)
export interface GlyphCategory {
    id: string;
    label: string;
    glyphs: string[];
}

const BASE_GLYPH_IDS = [
    'circle-1',
    'circle-2',
    'circle-3',
    'circle-4',
    'circle-5',
    'circle-6',
    'square-1',
    'square-2',
    'square-3',
    'triangle-1',
    'triangle-2',
    'triangle-3',
    'diamond-1',
    'diamond-2'
];

const EMOJI_GLYPHS = [
    '🧠', '✨', '🔥', '🌊', '🌿', '⚡', '🌀', '🌙',
    '☀️', '🎯', '🧭', '🪶', '🎧', '🕯️', '🧪', '🎴'
];

const dedupeCategories = (categories: GlyphCategory[]) => {
    const seen = new Set<string>();
    return categories.map(category => {
        const glyphs = category.glyphs.filter(symbol => {
            if (seen.has(symbol)) return false;
            seen.add(symbol);
            return true;
        });
        return { ...category, glyphs };
    });
};

export const GLYPH_LIBRARY: GlyphCategory[] = dedupeCategories([
    {
        id: 'base',
        label: 'Base',
        glyphs: BASE_GLYPH_IDS.map(id => GLYPHS[id]).filter(Boolean).map(g => g.symbol)
    },
    {
        id: 'cosmic',
        label: 'Cosmic',
        glyphs: Object.values(GLYPHS).filter(g => g.categories.includes('cosmic')).map(g => g.symbol)
    },
    {
        id: 'schemes',
        label: 'Schemes',
        glyphs: Object.values(GLYPHS).filter(g => g.categories.includes('schemes')).map(g => g.symbol)
    },
    {
        id: 'math',
        label: 'Math',
        glyphs: Object.values(GLYPHS).filter(g => g.categories.includes('math')).map(g => g.symbol)
    },
    {
        id: 'logic',
        label: 'Logic',
        glyphs: Object.values(GLYPHS).filter(g => g.categories.includes('logic')).map(g => g.symbol)
    },
    {
        id: 'alchemy',
        label: 'Alchemy',
        glyphs: Object.values(GLYPHS).filter(g => g.categories.includes('alchemy')).map(g => g.symbol)
    },
    {
        id: 'tech',
        label: 'Tech',
        glyphs: Object.values(GLYPHS).filter(g => g.categories.includes('tech')).map(g => g.symbol)
    },
    {
        id: 'runes',
        label: 'Runes',
        glyphs: Object.values(GLYPHS).filter(g => g.categories.includes('runes')).map(g => g.symbol)
    },
    {
        id: 'shapes',
        label: 'Shapes',
        glyphs: Object.values(GLYPHS).filter(g => g.categories.includes('shapes')).map(g => g.symbol)
    },
    {
        id: 'typo',
        label: 'Graphemes',
        glyphs: Object.values(GLYPHS).filter(g => g.categories.includes('typo')).map(g => g.symbol)
    },
    {
        id: 'emoji',
        label: 'Emoji',
        glyphs: EMOJI_GLYPHS
    }
]);
