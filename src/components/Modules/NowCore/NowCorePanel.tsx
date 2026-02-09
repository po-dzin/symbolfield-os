import React, { useState } from 'react';
import { SessionView } from './SessionView';
import { CyclesView } from './CyclesView';
import { ChronosView } from './ChronosView';

type Tab = 'now' | 'cycles' | 'chronos';

const TAB_LABELS: Record<Tab, string> = {
    now: 'Now',
    cycles: 'Cycles',
    chronos: 'Chronos'
};

const NowCorePanel: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('now');

    return (
        <div className="h-full flex flex-col gap-6 p-[var(--component-panel-padding)] w-full relative">
            {/* Header / Tabs */}
            <div className="flex items-center justify-end">
                {/* Internal Tabs */}
                <div className="flex items-center gap-[var(--primitive-space-gap-dense)]">
                    {(Object.keys(TAB_LABELS) as Tab[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-3 h-7 rounded-[var(--primitive-radius-input)] text-[10px] uppercase tracking-[0.2em] transition-colors ${activeTab === tab
                                ? 'bg-[var(--semantic-color-text-primary)]/20 text-[var(--semantic-color-text-primary)]'
                                : 'text-[var(--semantic-color-text-secondary)] hover:bg-[var(--semantic-color-text-primary)]/10 hover:text-[var(--semantic-color-text-primary)]'
                                }`}
                        >
                            {TAB_LABELS[tab]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {activeTab === 'now' && <SessionView />}
                {activeTab === 'cycles' && <CyclesView />}
                {activeTab === 'chronos' && <ChronosView />}
            </div>
        </div>
    );
};

export default NowCorePanel;
