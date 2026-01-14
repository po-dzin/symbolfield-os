import React from 'react';
import Collapsible from './Collapsible';
import { GLYPHS, TONES } from '../../../store/stateStore';

/**
 * Glyph + Tone Module - palette grid (State Panel style)
 */
export default function GlyphToneModule({ glyph, tone, showGlyph = true, showTone = true, onChange, onRemove }) {
    const currentGlyph = GLYPHS.find(g => g.char === glyph);
    const currentTone = TONES.find(t => t.id === tone);

    return (
        <>
            {showGlyph && (
                <Collapsible
                    label={
                        <span className="collapsible-label-with-value">
                            GLYPH
                            <span className="current-value-badge glyph-badge">
                                {glyph} {currentGlyph?.label || 'Origin'}
                            </span>
                        </span>
                    }
                    defaultOpen={false}
                    onRemove={() => onRemove?.('glyph')}
                >
                    <div className="palette-wrapper">
                        <div className="palette-grid">
                            {GLYPHS.map(g => (
                                <button
                                    key={g.id}
                                    className={`palette-item glyph-item ${glyph === g.char ? 'active' : ''}`}
                                    onClick={() => onChange?.('glyph', g.char)}
                                    title={g.label}
                                >
                                    <span className="glyph-symbol">{g.char}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </Collapsible>
            )}

            {showTone && (
                <Collapsible
                    label={
                        <span className="collapsible-label-with-value">
                            TONE
                            <span className="current-value-badge tone-badge" style={{ color: currentTone?.color }}>
                                <span className="tone-dot" style={{ backgroundColor: currentTone?.color }} />
                                {currentTone?.label || 'Sky'}
                            </span>
                        </span>
                    }
                    defaultOpen={false}
                    onRemove={() => onRemove?.('tone')}
                >
                    <div className="palette-wrapper">
                        <div className="palette-grid">
                            {TONES.map(t => (
                                <button
                                    key={t.id}
                                    className={`palette-item tone-item ${tone === t.id ? 'active' : ''}`}
                                    onClick={() => onChange?.('tone', t.id)}
                                    title={t.label}
                                    style={{ '--tone-color': t.color }}
                                >
                                    <div
                                        className="tone-circle"
                                        style={{ backgroundColor: t.color }}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                </Collapsible>
            )}
        </>
    );
}
