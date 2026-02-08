import React from 'react';
import { spaceManager } from '../../core/state/SpaceManager';
const TemplatesRow = () => {
    const templates = [
        { id: 't1', title: 'Default Space', icon: '◇' },
    ];

    return (
        <div>
            <h2 className="text-[var(--semantic-color-text-muted)] text-[9px] font-medium uppercase tracking-[0.35em] mb-4">Templates</h2>
            <div className="space-y-3">
                {templates.map(t => (
                    <button
                        key={t.id}
                        onClick={() => {
                            const id = spaceManager.createSpace(t.title);
                            spaceManager.loadSpace(id);
                        }}
                        className="group flex items-center gap-3 w-full text-left focus-visible:outline-none hover:bg-[var(--semantic-color-text-primary)]/5 rounded-[var(--primitive-radius-card)] p-2 transition-all"
                    >
                        {/* Template Icon */}
                        <div className="
                            w-8 h-8 rounded-[var(--primitive-radius-pill)] flex items-center justify-center text-sm flex-shrink-0
                            bg-[var(--semantic-color-text-primary)]/5 border border-[var(--semantic-color-border-default)]
                            group-hover:border-[var(--semantic-color-text-secondary)] group-hover:bg-[var(--semantic-color-text-primary)]/10 group-hover:scale-110
                            group-focus-visible:ring-1 group-focus-visible:ring-[var(--semantic-color-text-primary)]/50
                            transition-all duration-300
                        ">
                            <span className="text-[var(--semantic-color-text-primary)] group-hover:text-[var(--semantic-color-text-primary)] transition-colors font-mono opacity-90">
                                {t.icon}
                            </span>
                        </div>

                        {/* Label */}
                        <div className="flex-1 min-w-0">
                            <h4 className="text-[var(--semantic-color-text-secondary)] text-xs group-hover:text-[var(--semantic-color-text-primary)] transition-colors">
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
