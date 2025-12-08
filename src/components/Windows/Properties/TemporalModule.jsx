import React from 'react';
import Collapsible from './Collapsible';

const TEMPORAL_SCALES = [
    { id: 'day', label: 'Day' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'year', label: 'Year' },
    { id: '3y', label: '3 Years' },
    { id: '7y', label: '7 Years' },
    { id: '12y', label: '12 Years' }
];

/**
 * Temporal Module - Time scale selector
 */
export default function TemporalModule({ scale = 'day', onChange, onRemove }) {
    const currentScale = TEMPORAL_SCALES.find(s => s.id === scale);

    return (
        <Collapsible
            label={
                <span className="collapsible-label-with-value">
                    TIME
                    <span className="current-value-badge">{currentScale?.label || 'Day'}</span>
                </span>
            }
            defaultOpen={false}
            onRemove={onRemove}
        >
            <div className="temporal-module">
                <label className="temporal-label">Temporal Scale:</label>
                <select
                    className="temporal-select"
                    value={scale}
                    onChange={(e) => onChange?.(e.target.value)}
                >
                    {TEMPORAL_SCALES.map(s => (
                        <option key={s.id} value={s.id}>
                            {s.label}
                        </option>
                    ))}
                </select>
            </div>
        </Collapsible>
    );
}

export { TEMPORAL_SCALES };
