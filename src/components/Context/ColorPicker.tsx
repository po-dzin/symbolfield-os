/**
 * ColorPicker.tsx
 * Role-based picker with minimal palettes.
 */

import React, { useMemo, useState } from 'react';

type ColorRole = 'body' | 'stroke' | 'glow' | 'glyph';

interface ColorPickerProps {
    onSelect: (role: ColorRole, color: string) => void;
    onClose: () => void;
    currentColors: Record<ColorRole, string>;
}

const PASTEL_COLORS = [
    'rgba(248,113,113,0.32)', // red
    'rgba(249,115,22,0.32)',  // orange (more vivid)
    'rgba(250,204,21,0.32)',  // yellow
    'rgba(52,211,153,0.32)',  // green
    'rgba(56,189,248,0.32)',  // cyan
    'rgba(59,130,246,0.32)',  // blue
    'rgba(192,132,252,0.32)'  // purple
];
const COLOR_OPTIONS = [
    'rgba(255,255,255,0)',
    'rgba(0,0,0,0.75)',
    'rgba(255,255,255,0.06)',
    'rgba(255,255,255,0.9)',
    ...PASTEL_COLORS
];
const DEFAULT_COLORS: Record<ColorRole, string> = {
    body: 'rgba(255,255,255,0.06)',
    stroke: 'rgba(255,255,255,0.4)',
    glow: 'rgba(255,255,255,0.08)',
    glyph: 'rgba(255,255,255,0.9)'
};

const ColorPicker: React.FC<ColorPickerProps> = ({ onSelect, onClose, currentColors }) => {
    const [activePickerRole, setActivePickerRole] = useState<ColorRole | null>(null);
    const rows = useMemo(() => ([
        { id: 'body', label: 'Body' },
        { id: 'stroke', label: 'Border' },
        { id: 'glow', label: 'Glow' },
        { id: 'glyph', label: 'Glyph' }
    ]), []);

    const renderSwatch = (role: ColorRole, color: string) => {
        const isActive = currentColors[role] === color;
        return (
            <button
                key={`${role}-${color}`}
                onClick={() => onSelect(role, color)}
                className={`w-4 h-4 rounded-full border ${isActive ? 'border-white/60' : 'border-white/8'}`}
                style={{ backgroundColor: color }}
                aria-label="Pick color"
            />
        );
    };

    return (
        <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-[380px] bg-black/90 border border-white/20 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md flex flex-col z-[200]"
            onClick={(e) => e.stopPropagation()}
            data-context-menu
        >
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                <div className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-bold">
                    Colors
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            (Object.keys(DEFAULT_COLORS) as ColorRole[]).forEach(role => {
                                onSelect(role, DEFAULT_COLORS[role]);
                            });
                            setActivePickerRole(null);
                        }}
                        className="w-6 h-6 rounded-full border border-white/10 flex items-center justify-center text-white/50"
                        title="Reset colors"
                        aria-label="Reset colors"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 12a8 8 0 1 1-2.6-5.9" />
                            <path d="M20 4v5h-5" />
                        </svg>
                    </button>
                    <button
                        onClick={onClose}
                        className="text-[9px] uppercase tracking-wider text-white/50"
                    >
                        Close
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-2 px-3 py-2">
                {rows.map(row => {
                    const role = row.id as ColorRole;
                    return (
                        <div key={row.id} className="flex items-center gap-3">
                            <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 w-[78px] flex-shrink-0">
                                {row.label}
                            </div>
                            <div className="grid grid-cols-12 gap-2">
                                {COLOR_OPTIONS.map(color => renderSwatch(role, color))}
                                <button
                                    onClick={() => setActivePickerRole(activePickerRole === role ? null : role)}
                                    className="w-4 h-4 rounded-full border border-white/30 shadow-[0_0_8px_rgba(255,255,255,0.15)]"
                                    style={{
                                        background: 'conic-gradient(#ff4d4d, #ffd24d, #6eff8a, #55b8ff, #8b5bff, #ff4da6, #ff4d4d)'
                                    }}
                                    aria-label="Open color picker"
                                    title="Open palette picker"
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
            {activePickerRole && (
                <div className="absolute left-full top-10 ml-2 w-44 bg-black/90 border border-white/20 rounded-xl shadow-2xl backdrop-blur-md p-3 z-[210]" data-context-menu>
                    <div className="text-[9px] uppercase tracking-[0.2em] text-white/50 mb-2">
                        Spectrum
                    </div>
                    <input
                        type="color"
                        value={currentColors[activePickerRole]}
                        onChange={(e) => onSelect(activePickerRole, e.target.value)}
                        className="w-full h-10 rounded-md border border-white/20 bg-transparent"
                    />
                </div>
            )}
        </div>
    );
};

export default ColorPicker;
