import React from 'react';
import { useStateStore, TONES } from '../../store/stateStore';

const WindowChip = ({ window, onRestore, onClose }) => {
    const { toneId, mode } = useStateStore();
    const currentTone = TONES.find(t => t.id === toneId) || TONES[0];
    const activeColor = mode === 'LUMA' ? currentTone.lumaColor : currentTone.color;

    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '140, 195, 205';
    };
    const accentRGB = hexToRgb(activeColor);

    return (
        <div
            className="group relative flex items-center gap-2 px-3 h-8 rounded-full backdrop-blur-md cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
                background: mode === 'LUMA' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
                border: `1px solid rgba(${accentRGB}, 0.2)`,
                boxShadow: `0 0 10px rgba(${accentRGB}, 0.1)`
            }}
            onClick={(e) => {
                e.stopPropagation();
                onRestore(window.id);
            }}
            title={window.title}
        >
            {/* Window Icon/Glyph */}
            <span className="text-xs font-mono" style={{ color: activeColor }}>
                {window.glyph || '□'}
            </span>

            {/* Truncated Title */}
            <span
                className="text-xs font-medium truncate max-w-[100px]"
                style={{ color: mode === 'LUMA' ? '#2A2620' : '#EAEAEA' }}
            >
                {window.title}
            </span>

            {/* Close Button (Visible on Hover) */}
            <button
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{
                    background: mode === 'LUMA' ? '#e5e5e5' : '#333',
                    border: `1px solid rgba(${accentRGB}, 0.3)`
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    onClose(window.id);
                }}
            >
                <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                    <path d="M9 3L3 9M3 3L9 9" stroke={activeColor} strokeWidth="1.5" strokeLinecap="round" />
                </svg>
            </button>
        </div>
    );
};

export default WindowChip;
