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
                className="group flex items-center gap-2 px-4 py-2 rounded-[var(--primitive-radius-pill)] bg-transparent border border-[var(--semantic-color-border-default)] hover:bg-[var(--semantic-color-text-primary)]/5 hover:border-[var(--semantic-color-text-primary)]/30 focus-visible:ring-1 focus-visible:ring-[var(--semantic-color-text-primary)]/50 focus-visible:outline-none transition-all"
            >
                <span className="text-base text-[var(--semantic-color-text-secondary)] group-hover:text-[var(--semantic-color-text-primary)] transition-colors">+</span>
                <span className="text-[var(--semantic-color-text-secondary)] text-xs group-hover:text-[var(--semantic-color-text-primary)] transition-colors">New Space</span>
            </button>

            <button
                className="group flex items-center gap-2 px-4 py-2 rounded-[var(--primitive-radius-pill)] bg-transparent border border-[var(--semantic-color-border-default)]/50 hover:bg-[var(--semantic-color-text-primary)]/5 hover:border-[var(--semantic-color-text-primary)]/20 focus-visible:ring-1 focus-visible:ring-[var(--semantic-color-text-primary)]/30 focus-visible:outline-none transition-all"
            >
                <span className="text-base text-[var(--semantic-color-text-secondary)] group-hover:text-[var(--semantic-color-text-primary)] transition-colors">◎</span>
                <span className="text-[var(--semantic-color-text-secondary)] text-xs group-hover:text-[var(--semantic-color-text-primary)] transition-colors">New Portal</span>
            </button>

            <button
                className="group flex items-center gap-2 px-4 py-2 rounded-[var(--primitive-radius-pill)] bg-transparent border border-[var(--semantic-color-border-default)]/50 hover:bg-[var(--semantic-color-text-primary)]/5 hover:border-[var(--semantic-color-text-primary)]/20 focus-visible:ring-1 focus-visible:ring-[var(--semantic-color-text-primary)]/30 focus-visible:outline-none transition-all"
            >
                <span className="text-base text-[var(--semantic-color-text-secondary)] group-hover:text-[var(--semantic-color-text-primary)] transition-colors">↓</span>
                <span className="text-[var(--semantic-color-text-secondary)] text-xs group-hover:text-[var(--semantic-color-text-primary)] transition-colors">Import</span>
            </button>
        </div>
    );
};

export default StartGates;
