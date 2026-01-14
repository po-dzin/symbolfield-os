import React from 'react';
import { useStateStore } from '../../store/stateStore';

const NOWHeader = ({ node }) => {
    if (!node) return null;
    const { mode } = useStateStore();
    const isLuma = mode === 'LUMA';
    const headerClass = (() => {
        if (isLuma) return 'bg-[#e9ddc6] border-black/10 text-[#2A2620]';
        if (mode === 'FLOW') return 'bg-gradient-to-br from-[#1c1d21] via-[#151619] to-[#0e0f11] border-white/10 text-white';
        return 'bg-[#050505] border-white/10 text-white';
    })();
    const buttonClass = isLuma
        ? 'text-black/40 hover:text-black'
        : 'text-white/40 hover:text-white';

    return (
        <div className={`w-full h-16 flex items-center justify-between px-6 border-b ${headerClass}`}>
            {/* Left: Empty space (title moved to NodeMetadata) */}
            <div className="w-8" />

            {/* Right: Window Controls */}
            <div className="flex items-center gap-2">
                <button className={`p-2 transition-colors ${buttonClass}`} title="Open as Window">
                    □
                </button>
                <button className={`p-2 transition-colors ${buttonClass}`} title="Fullscreen">
                    ⤢
                </button>
            </div>
        </div>
    );
};

export default NOWHeader;
