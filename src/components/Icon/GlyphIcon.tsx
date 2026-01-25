import React from 'react';
import { getGlyphById } from '../../utils/customGlyphs';

type GlyphIconProps = {
    id: string;
    size?: number;
    className?: string;
    style?: React.CSSProperties;
};

const GlyphIcon = ({ id, size = 20, className, style }: GlyphIconProps) => {
    const glyph = getGlyphById(id);
    if (!glyph) return null;
    return (
        <span
            className={`glyph-icon inline-flex items-center justify-center ${className ?? ''}`}
            style={{ width: size, height: size, lineHeight: 0, ...style }}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: glyph.svg }}
        />
    );
};

export default GlyphIcon;
