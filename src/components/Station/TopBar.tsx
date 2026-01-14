import React from 'react';

const TopBar = () => {
    return (
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer opacity-80 hover:opacity-100 transition-opacity">
                <div className="w-6 h-6 rounded-full border border-white/30 flex items-center justify-center text-white/90 font-mono text-[10px]">
                    ◉
                </div>
                <span className="text-white/80 font-medium tracking-wide text-sm">SymbolField</span>
            </div>

            {/* Omni Search */}
            <div className="flex-1 max-w-md mx-12">
                <input
                    type="text"
                    className="block w-full px-4 py-2 bg-white/5 border border-white/10 rounded-full text-white/90 placeholder-white/40 focus:outline-none focus:bg-white/10 focus:border-white/30 transition-all text-sm"
                    placeholder="Search or dive..."
                />
            </div>

            {/* Settings */}
            <button
                onClick={() => import('../../core/events/EventBus').then(({ eventBus }) => eventBus.emit('UI_SIGNAL', { type: 'OPEN_ACCOUNT_SETTINGS', x: 0, y: 0 }))}
                className="text-[10px] text-white/60 hover:text-white/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 rounded px-2 py-1 transition-all uppercase tracking-[0.3em]"
            >
                Settings
            </button>
        </div>
    );
};

export default TopBar;
