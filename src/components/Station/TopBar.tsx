import React from 'react';
import OmniInputCollapsed from '../Omni/OmniInputCollapsed';
import coreGlyph from '../../assets/core-glyph.svg';

const TopBar = () => {
    return (
        <div className="topbar-shell justify-between">
            {/* Logo */}
            <div className="flex items-center gap-[var(--primitive-space-bar-gap)] cursor-pointer opacity-85 hover:opacity-100 transition-opacity">
                <div className="w-8 h-8 rounded-full bg-[var(--primitive-color-n0-deepest)] border border-[var(--semantic-color-border-default)] flex items-center justify-center">
                    <img src={coreGlyph} alt="Core" className="w-full h-full block opacity-85" />
                </div>
                <span className="text-[var(--semantic-color-text-primary)]/80 font-medium tracking-wide text-sm">SymbolField</span>
            </div>

            {/* Omni Search */}
            <OmniInputCollapsed
                className="flex-1 max-w-md mx-12"
                inputClassName="block w-full px-4 h-[var(--component-input-height-default)] bg-[var(--semantic-color-bg-surface)]/50 border border-[var(--semantic-color-border-default)] rounded-[var(--primitive-radius-pill)] text-[var(--semantic-color-text-primary)] placeholder-[var(--semantic-color-text-muted)] focus:outline-none focus:bg-[var(--semantic-color-bg-surface)] focus:border-[var(--semantic-color-text-secondary)] transition-all text-sm"
            />

            {/* Account Settings */}
            <button
                onClick={() => import('../../core/events/EventBus').then(({ eventBus }) => eventBus.emit('UI_SIGNAL', { type: 'OPEN_ACCOUNT_SETTINGS', x: 0, y: 0 }))}
                className="w-[var(--component-hit-icon-min)] h-[var(--component-hit-icon-min)] rounded-full bg-[var(--semantic-color-text-primary)]/5 hover:bg-[var(--semantic-color-text-primary)]/10 border border-[var(--semantic-color-border-default)] hover:border-[var(--semantic-color-text-secondary)] flex items-center justify-center text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)] transition-all"
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
