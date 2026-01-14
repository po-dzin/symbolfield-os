import React, { useState } from 'react';

const COMPONENT_TYPES = [
    { id: 'glyph', label: 'Glyph', icon: '◉' },
    { id: 'tone', label: 'Tone', icon: '🎨' },
    { id: 'xp', label: 'XP', icon: '⚡' },
    { id: 'temporal', label: 'Temporal', icon: '⏰' },
    { id: 'tags', label: 'Tags', icon: '🏷️' },
    { id: 'notes', label: 'Notes', icon: '📝' },
    { id: 'media', label: 'Media', icon: '🎬' },
    { id: 'code', label: 'Code Block', icon: '💻' },
    { id: 'ritual', label: 'Ritual Pattern', icon: '🔮' },
    { id: 'agent', label: 'AI-Agent Hook', icon: '🤖' }
];

/**
 * Advanced Components - Add component menu
 */
export default function AdvancedComponents({ node, onAdd }) {
    const [showMenu, setShowMenu] = useState(false);

    const availableTypes = COMPONENT_TYPES.filter(type => {
        // Component is available if it doesn't exist OR is null
        return !node.components?.[type.id] || node.components[type.id] === null;
    });

    const handleAdd = (typeId) => {
        onAdd?.(typeId);
        setShowMenu(false);
    };

    return (
        <div className="advanced-components">
            <button
                className="add-component-btn"
                onClick={() => setShowMenu(!showMenu)}
            >
                + Add Component
            </button>

            {showMenu && (
                <div className="component-menu">
                    {availableTypes.map(type => (
                        <button
                            key={type.id}
                            className="component-menu-item"
                            onClick={() => handleAdd(type.id)}
                        >
                            <span className="component-icon">{type.icon}</span>
                            <span className="component-label">{type.label}</span>
                        </button>
                    ))}
                    {availableTypes.length === 0 && (
                        <div className="no-components">All components added</div>
                    )}
                </div>
            )}
        </div>
    );
}
