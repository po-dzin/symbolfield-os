import React from 'react';
import { spaceManager } from '../../core/state/SpaceManager';
const TemplatesRow = () => {
    const templates = [
        { id: 't1', title: 'Default Space', icon: '◇' },
    ];

    return (
        <div>

            <div className="space-y-1 pl-1">
                {templates.map(t => (
                    <button
                        key={t.id}
                        onClick={() => {
                            const id = spaceManager.createSpace(t.title);
                            spaceManager.loadSpace(id);
                        }}
                        className="group flex items-center gap-3 w-full text-left focus-visible:outline-none hover:bg-[var(--semantic-color-bg-surface-hover)] rounded-[6px] px-2 py-1.5 transition-all mx-1 w-[calc(100%-8px)]"
                    >
                        {/* Template Icon (Empty Placeholder Circle) */}
                        <div className="
                            w-5 h-5 rounded-full flex-shrink-0
                            border-[1.5px] transition-all duration-300
                            border-[var(--semantic-color-text-muted)] opacity-40
                            group-hover:opacity-100 group-hover:border-[var(--semantic-color-text-secondary)]
                        " />

                        {/* Label */}
                        <div className="flex-1 min-w-0">
                            <h4 className="text-[var(--semantic-color-text-secondary)] text-[13px] group-hover:text-[var(--semantic-color-text-primary)] transition-colors font-medium">
                                {t.title}
                            </h4>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default TemplatesRow;
