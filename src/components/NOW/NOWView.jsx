import React, { useEffect } from 'react';
import { useGraphStore } from '../../store/graphStore';
import NOWHeader from './NOWHeader';

const NOWView = () => {
    const { activeNodeId, nodes } = useGraphStore();

    // Find the active node data
    const activeNode = nodes.find(n => n.id === activeNodeId);

    if (!activeNode) {
        return (
            <div className="w-full h-full flex items-center justify-center text-white/40">
                Running without context...
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col bg-[#050505] text-white overflow-hidden relative">
            {/* 1. Header */}
            <NOWHeader node={activeNode} />

            {/* 2. Main Scrollable Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <div className="max-w-4xl mx-auto w-full p-8 flex flex-col gap-12">

                    {/* Placeholder: Pulse Strip */}
                    <div className="w-full h-2 rounded bg-gradient-to-r from-transparent via-[#00FFFF]/20 to-transparent" />

                    {/* Placeholder: Time Context */}
                    <div className="p-4 rounded border border-white/5 bg-white/5">
                        <h3 className="text-xs font-mono text-white/50 mb-2 uppercase tracking-wider">Time Context</h3>
                        <div className="h-8 flex gap-1">
                            {[...Array(24)].map((_, i) => (
                                <div key={i} className={`flex-1 rounded-sm ${i === 12 ? 'bg-[#00FFFF]' : 'bg-white/10'}`} />
                            ))}
                        </div>
                    </div>

                    {/* Placeholder: Content Blocks */}
                    <div className="flex flex-col gap-4">
                        <div className="p-6 rounded border border-white/10 min-h-[200px] flex items-center justify-center text-white/20 hover:border-white/20 transition-colors cursor-text">
                            [Content Block: Text / Image / Flow]
                        </div>
                    </div>

                    {/* Placeholder: Subgraph */}
                    <div className="border-t border-white/10 pt-8">
                        <h3 className="text-xs font-mono text-white/50 mb-4 uppercase tracking-wider">Local Subgraph</h3>
                        <div className="h-64 rounded border border-white/5 bg-black/20 flex items-center justify-center">
                            [Subgraph Renderer Placeholder]
                        </div>
                    </div>

                </div>
            </div>

            {/* ChronoCore Placeholder (Top Right) */}
            <div className="absolute top-20 right-8 w-24 h-24 rounded-full border border-white/10 flex items-center justify-center pointer-events-none opacity-50">
                <div className="w-16 h-16 rounded-full border border-[#00FFFF]/30"></div>
            </div>
        </div>
    );
};

export default NOWView;
