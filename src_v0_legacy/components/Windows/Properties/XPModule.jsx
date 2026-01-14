import React from 'react';
import Collapsible from './Collapsible';

const XP_FIELDS = [
    { key: 'hp', label: 'HP', color: '#8b4513' },
    { key: 'ep', label: 'EP', color: '#4682b4' },
    { key: 'mp', label: 'MP', color: '#dc143c' },
    { key: 'sp', label: 'SP', color: '#90ee90' }
];

/**
 * XP Module - Energy/XP sliders
 */
export default function XPModule({ xp = {}, onChange, onRemove }) {
    const xpSummary = `HP:${xp.hp || 0} EP:${xp.ep || 0} MP:${xp.mp || 0} SP:${xp.sp || 0}`;

    return (
        <Collapsible
            label={
                <span className="collapsible-label-with-value">
                    ENERGY (XP)
                    <span className="current-value-badge">{xpSummary}</span>
                </span>
            }
            defaultOpen={false}
            onRemove={onRemove}
        >
            <div className="xp-controls">
                {XP_FIELDS.map(field => (
                    <div key={field.key} className="xp-row">
                        <label className="xp-label">{field.label}</label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={xp[field.key] || 0}
                            onChange={(e) => onChange?.(field.key, e.target.value)}
                            className="xp-slider"
                            style={{ '--xp-color': field.color }}
                        />
                        <span className="xp-value">{xp[field.key] || 0}</span>
                    </div>
                ))}
            </div>
        </Collapsible>
    );
}
