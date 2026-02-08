import React from 'react';
import { useAppStore } from '../../store/useAppStore';

import { useGraphStore } from '../../store/useGraphStore';
import { spaceManager } from '../../core/state/SpaceManager';

const BreadcrumbCapsule: React.FC = () => {
    const viewContext = useAppStore(state => state.viewContext);
    const activeScope = useAppStore(state => state.activeScope);
    const setViewContext = useAppStore(state => state.setViewContext);
    const exitNode = useAppStore(state => state.exitNode);
    const nodes = useGraphStore(state => state.nodes);

    const currentSpaceId = useAppStore(state => state.currentSpaceId);

    // Helper to get node label
    const getNodeLabel = (id: string | null) => {
        if (!id) return null;
        const node = nodes.find(n => n.id === activeScope);
        return (typeof node?.data?.label === 'string' ? node.data.label : null) || id.slice(0, 8);
    };

    // Helper to get space label
    const getSpaceLabel = () => {
        if (!currentSpaceId) return 'Space';
        const meta = spaceManager.getSpaceMeta(currentSpaceId);
        return meta?.name || 'Space';
    };

    const getCurrentPath = () => {
        if (viewContext === 'home') {
            return null; // No breadcrumb on station
        }

        if (viewContext === 'space') {
            // Space view: Just show Space name (non-clickable)
            return [
                { label: getSpaceLabel(), onClick: null }
            ];
        }

        if (viewContext === 'node') {
            // Node view: Space (clickable) > Node
            return [
                { label: getSpaceLabel(), onClick: exitNode },
                { label: getNodeLabel(activeScope) || 'Node', onClick: null }
            ];
        }

        return null;
    };

    const path = getCurrentPath();

    if (!path) return null;

    return (
        <div className="flex items-center gap-2 text-sm">
            {path.map((segment, index) => (
                <React.Fragment key={index}>
                    {index > 0 && (
                        <span className="text-[var(--semantic-color-text-muted)] opacity-50">▸</span>
                    )}
                    {segment.onClick ? (
                        <button
                            onClick={segment.onClick}
                            className="hover:text-[var(--semantic-color-text-primary)] text-[var(--semantic-color-text-secondary)] transition-colors"
                        >
                            {segment.label}
                        </button>
                    ) : (
                        <span className="text-[var(--semantic-color-text-primary)] font-medium">
                            {segment.label}
                        </span>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};

export default BreadcrumbCapsule;
