import React from 'react';
import { resolveGlyph } from '../../utils/sfGlyphLayer';

type GlyphIconProps = {
    id: string;
    size?: number;
    className?: string;
    style?: React.CSSProperties;
};

const GlyphIcon = ({ id, size = 20, className, style }: GlyphIconProps) => {
    const glyph = resolveGlyph(id);
    if (!glyph) return null;

    if (glyph.kind === 'svg' && glyph.svg) {
        return (
            <span
                className={`glyph-icon inline-flex items-center justify-center ${className ?? ''}`}
                style={{ width: size, height: size, lineHeight: 0, ...style }}
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: glyph.svg }}
            />
        );
    }

    return (
        <span
            className={`glyph-icon inline-flex items-center justify-center ${className ?? ''}`}
            style={{ width: size, height: size, lineHeight: 1, fontSize: size, ...style }}
            aria-hidden="true"
        >
            {glyph.symbol ?? id}
        </span>
    );
};

export default GlyphIcon;
