import React from 'react';
import { spaceManager } from '../../core/state/SpaceManager';
const TemplatesRow = () => {
    const templates = [
        { id: 't1', title: 'Default Space', icon: '◇' },
    ];

    return (
        <div>
            <h2 className="text-white/80 text-[9px] font-medium uppercase tracking-[0.35em] mb-4">Templates</h2>
            <div className="space-y-3">
                {templates.map(t => (
                    <button
                        key={t.id}
                        onClick={() => {
                            const id = spaceManager.createSpace(t.title);
                            spaceManager.loadSpace(id);
                        }}
                        className="group flex items-center gap-3 w-full text-left focus-visible:outline-none hover:bg-white/5 rounded-2xl p-2 -mx-2 transition-all"
                    >
                        {/* Template Icon */}
                        <div className="
                            w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0
                            bg-white/5 border border-white/10
                            group-hover:border-white/30 group-hover:bg-white/10 group-hover:scale-110
                            group-focus-visible:ring-1 group-focus-visible:ring-white/50
                            transition-all duration-300
                        ">
                            <span className="text-white/90 group-hover:text-white transition-colors font-mono">
                                {t.icon}
                            </span>
                        </div>

                        {/* Label */}
                        <div className="flex-1 min-w-0">
                            <h4 className="text-white/90 text-xs group-hover:text-white transition-colors">
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
