import React, { useState } from 'react';

/**
 * Collapsible wrapper component for property sections
 * Provides expand/collapse functionality with optional remove button
 */
export default function Collapsible({ label, children, defaultOpen = false, onRemove }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="collapsible-section">
            <button
                className="collapsible-header"
                onClick={() => setIsOpen(!isOpen)}
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
            </button>
            {isOpen && (
                <div className="collapsible-content">
                    {children}
                </div>
            )}
        </div>
    );
}
