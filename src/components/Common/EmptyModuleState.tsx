import React from 'react';

interface EmptyModuleStateProps {
    icon: string;
    label: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

const EmptyModuleState: React.FC<EmptyModuleStateProps> = ({ icon, label, description, action }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in select-none">
            <div className="w-24 h-24 rounded-full bg-[var(--semantic-color-bg-surface-hover)] border border-[var(--semantic-color-border-subtle)] flex items-center justify-center mb-6 shadow-xl shadow-black/5">
                <span className="text-4xl filter drop-shadow-md opacity-80 grayscale-[0.2]">{icon}</span>
            </div>

            <h3 className="text-xl font-light tracking-tight text-[var(--semantic-color-text-primary)] mb-2">
                {label}
            </h3>

            {description && (
                <p className="text-sm text-[var(--semantic-color-text-muted)] max-w-[240px] leading-relaxed mb-8">
                    {description}
                </p>
            )}

            {action && (
                <button
                    onClick={action.onClick}
                    className="px-4 py-2 rounded-[var(--primitive-radius-pill)] border border-[var(--semantic-color-border-default)] text-[var(--semantic-color-text-secondary)] text-xs uppercase tracking-widest hover:bg-[var(--semantic-color-bg-surface-hover)] hover:text-[var(--semantic-color-text-primary)] transition-all hover:scale-105 active:scale-95"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
};

export default EmptyModuleState;
