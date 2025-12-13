import React from 'react';
import { useGraphStore } from '../../store/graphStore';
import { useWindowStore } from '../../store/windowStore'; // Might need for window logic later

const NOWHeader = ({ node }) => {
    const { exitNOW } = useGraphStore();

    if (!node) return null;

    // Use glyph from component or default
    const glyphChar = node.components?.glyph?.char || '●';

    return (
        <div className="w-full flex items-center justify-between py-4 px-6 border-b border-white/10 bg-[#0A0A0A]">
            {/* Left: Navigation & Identity */}
            <div className="flex items-center gap-4">
                <button
                    onClick={exitNOW}
                    className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    title="Back to Graph"
                >
                    <span className="text-xl">←</span>
                </button>

                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center bg-black/40">
                        <span className="text-[#00FFFF] text-lg">{glyphChar}</span>
                    </div>
                    <div>
                        <h1 className="text-lg font-medium tracking-wide text-white/90">{node.details?.title || 'Untitled Node'}</h1>
                        <div className="text-xs text-white/40 font-mono">{node.type} • {node.id.substring(0, 8)}</div>
                    </div>
                </div>
            </div>

            {/* Right: Window Controls */}
            <div className="flex items-center gap-2">
                <button className="p-2 text-white/40 hover:text-white transition-colors" title="Open as Window">
                    □
                </button>
                <button className="p-2 text-white/40 hover:text-white transition-colors" title="Fullscreen">
                    ⤢
                </button>
            </div>
        </div>
    );
};

export default NOWHeader;
