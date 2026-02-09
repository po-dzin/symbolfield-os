import React from 'react';

interface ToggleSwitchProps {
    checked: boolean;
    onToggle: () => void;
    className?: string;
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
}

/**
 * Unified Toggle Switch using semantic design tokens.
 * Part of the SFOS semiotic-visual brand system.
 */
const ToggleSwitch = ({
    checked,
    onToggle,
    className = '',
    size = 'md'
}: ToggleSwitchProps) => {
    const sizeClasses = {
        sm: 'w-8 h-5',
        md: 'w-10 h-6',
        lg: 'w-12 h-7'
    };

    const knobSizeClasses = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5'
    };

    const translateClasses = {
        sm: 'translate-x-3',
        md: 'translate-x-4',
        lg: 'translate-x-5'
    };

    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={onToggle}
            className={`
                relative rounded-full transition-colors duration-[var(--primitive-motion-duration-normal)]
                focus:outline-none focus:ring-1 focus:ring-[var(--semantic-color-action-primary)]/30
                ${sizeClasses[size]}
                ${checked
                    ? 'bg-[var(--semantic-color-action-primary)]/20 border border-[var(--semantic-color-action-primary)]/50'
                    : 'bg-[var(--semantic-color-bg-surface)] border border-[var(--semantic-color-border-default)]'
                }
                ${className}
            `}
        >
            <span
                className={`
                    absolute top-1/2 -translate-y-1/2 left-1 rounded-full shadow-sm 
                    transition-all duration-[var(--primitive-motion-duration-normal)]
                    ${knobSizeClasses[size]}
                    ${checked
                        ? `${translateClasses[size]} bg-[var(--semantic-color-action-primary)]`
                        : 'translate-x-0 bg-[var(--semantic-color-text-muted)]'
                    }
                `}
            />
        </button>
    );
};

export default ToggleSwitch;
