import React from 'react';
import { spaceManager } from '../../core/state/SpaceManager';

const StartGates = () => {
    return (
        <div className="flex gap-4">
            <button
                onClick={() => {
                    const id = spaceManager.createSpace();
                    spaceManager.loadSpace(id);
                }}
                className="group flex items-center gap-2 px-4 py-2 rounded-full bg-transparent border border-white/20 hover:bg-white/5 hover:border-white/40 focus-visible:ring-1 focus-visible:ring-white/50 focus-visible:outline-none transition-all"
            >
                <span className="text-base text-white/80 group-hover:text-white transition-colors">+</span>
                <span className="text-white/80 text-xs group-hover:text-white transition-colors">New Space</span>
            </button>

            <button
                className="group flex items-center gap-2 px-4 py-2 rounded-full bg-transparent border border-white/10 hover:bg-white/5 hover:border-white/20 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:outline-none transition-all"
            >
                <span className="text-base text-white/80 group-hover:text-white transition-colors">◎</span>
                <span className="text-white/80 text-xs group-hover:text-white transition-colors">New Portal</span>
            </button>

            <button
                className="group flex items-center gap-2 px-4 py-2 rounded-full bg-transparent border border-white/10 hover:bg-white/5 hover:border-white/20 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:outline-none transition-all"
            >
                <span className="text-base text-white/80 group-hover:text-white transition-colors">↓</span>
                <span className="text-white/80 text-xs group-hover:text-white transition-colors">Import</span>
            </button>
        </div>
    );
};

export default StartGates;
