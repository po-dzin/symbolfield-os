import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { spaceManager } from '../../core/state/SpaceManager';

const StartGates = () => {
    const setViewContext = useAppStore(state => state.setViewContext);

    return (
        <div className="flex gap-4 items-center">
            <button
                onClick={() => {
                    const id = spaceManager.createSpace();
                    spaceManager.loadSpace(id);
                }}
                className="group flex items-center gap-3 px-5 py-3 rounded-[var(--primitive-radius-pill)] bg-[var(--semantic-color-bg-surface)]/40 backdrop-blur-xl border border-[var(--semantic-color-border-default)]/50 hover:bg-[var(--semantic-color-bg-surface)]/80 hover:border-[var(--semantic-color-text-primary)]/30 transition-all shadow-lg shadow-black/10"
            >
                <span className="text-lg text-[var(--semantic-color-text-secondary)] group-hover:text-[var(--semantic-color-text-primary)] transition-colors">+</span>
                <span className="text-[var(--semantic-color-text-secondary)] text-sm font-medium group-hover:text-[var(--semantic-color-text-primary)] transition-colors">New Space</span>
            </button>

            <button
                className="group flex items-center gap-3 px-5 py-3 rounded-[var(--primitive-radius-pill)] bg-[var(--semantic-color-bg-surface)]/40 backdrop-blur-xl border border-[var(--semantic-color-border-default)]/50 hover:bg-[var(--semantic-color-bg-surface)]/80 hover:border-[var(--semantic-color-text-primary)]/30 transition-all shadow-lg shadow-black/10"
            >
                <span className="text-lg text-[var(--semantic-color-text-secondary)] group-hover:text-[var(--semantic-color-text-primary)] transition-colors">◎</span>
                <span className="text-[var(--semantic-color-text-secondary)] text-sm font-medium group-hover:text-[var(--semantic-color-text-primary)] transition-colors">New Portal</span>
            </button>

            <button
                className="group flex items-center gap-3 px-5 py-3 rounded-[var(--primitive-radius-pill)] bg-[var(--semantic-color-bg-surface)]/40 backdrop-blur-xl border border-[var(--semantic-color-border-default)]/50 hover:bg-[var(--semantic-color-bg-surface)]/80 hover:border-[var(--semantic-color-text-primary)]/30 transition-all shadow-lg shadow-black/10"
            >
                <span className="text-lg text-[var(--semantic-color-text-secondary)] group-hover:text-[var(--semantic-color-text-primary)] transition-colors">↓</span>
                <span className="text-[var(--semantic-color-text-secondary)] text-sm font-medium group-hover:text-[var(--semantic-color-text-primary)] transition-colors">Import</span>
            </button>

            <div className="w-px h-8 bg-[var(--semantic-color-border-default)] mx-2 opacity-50" />

            <button
                onClick={() => setViewContext('gateway')}
                className="group flex items-center gap-3 px-5 py-3 rounded-[var(--primitive-radius-pill)] bg-[var(--semantic-color-bg-surface)]/40 backdrop-blur-xl border border-[var(--semantic-color-border-default)]/50 hover:bg-[var(--semantic-color-bg-surface)]/80 hover:border-[var(--semantic-color-text-primary)]/30 transition-all shadow-lg shadow-black/10"
            >
                <span className="text-lg group-hover:scale-110 transition-transform">🔭</span>
                <span className="text-[var(--semantic-color-text-secondary)] text-sm font-medium group-hover:text-[var(--semantic-color-text-primary)] transition-colors">Explore Gateway</span>
            </button>
        </div>
    );
};

export default StartGates;
