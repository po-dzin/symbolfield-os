import React from 'react';
import { useAppStore } from '../../../store/useAppStore';
import SpaceProperties from './SpaceProperties';
import NodeProperties from './NodeProperties';

const PropertiesPanel = () => {
    const activeScope = useAppStore(state => state.activeScope);
    const viewContext = useAppStore(state => state.viewContext);

    return (
        <div className="flex flex-col h-full w-full bg-[var(--semantic-color-bg-surface)]">
            {/* Content Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                {activeScope && viewContext === 'node' ? (
                    <NodeProperties />
                ) : (
                    <SpaceProperties />
                )}
            </div>
        </div>
    );
};

export default PropertiesPanel;
