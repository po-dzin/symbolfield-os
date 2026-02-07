/**
 * SettingsDrawer.jsx
 * Minimal settings panel for v0.5.
 */

import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import GlyphIcon from '../Icon/GlyphIcon';
import { glyphBuilderAdapter, type GlyphBuilderStoredGlyph } from '../../core/storage/GlyphBuilderAdapter';
import { onGlyphRegistryChange } from '../../utils/sfGlyphLayer';

const slugifyGlyphId = (value: string) => (
    value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9:_-]+/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-|-$/g, '')
);

type TogglePillProps = {
    checked: boolean;
    onToggle: () => void;
    labelOn?: string;
    labelOff?: string;
};

const TogglePill = ({ checked, onToggle, labelOn = 'ON', labelOff = 'OFF' }: TogglePillProps) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        className={`relative w-16 h-7 rounded-full border transition-colors ${checked ? 'bg-white/20 border-white/30' : 'bg-white/10 border-white/20'}`}
    >
        <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold transition-all ${checked ? 'text-white/80' : 'opacity-0'} z-10`}>
            {labelOn}
        </span>
        <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold transition-all ${checked ? 'opacity-0' : 'text-white/80'} z-10`}>
            {labelOff}
        </span>
        <span className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full shadow-sm transition-all ${checked ? 'right-0.5 bg-white' : 'left-0.5 bg-white'}`} />
    </button>
);

const SettingsDrawer = () => {
    const settingsOpen = useAppStore(state => state.settingsOpen);
    const closeSettings = useAppStore(state => state.closeSettings);
    const drawerRightTab = useAppStore(state => state.drawerRightTab);
    const contextMenuMode = useAppStore(state => state.contextMenuMode);
    const setContextMenuMode = useAppStore(state => state.setContextMenuMode);
    const gridSnapEnabled = useAppStore(state => state.gridSnapEnabled);
    const setGridSnapEnabled = useAppStore(state => state.setGridSnapEnabled);
    const gridStepMul = useAppStore(state => state.gridStepMul);
    const setGridStepMul = useAppStore(state => state.setGridStepMul);
    const showGrid = useAppStore(state => state.showGrid);
    const setShowGrid = useAppStore(state => state.setShowGrid);
    const showEdges = useAppStore(state => state.showEdges);
    const setShowEdges = useAppStore(state => state.setShowEdges);
    const showHud = useAppStore(state => state.showHud);
    const setShowHud = useAppStore(state => state.setShowHud);
    const showCounters = useAppStore(state => state.showCounters);
    const setShowCounters = useAppStore(state => state.setShowCounters);
    const [glyphs, setGlyphs] = React.useState<GlyphBuilderStoredGlyph[]>(() => glyphBuilderAdapter.list());
    const [glyphIdDraft, setGlyphIdDraft] = React.useState('');
    const [glyphLabelDraft, setGlyphLabelDraft] = React.useState('');
    const [glyphSymbolDraft, setGlyphSymbolDraft] = React.useState('');
    const [glyphSvgDraft, setGlyphSvgDraft] = React.useState('');
    const [glyphCategoriesDraft, setGlyphCategoriesDraft] = React.useState('');
    const [glyphError, setGlyphError] = React.useState('');

    React.useEffect(() => {
        if (!settingsOpen || drawerRightTab !== 'settings') return;
        setGlyphs(glyphBuilderAdapter.list());
    }, [settingsOpen, drawerRightTab]);

    React.useEffect(() => {
        return onGlyphRegistryChange(() => {
            setGlyphs(glyphBuilderAdapter.list());
        });
    }, []);

    if (!settingsOpen || drawerRightTab !== 'settings') return null;

    const resetGlyphForm = () => {
        setGlyphIdDraft('');
        setGlyphLabelDraft('');
        setGlyphSymbolDraft('');
        setGlyphSvgDraft('');
        setGlyphCategoriesDraft('');
        setGlyphError('');
    };

    const handleSaveGlyph = () => {
        const inferredId = slugifyGlyphId(glyphIdDraft || glyphLabelDraft);
        const id = inferredId;
        const label = glyphLabelDraft.trim() || id;
        const symbol = glyphSymbolDraft.trim();
        const svg = glyphSvgDraft.trim();
        const categories = glyphCategoriesDraft
            .split(',')
            .map(item => item.trim())
            .filter(Boolean);

        if (!id) {
            setGlyphError('ID is required.');
            return;
        }
        if (!symbol && !svg) {
            setGlyphError('Provide Symbol or SVG.');
            return;
        }

        const glyphDraft: {
            id: string;
            label: string;
            categories?: string[];
            symbol?: string;
            svg?: string;
        } = { id, label };
        if (categories.length > 0) glyphDraft.categories = categories;
        if (symbol) glyphDraft.symbol = symbol;
        if (svg) glyphDraft.svg = svg;

        const stored = glyphBuilderAdapter.upsert(glyphDraft);

        if (!stored) {
            setGlyphError('Failed to save glyph.');
            return;
        }

        setGlyphs(glyphBuilderAdapter.list());
        resetGlyphForm();
    };

    const handleRemoveGlyph = (glyphId: string) => {
        glyphBuilderAdapter.remove(glyphId);
        setGlyphs(glyphBuilderAdapter.list());
    };

    return (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 ml-16 w-[var(--panel-width-md)] z-[var(--z-drawer)] animate-slide-in pointer-events-auto">
            <div className="glass-panel p-3 flex max-h-[72vh] flex-col gap-3 overflow-y-auto">
                <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-widest text-text-secondary">Settings</span>
                    <button onClick={closeSettings} className="text-text-secondary hover:text-text-primary">✕</button>
                </div>
                <div className="text-sm text-text-meta">
                    View + interaction settings (v0.5). Preferences/presets will expand later.
                </div>
                <div className="flex items-center justify-between text-sm text-white/70">
                    <span>Context menu mode</span>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={contextMenuMode === 'radial'}
                        onClick={() => setContextMenuMode(contextMenuMode === 'bar' ? 'radial' : 'bar')}
                        className={`relative w-16 h-7 rounded-full border transition-colors ${contextMenuMode === 'radial' ? 'bg-white/20 border-white/30' : 'bg-white/10 border-white/20'}`}
                        title={contextMenuMode === 'radial' ? 'Radial' : 'Bar'}
                    >
                        <span
                            className={`absolute left-2 top-1/2 -translate-y-1/2 text-[11px] transition-all ${contextMenuMode === 'bar' ? 'text-white' : 'text-white/40'}`}
                        >
                            —
                        </span>
                        <span
                            className={`absolute right-2 top-1/2 -translate-y-1/2 transition-all ${contextMenuMode === 'radial' ? 'text-white' : 'text-white/40'}`}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="block">
                                <path
                                    d="M4 13.5A8 8 0 0 1 12 6a8 8 0 0 1 8 7.5"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </span>
                        <span
                            className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full shadow-sm transition-all ${contextMenuMode === 'radial' ? 'right-0.5 bg-white' : 'left-0.5 bg-white'}`}
                        >
                            <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-semibold ${contextMenuMode === 'radial' ? 'text-black/80' : 'text-black/70'}`}>
                                {contextMenuMode === 'radial' ? (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="block">
                                        <path
                                            d="M5 13A7 7 0 0 1 12 6a7 7 0 0 1 7 7"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                ) : (
                                    '—'
                                )}
                            </span>
                        </span>
                    </button>
                </div>
                <div className="flex items-center justify-between text-sm text-white/70">
                    <span>Show grid</span>
                    <TogglePill checked={showGrid} onToggle={() => setShowGrid(!showGrid)} />
                </div>
                <div className="flex items-center justify-between text-sm text-white/70">
                    <span>Grid snap</span>
                    <TogglePill checked={gridSnapEnabled} onToggle={() => setGridSnapEnabled(!gridSnapEnabled)} />
                </div>
                <div className="flex items-center justify-between text-sm text-white/70">
                    <span>Grid step</span>
                    <div className="flex items-center gap-1">
                        {[0.5, 1, 2].map(step => (
                            <button
                                key={step}
                                onClick={() => setGridStepMul(step)}
                                className={`px-2 py-1 rounded-full text-[10px] uppercase tracking-wider border transition-colors ${gridStepMul === step ? 'bg-white/20 border-white/30 text-white' : 'border-white/10 text-white/50 hover:text-white hover:border-white/30'}`}
                            >
                                {step}×
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center justify-between text-sm text-white/70">
                    <span>Show edges</span>
                    <TogglePill checked={showEdges} onToggle={() => setShowEdges(!showEdges)} />
                </div>
                <div className="flex items-center justify-between text-sm text-white/70">
                    <span>HUD chips</span>
                    <TogglePill checked={showHud} onToggle={() => setShowHud(!showHud)} />
                </div>
                <div className="flex items-center justify-between text-sm text-white/70">
                    <span>HUD counters</span>
                    <TogglePill checked={showCounters} onToggle={() => setShowCounters(!showCounters)} />
                </div>

                <div className="mt-1 border-t border-white/10 pt-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-widest text-text-secondary">Glyph Adapter</span>
                        {glyphs.length > 0 && (
                            <button
                                onClick={() => {
                                    glyphBuilderAdapter.clear();
                                    setGlyphs([]);
                                }}
                                className="rounded border border-red-400/30 px-2 py-1 text-[10px] uppercase tracking-wider text-red-300/90"
                            >
                                Clear all
                            </button>
                        )}
                    </div>
                    <div className="mt-2 space-y-2">
                        <input
                            value={glyphIdDraft}
                            onChange={(event) => setGlyphIdDraft(event.target.value)}
                            placeholder="glyph id (e.g. sigil:focus)"
                            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-white/35"
                        />
                        <input
                            value={glyphLabelDraft}
                            onChange={(event) => setGlyphLabelDraft(event.target.value)}
                            placeholder="label"
                            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-white/35"
                        />
                        <input
                            value={glyphSymbolDraft}
                            onChange={(event) => setGlyphSymbolDraft(event.target.value)}
                            placeholder="symbol (e.g. ✦)"
                            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-white/35"
                        />
                        <textarea
                            value={glyphSvgDraft}
                            onChange={(event) => setGlyphSvgDraft(event.target.value)}
                            placeholder="or svg markup"
                            className="h-20 w-full resize-y rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-white/35"
                        />
                        <input
                            value={glyphCategoriesDraft}
                            onChange={(event) => setGlyphCategoriesDraft(event.target.value)}
                            placeholder="categories (comma-separated)"
                            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-white/35"
                        />
                        {glyphError ? (
                            <div className="text-[11px] text-red-300">{glyphError}</div>
                        ) : null}
                        <div className="flex gap-2">
                            <button
                                onClick={handleSaveGlyph}
                                className="rounded border border-white/25 bg-white/10 px-3 py-1.5 text-[10px] uppercase tracking-wider text-white"
                            >
                                Save glyph
                            </button>
                            <button
                                onClick={resetGlyphForm}
                                className="rounded border border-white/15 px-3 py-1.5 text-[10px] uppercase tracking-wider text-white/70"
                            >
                                Reset
                            </button>
                        </div>
                    </div>

                    <div className="mt-3 space-y-1">
                        {glyphs.length === 0 ? (
                            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-white/50">
                                No generated glyphs yet.
                            </div>
                        ) : glyphs.map((glyph) => (
                            <div key={glyph.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
                                <div className="flex min-w-0 items-center gap-2">
                                    <GlyphIcon id={glyph.id} size={14} className="text-white/90" />
                                    <div className="min-w-0">
                                        <div className="truncate text-[11px] text-white/90">{glyph.label}</div>
                                        <div className="truncate text-[10px] text-white/45">{glyph.id}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemoveGlyph(glyph.id)}
                                    className="rounded border border-red-400/25 px-2 py-0.5 text-[10px] uppercase tracking-wider text-red-300/90"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsDrawer;
