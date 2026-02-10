import React, { useState } from 'react';

type Props = {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    count?: number;
    icon?: string;
};

const CollapsibleSection: React.FC<Props> = ({ title, children, defaultOpen = true, count: _count, icon: _icon }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="flex flex-col gap-1">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full group text-left focus:outline-none py-1 hover:bg-[var(--semantic-color-bg-surface-hover)] rounded-[var(--primitive-radius-sm)] px-1 -ml-1 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-[var(--semantic-color-text-secondary)] group-hover:text-[var(--semantic-color-text-primary)] transition-colors">{title}</span>
                </div>

                <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`text-[var(--semantic-color-text-muted)] transition-transform duration-200 ${isOpen ? 'rotate-90' : 'rotate-0'}`}
                >
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            </button>

            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
            >
                <div className="pl-2">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default CollapsibleSection;
