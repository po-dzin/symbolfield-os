import React from 'react';
import coreGlyph from '../../assets/core-glyph.svg';

const BrandChip: React.FC = () => {
    return (
        <div className="w-8 h-8 rounded-full bg-[var(--primitive-color-n0-deepest)] border border-[var(--semantic-color-border-default)] flex items-center justify-center opacity-90">
            <img src={coreGlyph} alt="SymbolField Core" className="w-full h-full block opacity-85" />
        </div>
    );
};

export default BrandChip;
