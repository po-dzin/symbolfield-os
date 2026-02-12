import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import coreGlyph from '../../assets/core-glyph.svg';

const GatewayLayout = ({ children }: { children: React.ReactNode }) => {
    const setViewContext = useAppStore(state => state.setViewContext);
    const gatewayRoute = useAppStore(state => state.gatewayRoute);
    const setGatewayRoute = useAppStore(state => state.setGatewayRoute);

    const activeNav = gatewayRoute?.type === 'symbolverse'
        ? 'symbolverse'
        : gatewayRoute?.type === 'atlas'
            ? 'atlas'
            : gatewayRoute?.type === 'portal-builder'
                ? 'builder'
            : 'portals';

    return (
        <div className="h-screen overflow-hidden bg-[var(--semantic-color-bg-canvas)] text-[var(--semantic-color-text-primary)] font-sans">
            {/* Public TopBar */}
            <div className="topbar-shell justify-between px-6">

                {/* Left: Brand / Return */}
                <div
                    className="relative z-[2] flex items-center gap-3 cursor-pointer group"
                    onClick={() => {
                        setGatewayRoute({ type: 'symbolverse' });
                        setViewContext('gateway');
                    }}
                >
                    <div className="w-8 h-8 rounded-full bg-[var(--primitive-color-n0-deepest)] border border-[var(--semantic-color-border-default)] flex items-center justify-center group-hover:scale-105 transition-transform">
                        <img src={coreGlyph} alt="Core" className="w-full h-full block opacity-85" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium tracking-wide">Symbolverse</span>
                        <span className="text-[10px] uppercase tracking-wider text-[var(--semantic-color-text-muted)]">Platform Gateway</span>
                    </div>
                </div>

                {/* Center: Platform Navigation */}
                <div className="relative z-[2] hidden md:flex items-center gap-2 text-sm">
                    <button
                        type="button"
                        onClick={() => {
                            setGatewayRoute({ type: 'symbolverse' });
                            setViewContext('gateway');
                        }}
                        data-state={activeNav === 'symbolverse' ? 'active' : 'inactive'}
                        className="ui-selectable px-3 py-1.5 rounded-[var(--primitive-radius-pill)] text-[var(--semantic-color-text-secondary)]"
                    >
                        Symbolverse
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setGatewayRoute({ type: 'atlas' });
                            setViewContext('gateway');
                        }}
                        data-state={activeNav === 'atlas' ? 'active' : 'inactive'}
                        className="ui-selectable px-3 py-1.5 rounded-[var(--primitive-radius-pill)] text-[var(--semantic-color-text-secondary)]"
                    >
                        Atlas
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setGatewayRoute({ type: 'brand', slug: 'symbolfield' });
                            setViewContext('gateway');
                        }}
                        data-state={activeNav === 'portals' ? 'active' : 'inactive'}
                        className="ui-selectable px-3 py-1.5 rounded-[var(--primitive-radius-pill)] text-[var(--semantic-color-text-secondary)]"
                    >
                        Portals
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setGatewayRoute({ type: 'portal-builder', slug: 'symbolfield' });
                            setViewContext('gateway');
                        }}
                        data-state={activeNav === 'builder' ? 'active' : 'inactive'}
                        className="ui-selectable px-3 py-1.5 rounded-[var(--primitive-radius-pill)] text-[var(--semantic-color-text-secondary)]"
                    >
                        Builder
                    </button>
                </div>

                {/* Right: User Actions */}
                <button
                    onClick={() => setViewContext('home')}
                    className="relative z-[2] ui-selectable ui-shape-pill px-4 py-1.5 border border-[var(--semantic-color-border-default)] text-xs font-medium"
                >
                    Enter Station
                </button>
            </div>

            {/* Scrollable content area under fixed topbar */}
            <div className="mt-[var(--component-topbar-height)] h-[calc(100vh-var(--component-topbar-height))] overflow-y-auto overflow-x-hidden">
                {children}
            </div>
        </div>
    );
};

export default GatewayLayout;
