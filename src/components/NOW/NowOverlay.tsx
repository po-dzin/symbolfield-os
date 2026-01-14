/**
 * NowOverlay.jsx
 * Fullscreen "NOW" view (Node Interior).
 * Activated by entering "Dive" (NOW) mode.
 */

import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useGraphStore } from '../../store/useGraphStore';

const NowOverlay = () => {
    const viewContext = useAppStore(state => state.viewContext);
    const activeScope = useAppStore(state => state.activeScope);
    const exitNow = useAppStore(state => state.exitNow);
    const nodes = useGraphStore(state => state.nodes);

    if (viewContext !== 'now' || !activeScope) return null;

    const node = nodes.find(n => n.id === activeScope);
    if (!node) return null; // Should ideally exit if node not found

    const nodeLabel = typeof node.data?.label === 'string' ? node.data.label : 'Untitled Node';

    return (
        <div className="absolute inset-0 z-[var(--z-overlay)] bg-os-dark/95 backdrop-blur-xl animate-fade-scale flex flex-col" data-overlay="now">
            {/* NOW Header */}
            <div className="h-[14.6vh] flex items-center justify-between px-8 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={exitNow}
                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-secondary"
                    >
                        ←
                    </button>

                    <div className="flex flex-col">
                        <span className="text-xs uppercase tracking-widest text-text-meta">Now Focus</span>
                        <h1 className="text-2xl font-light tracking-wide text-text-primary">
                            {nodeLabel}
                        </h1>
                    </div>
                </div>

                {/* Right Area (Metas) */}
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-xs text-text-meta uppercase">XP Gain</div>
                        <div className="text-lg font-mono text-emerald-400">+0</div>
                    </div>
                </div>
            </div>

            {/* NOW Body (Content) */}
            <div className="flex-1 overflow-auto p-12 max-w-4xl mx-auto w-full">
                {/* Mock Content Blocks */}
                <div className="prose prose-invert lg:prose-xl">
                    <p className="text-text-secondary text-lg leading-relaxed">
                        This is the interior of <strong>{nodeLabel}</strong>.
                    </p>
                    <div className="p-6 border border-dashed border-white/20 rounded-xl bg-white/5 mt-8 flex items-center justify-center h-64 text-text-meta">
                        Content Blocks Area (Text, Canvas, Audio)
                    </div>
                </div>
            </div>

        </div>
    );
};

export default NowOverlay;
