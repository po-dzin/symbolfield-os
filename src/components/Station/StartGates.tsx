import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { spaceManager } from '../../core/state/SpaceManager';

const StartGates = () => {
    const setViewContext = useAppStore(state => state.setViewContext);
    const setGatewayRoute = useAppStore(state => state.setGatewayRoute);
    const gateClassName = 'ui-selectable group inline-flex items-center gap-3 h-12 px-6 rounded-[var(--primitive-radius-pill)] bg-[var(--semantic-color-bg-surface)]/40 backdrop-blur-xl border border-[var(--semantic-color-border-default)]/60 transition-all shadow-lg shadow-black/10 hover:bg-[var(--semantic-color-bg-surface)]/80 hover:border-[var(--semantic-color-text-primary)]/30';
    const iconClassName = 'w-5 h-5 flex items-center justify-center text-[var(--semantic-color-text-secondary)] group-hover:text-[var(--semantic-color-text-primary)] transition-colors';
    const labelClassName = 'text-[var(--semantic-color-text-secondary)] text-sm font-medium group-hover:text-[var(--semantic-color-text-primary)] transition-colors';

    return (
        <div className="flex flex-wrap items-center justify-center gap-3">
            <button
                onClick={() => {
                    const id = spaceManager.createSpace();
                    spaceManager.loadSpace(id);
                }}
                className={gateClassName}
            >
                <span className={iconClassName}>+</span>
                <span className={labelClassName}>New Space</span>
            </button>

            <button
                className={gateClassName}
            >
                <span className={iconClassName}>◎</span>
                <span className={labelClassName}>New Portal</span>
            </button>

            <button
                className={gateClassName}
            >
                <span className={iconClassName}>↓</span>
                <span className={labelClassName}>Import</span>
            </button>

            <button
                onClick={() => {
                    setGatewayRoute({ type: 'atlas' });
                    setViewContext('gateway');
                }}
                className={gateClassName}
            >
                <span className={iconClassName}>↗</span>
                <span className={labelClassName}>Explore</span>
            </button>

            <button
                onClick={() => {
                    setGatewayRoute({ type: 'portal-builder', slug: 'symbolfield' });
                    setViewContext('gateway');
                }}
                className={gateClassName}
            >
                <span className={iconClassName}>◈</span>
                <span className={labelClassName}>Portal Builder</span>
            </button>
        </div>
    );
};

export default StartGates;
