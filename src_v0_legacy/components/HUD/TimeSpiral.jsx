import React, { useEffect, useState } from 'react';
import { useWindowStore } from '../../store/windowStore';
import { useStateStore, TONES } from '../../store/stateStore';

const TIME_SCALES = [
    { id: 'DAY', label: 'Day', desc: 'Daily Rituals' },
    { id: 'WEEK', label: 'Week', desc: 'Weekly Focus' },
    { id: 'MONTH', label: 'Month', desc: 'Lunar Cycle' },
    { id: 'YEAR', label: 'Year', desc: 'Solar Orbit' }
];

const TimeSpiral = () => {
    const { activeTab } = useWindowStore();
    const { toneId, mode, timeScale, setTimeScale } = useStateStore();
    const currentTone = TONES.find(t => t.id === toneId) || TONES[0];
    const activeColor = mode === 'LUMA' ? currentTone.lumaColor : currentTone.color;

    const [expanded, setExpanded] = useState(false);
    const [breath, setBreath] = useState(0);

    // Convert hex to RGB
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '140, 195, 205';
    };
    const accentRGB = hexToRgb(activeColor);

    // Breath Cycle Animation (Syncs with Mode)
    useEffect(() => {
        let start = Date.now();
        const period = mode === 'DEEP' ? 5000 : mode === 'LUMA' ? 4000 : 4500;

        const animate = () => {
            const now = Date.now();
            const elapsed = (now - start) / period;
            const phase = Math.sin(elapsed * Math.PI * 2);
            const normalized = (phase + 1) / 2;
            setBreath(normalized);
            requestAnimationFrame(animate);
        };
        const id = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(id);
    }, [mode]);

    // TimeSpiral always visible (removed activeTab guard)

    return (
        <div className="h-full w-full flex items-center justify-center pointer-events-auto px-6">
            <div
                className={`
                    relative backdrop-blur-xl transition-all duration-500 ease-out flex items-center justify-between cursor-default
                    ${expanded ? 'h-[400px] w-[140px] p-4 flex-col' : 'h-[72px] w-[280px] px-6'}
                `}
                style={{
                    background: 'var(--surface-1-bg)',
                    borderLeft: `var(--panel-stroke-width) solid rgba(${accentRGB}, 0.35)`,
                    boxShadow: `0 0 20px rgba(${accentRGB}, 0.22)`,
                    animation: 'pulse-glow-smooth 8s ease-in-out infinite',
                    '--glow-color': `${activeColor}60`
                }}
            >
                {/* Collapsed Content */}
                {!expanded && (
                    <>
                        <div className="flex items-center gap-3">
                            <div
                                className="w-7 h-7 rounded-full flex items-center justify-center relative"
                                title="Present Moment Anchor"
                                style={mode === 'LUMA' ? {
                                    background: `radial-gradient(circle, rgba(${accentRGB}, 0.25) 0%, rgba(250,245,235,0.9) 70%)`,
                                    border: `1.4px solid rgba(${accentRGB}, 0.65)`,
                                    boxShadow: `0 0 12px rgba(${accentRGB}, 0.35)`,
                                    animation: 'softBreath 4.5s ease-in-out infinite'
                                } : {
                                    background: `radial-gradient(circle, rgba(${accentRGB}, 0.18) 0%, rgba(0,0,0,0.85) 70%)`,
                                    border: `1.4px solid rgba(${accentRGB}, 0.9)`,
                                    boxShadow: `0 0 10px rgba(${accentRGB}, 0.5)`,
                                    animation: 'softBreath 4.5s ease-in-out infinite'
                                }}
                            >
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeColor, opacity: 0.9 }} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold tracking-widest" style={{ color: activeColor }}>NOW</span>
                                <span className="text-[10px] uppercase opacity-60" style={{ color: mode === 'LUMA' ? '#5b5349' : 'var(--text-secondary)' }}>{timeScale}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setExpanded(true)}
                            className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center text-os-text-secondary hover:text-os-text-primary transition-colors cursor-pointer"
                        >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 15l-6-6-6 6" />
                            </svg>
                        </button>
                    </>
                )}

                {/* Expanded Content */}
                {expanded && (
                    <>
                        {/* Header */}
                        <div className="w-full flex items-center justify-between mb-4 px-2">
                            <span className="text-[10px] font-bold tracking-widest text-os-text-secondary">TIME SCALE</span>
                            <button
                                onClick={() => setExpanded(false)}
                                className="w-6 h-6 rounded-full hover:bg-white/5 flex items-center justify-center text-os-text-secondary hover:text-os-text-primary cursor-pointer"
                            >
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M6 9l6 6 6-6" />
                                </svg>
                            </button>
                        </div>

                        {/* Scale Selector */}
                        <div className="w-full flex items-center justify-between bg-black/10 rounded-xl p-1">
                            {TIME_SCALES.map(scale => {
                                const isActive = timeScale === scale.id;
                                return (
                                    <button
                                        key={scale.id}
                                        onClick={() => setTimeScale(scale.id)}
                                        className={`
                                            flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-300 cursor-pointer
                                            ${isActive ? 'bg-white/10 text-white' : 'text-os-text-secondary hover:text-os-text-primary hover:bg-white/5'}
                                        `}
                                        style={isActive ? {
                                            textShadow: `0 0 10px ${activeColor}`,
                                            boxShadow: `0 0 10px ${activeColor}10`
                                        } : {}}
                                    >
                                        {scale.id}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Description */}
                        <div className="mt-3 text-[10px] text-center text-os-text-meta">
                            {TIME_SCALES.find(t => t.id === timeScale)?.desc}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default TimeSpiral;
