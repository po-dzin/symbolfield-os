import React, { useState, useEffect, useRef } from 'react';
import { useWindowStore } from '../../store/windowStore';
import { useStateStore, MODES, TONES, GLYPHS } from '../../store/stateStore';
import { useHarmonyStore } from '../../store/harmonyStore';

const Tooltip = ({ text }) => (
    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 border border-white/10 rounded text-[10px] text-white whitespace-nowrap pointer-events-none z-50">
        {text}
    </div>
);

const ModePill = ({ modeKey, active, onClick, accentColor, mode }) => {
    const modeData = MODES[modeKey];
    const [hover, setHover] = useState(false);
    const isLuma = modeKey === 'LUMA';

    // Convert hex to RGB for radial gradient
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 0, 0';
    };

    const accentRGB = hexToRgb(accentColor);

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            title={`${modeData.label} Mode`}
            className={`
                inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-full transition-all duration-300 cursor-pointer
                ${active ? '' : (mode === 'LUMA' ? 'hover:bg-black/5' : 'hover:bg-white/5')}
            `}
            style={active ? {
                background: isLuma
                    ? `rgba(235,225,210,0.95)`
                    : `rgba(0,0,0,0.9)`,
                border: `1.5px solid rgba(${accentRGB}, 0.7)`,
                boxShadow: `0 0 14px rgba(${accentRGB}, 0.7)`,
                color: isLuma ? 'var(--neutralTextLuma, #2A2620)' : '#FFFFFF',
                textShadow: 'none'
            } : {
                background: 'transparent',
                border: '1.5px solid transparent',
                color: hover ? (mode === 'LUMA' ? '#2A2620' : '#FFFFFF') : (mode === 'LUMA' ? '#5b5349' : 'var(--text-secondary)')
            }}
        >
            <span className="text-lg inline-flex items-center justify-center leading-none">
                {modeData.icon}
            </span>
            <span className="text-xs font-bold uppercase tracking-widest leading-none mt-0.5">
                {modeData.label}
            </span>
        </button>
    );
};

