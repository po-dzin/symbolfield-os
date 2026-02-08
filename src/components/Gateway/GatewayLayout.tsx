import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import coreGlyph from '../../assets/core-glyph.svg';

const GatewayLayout = ({ children }: { children: React.ReactNode }) => {
    const setViewContext = useAppStore(state => state.setViewContext);

    return (
        <div className="min-h-screen bg-[var(--semantic-color-bg-canvas)] text-[var(--semantic-color-text-primary)] font-sans">
            {/* Public TopBar */}
            <div className="fixed top-0 left-0 right-0 h-[var(--component-topbar-height)] border-b border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-app)]/80 backdrop-blur-md z-50 flex items-center justify-between px-6">

                {/* Left: Brand / Return */}
                <div
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => setViewContext('home')}
                >
                    <div className="w-8 h-8 rounded-full bg-[var(--primitive-color-n0-deepest)] border border-[var(--semantic-color-border-default)] flex items-center justify-center group-hover:scale-105 transition-transform">
                        <img src={coreGlyph} alt="Core" className="w-full h-full block opacity-85" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium tracking-wide">SymbolField</span>
                        <span className="text-[10px] uppercase tracking-wider text-[var(--semantic-color-text-muted)]">Public Gateway</span>
                    </div>
                </div>

                {/* Center: Search/Nav (Placeholder) */}
                <div className="hidden md:flex items-center gap-6 text-sm text-[var(--semantic-color-text-secondary)]">
                    <span className="hover:text-[var(--semantic-color-text-primary)] cursor-pointer transition-colors">Discover</span>
                    <span className="hover:text-[var(--semantic-color-text-primary)] cursor-pointer transition-colors">Creators</span>
                    <span className="hover:text-[var(--semantic-color-text-primary)] cursor-pointer transition-colors">Collections</span>
                </div>

                {/* Right: User Actions */}
                <button
                    onClick={() => setViewContext('home')}
                    className="px-4 py-1.5 rounded-full border border-[var(--semantic-color-border-default)] text-xs font-medium hover:bg-[var(--semantic-color-text-primary)] hover:text-[var(--semantic-color-bg-canvas)] transition-all"
                >
                    Log In / Sign Up
                </button>
            </div>

            {/* Content Padding for TopBar */}
            <div className="pt-[var(--component-topbar-height)] h-full">
                {children}
            </div>
        </div>
    );
};

export default GatewayLayout;
