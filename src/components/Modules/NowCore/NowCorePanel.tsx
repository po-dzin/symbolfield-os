import React from 'react';
import { SessionView } from './SessionView';
import { CyclesView } from './CyclesView';
import { ChronosView } from './ChronosView';
import { useAppStore } from '../../../store/useAppStore';
import CapsuleTabs, { type CapsuleTabItem } from '../../Common/CapsuleTabs';

type Tab = 'now' | 'cycles' | 'chronos';

const TAB_ITEMS: CapsuleTabItem[] = [
    { id: 'now', label: 'Now' },
    { id: 'cycles', label: 'Cycles' },
    { id: 'chronos', label: 'Chronos' }
];

const NowCorePanel: React.FC = () => {
    const drawerRightTab = useAppStore(state => state.drawerRightTab);
    const setDrawerRightTab = useAppStore(state => state.setDrawerRightTab);
    const activeTab: Tab = drawerRightTab === 'cycles' || drawerRightTab === 'chronos' ? drawerRightTab : 'now';

    const cycleNowTabs = (direction: 1 | -1) => {
        const ids: Tab[] = ['now', 'cycles', 'chronos'];
        const currentIndex = Math.max(0, ids.indexOf(activeTab));
        const nextIndex = (currentIndex + direction + ids.length) % ids.length;
        const next = ids[nextIndex];
        if (next) {
            setDrawerRightTab(next);
        }
    };

    return (
        <div className="h-full flex flex-col gap-6 p-[var(--component-panel-padding)] w-full relative">
            {/* Header / Tabs */}
            <div className="flex items-center w-full">
                <CapsuleTabs
                    items={TAB_ITEMS}
                    activeId={activeTab}
                    onSelect={(id) => setDrawerRightTab(id as Tab)}
                    onCycle={cycleNowTabs}
                    title="Now/Cycles/Chronos (Tab to switch)"
                    size="sm"
                    className="w-full"
                    equalWidth={true}
                    showSeparators={false}
                />
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
