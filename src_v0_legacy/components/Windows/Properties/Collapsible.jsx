import React, { useState } from 'react';

/**
 * Collapsible wrapper component for property sections
 * Provides expand/collapse functionality with optional remove button
 */
export default function Collapsible({ label, children, defaultOpen = false, onRemove }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="collapsible-section">
            <div
                className="collapsible-header"
                onClick={() => setIsOpen(!isOpen)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        setIsOpen(!isOpen);
                    }
                }}
            >
                <span className="collapse-icon">{isOpen ? '▼' : '►'}</span>
                <span className="section-label">{label}</span>
                {onRemove && (
                    <button
                        className="remove-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove();
                        }}
                        title="Remove"
                    >
                        ×
                    </button>
                )}
            </div>
            {isOpen && (
                <div className="collapsible-content">
                    {children}
                </div>
            )}
        </div>
    );
}
