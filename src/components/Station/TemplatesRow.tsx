import React from 'react';
import { spaceManager } from '../../core/state/SpaceManager';
import { EntitlementLimitError } from '../../core/access/EntitlementsService';

const showActionError = (error: unknown) => {
    if (error instanceof EntitlementLimitError) {
        window.alert(error.message);
        return;
    }
    window.alert('Unable to create space right now.');
};
const TemplatesRow = () => {
    const templates = [
        { id: 't1', title: 'Default Space', icon: '◇' },
    ];

    return (
        <div>

            <div className="space-y-1">
                {templates.map(t => (
                    <button
                        key={t.id}
                        onClick={() => {
                            try {
                                const id = spaceManager.createSpace(t.title);
                                void spaceManager.loadSpace(id);
                            } catch (error) {
                                showActionError(error);
                            }
                        }}
                        className="ui-drawer-row group flex items-center gap-3 w-full text-left focus-visible:outline-none px-2 py-1.5"
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
