import React from 'react';
import type { DocSnapshot } from '@blocksuite/store';
import { useAppStore } from '../../store/useAppStore';
import { useGraphStore } from '../../store/useGraphStore';
import { NodeBuilder } from './NodeBuilder';
import NowChip from '../HUD/NowChip';

const serializeSnapshot = (snapshot: unknown): string => {
    try {
        return JSON.stringify(snapshot ?? null);
    } catch {
        return '';
    }
};

const NodeOverlay = () => {
    const viewContext = useAppStore(state => state.viewContext);
    const activeScope = useAppStore(state => state.activeScope);
    const exitNode = useAppStore(state => state.exitNode);
    const nodes = useGraphStore(state => state.nodes);
    const updateNode = useGraphStore(state => state.updateNode);

    const isNodeView = viewContext === 'node';
    const node = React.useMemo(() => {
        if (!isNodeView || !activeScope) return null;
        return nodes.find(n => n.id === activeScope) ?? null;
    }, [isNodeView, activeScope, nodes]);

    const initialSnapshot = React.useMemo(() => {
        if (!node) return null;
        const candidate = node.data?.docSnapshot;
        return candidate ?? null;
    }, [node]);

    const legacyContent = React.useMemo(() => {
        if (!node) return '';
        return typeof node.data?.content === 'string' ? node.data.content : '';
    }, [node]);

    const lastSavedSnapshotRef = React.useRef('');

    React.useEffect(() => {
        lastSavedSnapshotRef.current = serializeSnapshot(initialSnapshot);
    }, [node?.id, initialSnapshot]);

    const handleSnapshotChange = React.useCallback((snapshot: DocSnapshot) => {
        if (!isNodeView || !node) return;

        const serialized = serializeSnapshot(snapshot);
        if (serialized === lastSavedSnapshotRef.current) return;

        updateNode(node.id, {
            data: {
                docSnapshot: snapshot,
                contentFormat: 'blocksuite.page.v1'
            }
        });

        lastSavedSnapshotRef.current = serialized;
    }, [isNodeView, node, updateNode]);

    if (!isNodeView || !activeScope || !node) return null;

    const nodeLabel = typeof node.data?.label === 'string' ? node.data.label : 'Untitled Node';

    return (
        <div className="absolute inset-0 z-[var(--component-z-overlay)] bg-[var(--semantic-color-bg-surface)]/95 backdrop-blur-xl animate-fade-scale flex flex-col" data-overlay="node">
            <div className="flex-1 overflow-auto p-[var(--primitive-space-panel-padding)] pt-[var(--component-topbar-height)] max-w-5xl mx-auto w-full mt-12">
                <div className="mb-4 text-sm text-[var(--semantic-color-text-muted)]">
                    Edit node content with BlockSuite PageEditor. Changes save automatically.
                </div>
                <NodeBuilder
                    key={node.id}
                    initialSnapshot={initialSnapshot}
                    legacyContent={legacyContent}
                    onSnapshotChange={handleSnapshotChange}
                />
            </div>

        </div>
    );
};

export default NodeOverlay;
