import Draggable from 'react-draggable';
import { useRef } from 'react';
import { useWindowStore } from '../../store/windowStore';
import { useStateStore, TONES } from '../../store/stateStore';

const XpSummaryPanel = () => {
    const { xpState } = useWindowStore();
    const { toneId, mode } = useStateStore();
    const currentTone = TONES.find(t => t.id === toneId) || TONES[0];
    const activeColor = mode === 'LUMA' ? currentTone.lumaColor : currentTone.color;
    const { hp, ep, mp, sp, np } = xpState;
    const nodeRef = useRef(null);

    // Convert hex to RGB
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '140, 195, 205';
    };
    const accentRGB = hexToRgb(activeColor);

    return (
        <Draggable nodeRef={nodeRef} handle=".xp-handle">
            <div ref={nodeRef} className="absolute top-[120px] left-[120px] flex flex-col items-start gap-2 pointer-events-auto">
                {/* Panel Container */}
                <div
                    className="backdrop-blur-xl px-5 w-auto h-[72px] flex items-center justify-center xp-handle cursor-grab active:cursor-grabbing"
                    style={{
                        background: 'var(--surface-1-bg)',
                        border: `var(--panel-stroke-width) solid rgba(${accentRGB}, 0.35)`,
                        borderRadius: 'var(--panel-radius)',
                        boxShadow: `0 0 20px rgba(${accentRGB}, 0.22)`,
                        animation: 'pulse-glow-smooth 8s ease-in-out infinite',
                        '--glow-color': `${activeColor}60`
                    }}
                >
                    {/* Circular XP Items */}
                    <div className="flex gap-3 flex-wrap justify-center">
                        {[
                            { label: 'HP', fullName: 'Health Points', value: hp, emoji: '🪨', color: mode === 'LUMA' ? '#a85645' : '#cd8475' },
                            { label: 'EP', fullName: 'Energy Points', value: ep, emoji: '💧', color: mode === 'LUMA' ? '#9c7b4f' : '#cdab75' },
                            { label: 'MP', fullName: 'Mind Points', value: mp, emoji: '🔥', color: mode === 'LUMA' ? '#4f9c4f' : '#75cd75' },
                            { label: 'SP', fullName: 'Spirit Points', value: sp, emoji: '🌬️', color: mode === 'LUMA' ? '#328a8a' : '#75cdcd' },
                            { label: 'NP', fullName: 'Nothing Points', value: np, emoji: '🌈', color: mode === 'LUMA' ? '#6a4f9c' : '#8e75cd' }
                        ].map(item => (
                            <div key={item.label} className="flex flex-col items-center gap-0.5" title={`${item.label} // ${item.fullName}`}>
                                <div
                                    className="flex items-center justify-center w-10 h-10 rounded-full text-base"
                                    style={{
                                        background: `rgba(${accentRGB}, 0.1)`,
                                        border: `2px solid ${item.color}`,
                                        color: item.color
                                    }}
                                >
                                    {item.emoji}
                                </div>
                                <span className="text-xs font-mono" style={{ color: item.color }}>{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Draggable>
    );
};

const XpRow = ({ label, value, icon, color }) => {
    const tooltips = {
        'HP': 'Health Points',
        'EP': 'Energy Points',
        'MP': 'Mind Points',
        'SP': 'Spirit Points',
        'NP': 'Nothing Points'
    };

    return (
        <div className="flex items-center justify-between group" title={tooltips[label]}>
            <div className="flex items-center gap-2 text-os-text-secondary group-hover:text-os-text-primary transition-colors">
                <span className="opacity-60 grayscale group-hover:grayscale-0 transition-all duration-300">{icon}</span>
                <span className="text-xs font-medium">{label}</span>
            </div>
            <span className="text-xs font-mono font-bold" style={{ color: color }}>
                {value}
            </span>
        </div>
    );
};

export default XpSummaryPanel;
