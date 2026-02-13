/**
 * GlyphPicker.tsx
 * A matrix/grid picker for assigning symbols to nodes.
 */

import React, { useMemo, useState } from 'react';
import { getGlyphDisplayLabel, getGlyphPickerCategories, getGlyphRingPalette } from '../../utils/sfGlyphLayer';
import GlyphIcon from '../Icon/GlyphIcon';

type ViewMode = 'matrix' | 'palette';

interface GlyphPickerProps {
    onSelect: (glyph: string) => void;
    onClose: () => void;
    currentGlyph?: string;
}

const GlyphPicker: React.FC<GlyphPickerProps> = ({ onSelect, onClose: _onClose, currentGlyph: _currentGlyph }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('matrix');
    const categories = useMemo(() => getGlyphPickerCategories(), []);
    const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.id ?? 'base');

    const currentCat = categories.find(c => c.id === activeCategory) || categories[0];
    const glyphsByRing = useMemo(() => getGlyphRingPalette(categories), [categories]);

    const renderGlyph = (glyphId: string, size: number) => {
        return <GlyphIcon id={glyphId} size={size} className="text-[var(--semantic-color-text-primary)]" />;
    };

    return (
        <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-[280px] glass-panel border border-[var(--semantic-color-border-default)] rounded-[var(--primitive-radius-card)] overflow-hidden shadow-2xl flex flex-col z-[200]"
            onClick={(e) => e.stopPropagation()}
            data-context-menu
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--semantic-color-border-subtle)]">
                <div className="text-[10px] uppercase tracking-[0.25em] text-[var(--semantic-color-text-muted)] font-bold">
                    Glyphs
                </div>
                <button
                    onClick={() => setViewMode(viewMode === 'matrix' ? 'palette' : 'matrix')}
                    className="ui-selectable px-2 py-1 text-[9px] uppercase tracking-wider ui-shape-soft text-[var(--semantic-color-text-secondary)]"
                >
                    {viewMode === 'matrix' ? '◎ Palette' : '⊞ Matrix'}
                </button>
            </div>

            {viewMode === 'matrix' ? (
                <>
                    {/* Category Tabs */}
                    <div className="flex overflow-x-auto text-[10px] uppercase tracking-wider border-b border-[var(--semantic-color-border-subtle)] scrollbar-hide">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`
                            px-3 py-2 whitespace-nowrap transition-colors
                            ${activeCategory === cat.id
                                    ? 'bg-[var(--semantic-color-interactive-active-bg)] text-[var(--semantic-color-text-primary)] font-bold'
                                    : 'text-[var(--semantic-color-text-muted)] hover:text-[var(--semantic-color-text-secondary)]'}
                        `}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Grid */}
                    <div className="p-3 grid grid-cols-6 gap-2 bg-gradient-to-b from-[var(--semantic-color-bg-surface-hover)] to-transparent">
                        {currentCat?.glyphs.map((glyphId) => (
                            <button
                                key={glyphId}
                                onClick={() => onSelect(glyphId)}
                                className="aspect-square flex items-center justify-center rounded-lg border border-[var(--semantic-color-border-subtle)] bg-[var(--semantic-color-interactive-hover-bg)] text-[var(--semantic-color-text-primary)] active:scale-95 hover:bg-[var(--semantic-color-interactive-active-bg)] transition-colors"
                                title={getGlyphDisplayLabel(glyphId)}
                            >
                                {renderGlyph(glyphId, 18)}
                            </button>
                        ))}
                    </div>
                </>
            ) : (
                /* Radial Palette View */
                <div className="relative w-[280px] h-[320px] flex items-center justify-center bg-gradient-radial from-[var(--semantic-color-bg-surface-hover)] to-transparent overflow-hidden">
                    {/* Center indicator */}
                    <div className="absolute w-12 h-12 rounded-full border border-dashed border-[var(--semantic-color-border-default)]" />

                    {/* Ring 1: Primitives (complexity 1-2) */}
                    {glyphsByRing.ring1.map((glyphId, i) => {
                        const count = glyphsByRing.ring1.length || 1;
                        const angle = (i / count) * 2 * Math.PI;
                        const radius = 50;
                        const x = Math.cos(angle) * radius;
                        const y = Math.sin(angle) * radius;
                        return (
                            <button
                                key={glyphId}
                                onClick={() => onSelect(glyphId)}
                                className="absolute w-9 h-9 flex items-center justify-center rounded-full bg-[var(--semantic-color-interactive-hover-bg)] border border-[var(--semantic-color-border-subtle)] text-[var(--semantic-color-text-primary)] text-base leading-none hover:bg-[var(--semantic-color-interactive-active-bg)] transition-colors"
                                style={{ transform: `translate(${x}px, ${y}px)` }}
                                title={getGlyphDisplayLabel(glyphId)}
                            >
                                {renderGlyph(glyphId, 16)}
                            </button>
                        );
                    })}

                    {/* Ring 2: Intermediate (complexity 3) */}
                    {glyphsByRing.ring2.map((glyphId, i) => {
                        const count = glyphsByRing.ring2.length || 1;
                        const angle = (i / count) * 2 * Math.PI;
                        const radius = 88;
                        const x = Math.cos(angle) * radius;
                        const y = Math.sin(angle) * radius;
                        return (
                            <button
                                key={glyphId}
                                onClick={() => onSelect(glyphId)}
                                className="absolute w-9 h-9 flex items-center justify-center rounded-full bg-[var(--semantic-color-interactive-hover-bg)] border border-[var(--semantic-color-border-subtle)] text-[var(--semantic-color-text-primary)] text-lg leading-none hover:bg-[var(--semantic-color-interactive-active-bg)] transition-colors"
                                style={{ transform: `translate(${x}px, ${y}px)` }}
                                title={getGlyphDisplayLabel(glyphId)}
                            >
                                {renderGlyph(glyphId, 16)}
                            </button>
                        );
                    })}

                    {/* Ring 3: Complex (complexity 4-5) */}
                    {glyphsByRing.ring3.map((glyphId, i) => {
                        const count = glyphsByRing.ring3.length || 1;
                        const angle = (i / count) * 2 * Math.PI;
                        const radius = 120;
                        const x = Math.cos(angle) * radius;
                        const y = Math.sin(angle) * radius;
                        return (
                            <button
                                key={glyphId}
                                onClick={() => onSelect(glyphId)}
                                className="absolute w-9 h-9 flex items-center justify-center rounded-full bg-[var(--semantic-color-interactive-hover-bg)] border border-[var(--semantic-color-border-subtle)] text-[var(--semantic-color-text-primary)] text-xl leading-none hover:bg-[var(--semantic-color-interactive-active-bg)] transition-colors"
                                style={{ transform: `translate(${x}px, ${y}px)` }}
                                title={getGlyphDisplayLabel(glyphId)}
                            >
                                {renderGlyph(glyphId, 16)}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Footer */}
            <div className="flex justify-between p-2 border-t border-[var(--semantic-color-border-subtle)] bg-[var(--semantic-color-interactive-hover-bg)]">
                <button
                    onClick={() => onSelect('')}
                    className="ui-selectable px-2 py-1 text-[9px] uppercase tracking-widest text-[var(--semantic-color-status-error)] rounded-[var(--primitive-radius-pill)]"
                >
                    Clear
                </button>
                <div className="text-[9px] uppercase tracking-widest text-[var(--semantic-color-text-muted)] px-2 py-1">
                    {viewMode === 'matrix' ? 'Browse' : 'Explore'}
                </div>
            </div>
        </div>
    );
};

export default GlyphPicker;
