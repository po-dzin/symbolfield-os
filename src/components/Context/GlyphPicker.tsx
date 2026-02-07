/**
 * GlyphPicker.tsx
 * A matrix/grid picker for assigning symbols to nodes.
 */

import React, { useMemo, useState } from 'react';
import { getGlyphDisplayLabel, getGlyphPickerCategories, getGlyphRingPalette, onGlyphRegistryChange } from '../../utils/sfGlyphLayer';
import GlyphIcon from '../Icon/GlyphIcon';

type ViewMode = 'matrix' | 'palette';

interface GlyphPickerProps {
    onSelect: (glyph: string) => void;
    onClose: () => void;
    currentGlyph?: string;
}

const GlyphPicker: React.FC<GlyphPickerProps> = ({ onSelect, onClose: _onClose, currentGlyph: _currentGlyph }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('matrix');
    const [, setGlyphRevision] = useState(0);
    const categories = getGlyphPickerCategories();
    const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.id ?? 'base');

    React.useEffect(() => {
        return onGlyphRegistryChange(() => {
            setGlyphRevision((value) => value + 1);
        });
    }, []);

    React.useEffect(() => {
        if (categories.some((category) => category.id === activeCategory)) return;
        setActiveCategory(categories[0]?.id ?? 'base');
    }, [activeCategory, categories]);

    const currentCat = categories.find(c => c.id === activeCategory) || categories[0];
    const glyphsByRing = useMemo(() => getGlyphRingPalette(categories), [categories]);

    const renderGlyph = (glyphId: string, size: number) => {
        return <GlyphIcon id={glyphId} size={size} className="text-white" />;
    };

    return (
        <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-[280px] bg-black/90 border border-white/20 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md flex flex-col z-[200]"
            onClick={(e) => e.stopPropagation()}
            data-context-menu
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                <div className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-bold">
                    Glyphs
                </div>
                <button
                    onClick={() => setViewMode(viewMode === 'matrix' ? 'palette' : 'matrix')}
                    className="px-2 py-1 text-[9px] uppercase tracking-wider bg-white/5 rounded text-white/70"
                >
                    {viewMode === 'matrix' ? '◎ Palette' : '⊞ Matrix'}
                </button>
            </div>

            {viewMode === 'matrix' ? (
                <>
                    {/* Category Tabs */}
                    <div className="flex overflow-x-auto text-[10px] uppercase tracking-wider border-b border-white/10 scrollbar-hide">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                            className={`
                            px-3 py-2 whitespace-nowrap
                            ${activeCategory === cat.id ? 'bg-white/20 text-white font-bold' : 'text-white/50'}
                        `}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Grid */}
                    <div className="p-3 grid grid-cols-6 gap-2 bg-gradient-to-b from-black/50 to-transparent">
                        {currentCat?.glyphs.map((glyphId) => (
                            <button
                                key={glyphId}
                                onClick={() => onSelect(glyphId)}
                                className="aspect-square flex items-center justify-center rounded-lg bg-white/5 border border-white/5 text-white text-lg active:scale-95"
                                title={getGlyphDisplayLabel(glyphId)}
                            >
                                {renderGlyph(glyphId, 18)}
                            </button>
                        ))}
                    </div>
                </>
            ) : (
                /* Radial Palette View */
                <div className="relative w-[280px] h-[320px] flex items-center justify-center bg-gradient-radial from-white/5 to-transparent overflow-hidden">
                    {/* Center indicator */}
                    <div className="absolute w-12 h-12 rounded-full border border-dashed border-white/20" />

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
                                className="absolute w-9 h-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white text-base leading-none"
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
                                className="absolute w-9 h-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white text-lg leading-none"
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
                                className="absolute w-9 h-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white text-xl leading-none"
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
            <div className="flex justify-between p-2 border-t border-white/10 bg-white/5">
                <button
                    onClick={() => onSelect('')}
                    className="px-2 py-1 text-[9px] uppercase tracking-widest text-red-400/80 rounded"
                >
                    Clear
                </button>
                <div className="text-[9px] uppercase tracking-widest text-white/30 px-2 py-1">
                    {viewMode === 'matrix' ? 'Browse' : 'Explore'}
                </div>
            </div>
        </div>
    );
};

export default GlyphPicker;
