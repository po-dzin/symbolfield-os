import React from 'react';
import { useStateStore, TONES } from '../../store/stateStore';
import { TIME_SCALES, nextTimeScale, formatTimeWindow as formatTW } from '../../utils/temporal';

const TimeChip = ({ timeWindow, onScaleChange, onOpenCalendar }) => {
    const [isExpanded, setIsExpanded] = React.useState(false);
    const { toneId, mode } = useStateStore();
    const currentTone = TONES.find(t => t.id === toneId) || TONES[0];
    const activeColor = mode === 'LUMA' ? currentTone.lumaColor : currentTone.color;

    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '140, 195, 205';
    };
    const accentRGB = hexToRgb(activeColor);

    const handleCycleScale = (e) => {
        e.stopPropagation();
        const next = nextTimeScale(timeWindow.kind);
        onScaleChange(next);
    };

    const handleOpenCalendar = (e) => {
        e.stopPropagation();
        onOpenCalendar();
    };

    const formatDisplay = () => {
        if (!timeWindow) return 'N/A';

        if (timeWindow.kind === 'DAY') {
            // Show time and date for DAY mode: HH:MM DD/MM/YYYY
            const now = new Date();
            const time = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
            return `${time} ${day}/${month}/${year}`;
        }

        return formatTW(timeWindow);
    };

    return (
        <div
            className="flex items-center gap-6 backdrop-blur-xl cursor-default pointer-events-auto"
            style={{
                background: 'transparent'
            }}
        >
            {/* NOW Anchor - 4U (32px) */}
            <div
                className="w-8 h-8 rounded-full flex items-center justify-center relative"
                title="Present Moment"
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
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: activeColor, opacity: 0.9 }} />
            </div>

            {/* Scale Button */}
            <button
                onClick={handleCycleScale}
                className={`flex flex-col items-start justify-center w-[144px] transition-all duration-300 cursor-pointer ${mode === 'LUMA' ? 'hover:opacity-70' : 'hover:opacity-80'}`}
                title={`Current: ${timeWindow.kind}. Click to cycle.`}
            >
                <span className="text-base font-bold tracking-widest" style={{ color: activeColor }}>
                    {timeWindow.kind}
                </span>
                <span className="text-xs uppercase opacity-60 truncate w-full text-left" style={{ color: mode === 'LUMA' ? '#5b5349' : 'var(--text-secondary)' }}>
                    {formatDisplay()}
                </span>
            </button>

            {/* Calendar Dropdown - 5U (40px) */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                    onOpenCalendar();
                }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer ${mode === 'LUMA' ? 'hover:bg-black/5' : 'hover:bg-white/5'}`}
                title="Open Calendar"
            >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" className={`text-os-text-secondary transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    <path d="M18 15l-6-6-6 6" />
                </svg>
            </button>
        </div>
    );
};

export default TimeChip;
