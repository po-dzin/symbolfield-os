import React from 'react';
import { useAppStore } from '../../store/useAppStore';

const BrandChip: React.FC = () => {
    const setViewContext = useAppStore(state => state.setViewContext);

    return (
        <button
            onClick={() => setViewContext('home')}
            className="flex items-center gap-[var(--primitive-space-bar-gap)] cursor-pointer opacity-85 hover:opacity-100 transition-opacity"
            aria-label="Return to Station"
        >
            <div className="w-8 h-8 rounded-full bg-[var(--primitive-color-n0-deepest)] border border-[var(--semantic-color-border-default)] flex items-center justify-center">
                {/* TODO: Replace with actual Core glyph SVG */}
                <span className="text-xs">⦿</span>
            </div>
            <span className="text-[var(--semantic-color-text-primary)]/80 font-medium tracking-wide text-sm">
                SymbolField
            </span>
        </button>
    );
};

export default BrandChip;
