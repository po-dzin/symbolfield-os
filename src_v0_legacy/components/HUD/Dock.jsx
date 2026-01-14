import React from 'react';

const DockItem = ({ glyph, label }) => (
    <button className="w-10 h-10 rounded-lg bg-os-glass-bg border border-os-glass-border flex items-center justify-center
                       hover:bg-white/10 hover:scale-105 transition-all duration-200 text-os-text-secondary hover:text-os-cyan">
        {glyph}
    </button>
)

const Dock = () => {
    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 
                    h-14 px-4 glass-panel flex items-center gap-3 pointer-events-auto">
            <DockItem glyph="∅" label="Clear" />
            <div className="w-px h-6 bg-os-glass-border mx-1"></div>
            <DockItem glyph="∴" label="Layout" />
            <DockItem glyph="⊞" label="Windows" />
        </div>
    );
};

export default Dock;
