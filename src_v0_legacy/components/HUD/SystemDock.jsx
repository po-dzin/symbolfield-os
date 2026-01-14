import React from 'react';
import { useWindowStore } from '../../store/windowStore';
import { useStateStore, TONES } from '../../store/stateStore';
import WindowChip from './WindowChip';
import TimeChip from './TimeChip';

const SystemDock = ({ timeWindow, onScaleChange, onOpenCalendar }) => {
    const { windows, restoreWindow, closeWindow } = useWindowStore();
    const { toneId, mode } = useStateStore();
    const currentTone = TONES.find(t => t.id === toneId) || TONES[0];
    const activeColor = mode === 'LUMA' ? currentTone.lumaColor : currentTone.color;

    // Convert hex to RGB
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '140, 195, 205';
    };
    const accentRGB = hexToRgb(activeColor);

    const minimizedWindows = Object.values(windows).filter(w => w.isMinimized);

    return (
        <div
            className="w-full h-[72px] flex items-center justify-between px-6 relative z-[var(--z-windows)]"
            style={{
                borderTop: `1px solid rgba(${accentRGB}, 0.1)`
            }}
        >
            {/* Dock Background Blur */}
            <div className="absolute inset-0 bg-os-glass/5 backdrop-blur-sm -z-10" />

            {/* Minimized Windows List */}
            <div className="flex items-center gap-4">
                {minimizedWindows.length === 0 ? (
                    <div className="text-os-text-meta text-xs tracking-widest opacity-50">
                        SYSTEM DOCK
                    </div>
                ) : (
                    minimizedWindows.map(win => (
                        <WindowChip
                            key={win.id}
                            window={win}
                            onRestore={restoreWindow}
                            onClose={closeWindow}
                        />
                    ))
                )}
            </div>

            {/* TimeChip (Right Side) */}
            <TimeChip
                timeWindow={timeWindow}
                onScaleChange={onScaleChange}
                onOpenCalendar={onOpenCalendar}
            />
        </div>
    );
};

export default SystemDock;
