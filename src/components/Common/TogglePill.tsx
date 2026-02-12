import React from 'react';

interface TogglePillProps {
    checked: boolean;
    onToggle: () => void;
    className?: string;
}

/**
 * Unified Toggle - Visual-only switch without text labels.
 * Part of the SFOS semiotic-visual brand system.
 * Uses contrast (knob position + background opacity) to indicate state.
 */
const TogglePill = ({
    checked,
    onToggle,
    className = ''
}: TogglePillProps) => {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={onToggle}
            className={`
                relative w-12 h-6 rounded-full border transition-colors duration-[var(--primitive-motion-duration-normal)]
                ${checked
                    ? 'bg-[var(--semantic-color-action-primary)]/20 border-[var(--semantic-color-action-primary)]/45'
                    : 'bg-[var(--semantic-color-bg-surface)]/70 border-[var(--semantic-color-border-default)]'
                }
                ${className}
            `}
        >
            {/* Knob - white circle, position indicates state */}
            <span
                className={`
                    absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-sm
                    transition-all duration-[var(--primitive-motion-duration-normal)]
                    ${checked ? 'right-1' : 'left-1'}
                `}
                style={{ backgroundColor: checked ? 'var(--semantic-color-action-primary)' : 'var(--semantic-color-text-muted)' }}
            />
        </button>
    );
};

export default TogglePill;
