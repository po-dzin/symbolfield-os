import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import OmniInputCollapsed from '../Omni/OmniInputCollapsed';
import coreGlyph from '../../assets/core-glyph.svg';

const TopBar = () => {
    return (
        <div className="topbar-shell justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer opacity-80 hover:opacity-100 transition-opacity">
                <div className="w-6 h-6 rounded-full flex items-center justify-center">
                    <img src={coreGlyph} alt="Core" className="w-6 h-6 opacity-90" />
                </div>
                <span className="text-white/80 font-medium tracking-wide text-sm">SymbolField</span>
            </div>

            {/* Omni Search */}
            <OmniInputCollapsed
                className="flex-1 max-w-md mx-12"
                inputClassName="block w-full px-4 py-2 bg-white/5 border border-white/10 rounded-full text-white/90 placeholder-white/40 focus:outline-none focus:bg-white/10 focus:border-white/30 transition-all text-sm"
            />

            {/* Account Settings */}
            <button
                onClick={() => import('../../core/events/EventBus').then(({ eventBus }) => eventBus.emit('UI_SIGNAL', { type: 'OPEN_ACCOUNT_SETTINGS', x: 0, y: 0 }))}
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 flex items-center justify-center text-white/60 hover:text-white transition-all"
                title="Account Settings"
                aria-label="Account Settings"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3.5" />
                    <path d="M19 12a7 7 0 0 0-.12-1.3l2.02-1.56-2-3.46-2.44.75a7 7 0 0 0-2.26-1.3L11 2h-4l-.2 2.13a7 7 0 0 0-2.26 1.3l-2.44-.75-2 3.46 2.02 1.56A7 7 0 0 0 5 12a7 7 0 0 0 .12 1.3l-2.02 1.56 2 3.46 2.44-.75a7 7 0 0 0 2.26 1.3L7 22h4l.2-2.13a7 7 0 0 0 2.26-1.3l2.44.75 2-3.46-2.02-1.56A7 7 0 0 0 19 12Z" />
                </svg>
            </button>
        </div>
    );
};

export default TopBar;