const ToneSelector = ({ currentToneId, onSelect, accentColor, mode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const currentTone = TONES.find(t => t.id === currentToneId) || TONES[0];
    const containerRef = useRef(null);
    const isLuma = mode === 'LUMA';

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={containerRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                title={`Current Tone: ${currentTone.label}`}
                className={`w-[40px] h-[40px] rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${isOpen ? (isLuma ? 'bg-black/5' : 'bg-white/10') : (isLuma ? 'hover:bg-black/5' : 'hover:bg-white/5')}`}
            >
                <div
                    className="w-5 h-5 rounded-full shadow-sm border border-white/10"
                    style={{ backgroundColor: accentColor, boxShadow: `0 0 10px ${accentColor}40` }}
                />
            </button>

            {isOpen && (
                <div className={`absolute top-full mt-4 left-1/2 -translate-x-1/2 backdrop-blur-xl border rounded-full p-2 flex items-center gap-2 shadow-2xl z-50
                    ${isLuma ? 'bg-[#EBE1D2]/95 border-black/5' : 'bg-os-dark-blue/95 border-white/10'}
                `}>
                    {TONES.map(tone => {
                        const toneDisplayColor = mode === 'LUMA' ? tone.lumaColor : tone.color;
                        return (
                            <button
                                key={tone.id}
                                onClick={() => { onSelect(tone.id); setIsOpen(false); }}
                                title={tone.label}
                                className="w-8 h-8 rounded-full hover:scale-110 transition-transform flex items-center justify-center cursor-pointer"
                            >
                                <div
                                    className="w-6 h-6 rounded-full shadow-sm border border-white/10"
                                    style={{ backgroundColor: toneDisplayColor }}
                                />
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const GlyphSelector = ({ currentGlyphId, onSelect, accentColor, mode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const currentGlyph = GLYPHS.find(g => g.id === currentGlyphId) || GLYPHS[0];
    const containerRef = useRef(null);
    const isLuma = mode === 'LUMA';

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Helper to render glyphs with optical adjustments
    const renderGlyph = (char, id, isMain = false) => {
        const baseClass = isMain ? "text-2xl" : "text-xl";
        const commonClasses = `${baseClass} w-full h-full flex items-center justify-center leading-none`;

        if (id === 'eye') {
            return <span className={`${commonClasses} -mt-0.5 transform scale-85 font-bold`} style={{ WebkitTextStroke: '0.5px currentColor' }}>{char}</span>;
        }
        if (id === 'triad') {
            return <span className={`${commonClasses} -mt-1.5 font-bold transform scale-115`}>{char}</span>;
        }
        if (id === 'point') {
            return <span className={`${commonClasses} transform scale-115`}>{char}</span>;
        }
        if (id === 'sun' || id === 'null') {
            return <span className={`${commonClasses} -mt-0.5 transform scale-110`}>{char}</span>;
        }
        if (id === 'circle') {
            return <span className={`${commonClasses} mt-0.5`}>{char}</span>;
        }

        return <span className={commonClasses}>{char}</span>;
    };

    return (
        <div ref={containerRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                title={`Current Glyph: ${currentGlyph.label}`}
                className={`w-[40px] h-[40px] rounded-full flex items-center justify-center transition-colors cursor-pointer ${isLuma ? 'hover:bg-black/5' : 'hover:bg-white/5'}`}
                style={isOpen ? { backgroundColor: isLuma ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)' } : {}}
            >
                <div className={`flex items-center justify-center w-full h-full ${isLuma ? 'text-[#2A2620]' : 'text-os-text-secondary'}`} style={{ color: isOpen ? accentColor : undefined }}>
                    {renderGlyph(currentGlyph.char, currentGlyph.id, true)}
                </div>
            </button>

            {isOpen && (
                <div className={`absolute top-full mt-4 left-1/2 -translate-x-1/2 backdrop-blur-xl border rounded-full p-2 flex items-center gap-2 shadow-2xl z-50
                    ${isLuma ? 'bg-[#EBE1D2]/95 border-black/5' : 'bg-os-dark-blue/95 border-white/10'}
                `}>
                    {GLYPHS.map(glyph => (
                        <button
                            key={glyph.id}
                            onClick={() => { onSelect(glyph.id); setIsOpen(false); }}
                            title={glyph.label}
                            className={`w-8 h-8 rounded-full transition-colors flex items-center justify-center cursor-pointer
                                ${isLuma ? 'hover:bg-black/5' : 'hover:bg-white/10'}
                                ${glyph.id === currentGlyphId
                                    ? (isLuma ? 'text-[#2A2620] font-bold' : 'text-white font-bold')
                                    : (isLuma ? 'text-[#5b5349]' : 'text-os-text-secondary')
                                }
                            `}
                            style={glyph.id === currentGlyphId ? { color: accentColor } : {}}
                        >
                            {renderGlyph(glyph.char, glyph.id, false)}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const StatePanel = () => {
    const { activeTab } = useWindowStore();
    const { mode, toneId, glyphId, setMode, setTone, setGlyph } = useStateStore();
    const { isHarmonicLockEnabled, toggleHarmonicLock } = useHarmonyStore();

    const currentTone = TONES.find(t => t.id === toneId) || TONES[0];
    const activeColor = mode === 'LUMA' ? currentTone.lumaColor : currentTone.color;

    // Convert hex to RGB for CSS rgba
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '140, 195, 205';
    };

    const accentRGB = hexToRgb(activeColor);

    // StatePanel always visible (removed activeTab guard)

    return (
        <div className="absolute top-6 left-[120px] z-30 pointer-events-auto">
            <div
                className="flex items-center gap-4 px-5 h-[72px] backdrop-blur-xl transition-all duration-300 cursor-default"
                style={{
                    background: 'var(--surface-1-bg)',
                    border: `var(--panel-stroke-width) solid rgba(${accentRGB}, 0.35)`,
                    borderRadius: 'var(--panel-radius)',
                    boxShadow: `0 0 20px rgba(${accentRGB}, 0.22)`,
                    animation: 'pulse-glow-smooth 8s ease-in-out infinite',
                    '--glow-color': `${activeColor}60`
                }}
            >
                {/* MODE Group */}
                <div className="flex items-center gap-1 rounded-full p-1"
                    style={{ backgroundColor: mode === 'LUMA' ? 'rgba(90, 80, 65, 0.15)' : 'rgba(0,0,0,0.1)' }}
                >
                    {Object.keys(MODES).map(key => (
                        <ModePill
                            key={key}
                            modeKey={key}
                            active={mode === key}
                            onClick={() => setMode(key)}
                            accentColor={activeColor}
                            mode={mode}
                        />
                    ))}
                </div>

                <div className={`w-px h-8 ${mode === 'LUMA' ? 'bg-black/10' : 'bg-white/10'}`} />

                {/* TONE & GLYPH */}
                <div className="flex items-center gap-2">
                    <ToneSelector currentToneId={toneId} onSelect={setTone} accentColor={activeColor} mode={mode} />
                    <GlyphSelector currentGlyphId={glyphId} onSelect={setGlyph} accentColor={activeColor} mode={mode} />
                </div>

                <div className={`w-px h-8 ${mode === 'LUMA' ? 'bg-black/10' : 'bg-white/10'}`} />

                {/* HARMONIC LOCK */}
                <button
                    onClick={toggleHarmonicLock}
                    title={isHarmonicLockEnabled ? "Harmonic Lock: ON" : "Harmonic Lock: OFF"}
                    className={`w-[40px] h-[40px] rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${isHarmonicLockEnabled ? (mode === 'LUMA' ? 'bg-black/5' : 'bg-white/10') : (mode === 'LUMA' ? 'hover:bg-black/5' : 'hover:bg-white/5')}`}
                >
                    <span className={`text-xl font-serif italic ${isHarmonicLockEnabled ? (mode === 'LUMA' ? 'text-[#2A2620]' : 'text-white') : 'text-os-text-secondary'}`} style={{ color: isHarmonicLockEnabled ? activeColor : undefined }}>
                        ϕ
                    </span>
                </button>

                {/* Removed Duplicate Settings Dot */}
            </div>
        </div>
    );
};

export default StatePanel;
