import React from 'react';
import { useAppStore } from '../../../store/useAppStore';
import SpaceProperties from './SpaceProperties';
import NodeProperties from './NodeProperties';

const PropertiesPanel = () => {
    const activeScope = useAppStore(state => state.activeScope);
    const viewContext = useAppStore(state => state.viewContext);

    // Header Content
    const getHeader = () => {
        if (activeScope && viewContext === 'node') {
            return 'Node Inspector';
        }
        return 'Space Inspector';
    };

    return (
        <div className="flex flex-col h-full w-full bg-[var(--semantic-color-bg-surface)]">
            {/* Header */}
            <div className="flex-none h-[var(--component-topbar-height)] px-6 border-b border-[var(--semantic-color-border-default)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-lg font-medium tracking-tight text-[var(--semantic-color-text-primary)]">
                        {getHeader()}
                    </span>
                </div>
                {/* Optional Action Icons */}
            </div>

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
