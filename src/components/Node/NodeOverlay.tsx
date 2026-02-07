import React from 'react';
import type { DocSnapshot } from '@blocksuite/store';
import { useAppStore } from '../../store/useAppStore';
import { useGraphStore } from '../../store/useGraphStore';
import { NodeBuilder } from './NodeBuilder';
import { getSfDocForNode, isSfContentRemoteEnabled, upsertSfDoc } from '../../core/data/sfContentRemote';

const REMOTE_SAVE_DEBOUNCE_MS = 550;

const serializeSnapshot = (snapshot: unknown): string => {
    try {
        return JSON.stringify(snapshot ?? null);
    } catch {
        return '';
    }
};

const hashSnapshot = (snapshot: unknown): string => {
    const serialized = serializeSnapshot(snapshot);
    let hash = 0;
    for (let index = 0; index < serialized.length; index += 1) {
        hash = ((hash << 5) - hash) + serialized.charCodeAt(index);
        hash |= 0;
    }
    return `${serialized.length}:${Math.abs(hash)}`;
};

const NodeOverlay = () => {
    const viewContext = useAppStore(state => state.viewContext);
    const activeScope = useAppStore(state => state.activeScope);
    const currentSpaceId = useAppStore(state => state.currentSpaceId);
    const exitNode = useAppStore(state => state.exitNode);
    const nodes = useGraphStore(state => state.nodes);
    const updateNode = useGraphStore(state => state.updateNode);

    const isNodeView = viewContext === 'node';
    const node = React.useMemo(() => {
        if (!isNodeView || !activeScope) return null;
        return nodes.find(n => n.id === activeScope) ?? null;
    }, [isNodeView, activeScope, nodes]);
    const nodeId = node?.id ?? null;

    const localSnapshot = React.useMemo(() => {
        if (!node) return null;
        const candidate = node.data?.docSnapshot;
        return candidate ?? null;
    }, [node]);
    const [hydratedSnapshot, setHydratedSnapshot] = React.useState<unknown>(null);
    const [remoteHydrating, setRemoteHydrating] = React.useState(false);

    const legacyContent = React.useMemo(() => {
        if (!node) return '';
        return typeof node.data?.content === 'string' ? node.data.content : '';
    }, [node]);

    const lastSavedSnapshotRef = React.useRef('');
    const lastRemoteSnapshotRef = React.useRef('');
    const remoteSaveTimerRef = React.useRef<number | null>(null);

    React.useEffect(() => {
        lastSavedSnapshotRef.current = serializeSnapshot(localSnapshot);
        setHydratedSnapshot(localSnapshot);
    }, [nodeId, localSnapshot]);

    React.useEffect(() => {
        if (remoteSaveTimerRef.current !== null) {
            window.clearTimeout(remoteSaveTimerRef.current);
            remoteSaveTimerRef.current = null;
        }

        if (!isNodeView || !nodeId || !currentSpaceId || !isSfContentRemoteEnabled()) {
            setRemoteHydrating(false);
            return;
        }

        let canceled = false;
        setRemoteHydrating(true);

        void (async () => {
            const remoteDoc = await getSfDocForNode(currentSpaceId, nodeId);
            if (canceled) return;

            if (remoteDoc?.snapshotJson !== undefined) {
                const remoteSerialized = serializeSnapshot(remoteDoc.snapshotJson);
                lastRemoteSnapshotRef.current = remoteSerialized;
                setHydratedSnapshot(remoteDoc.snapshotJson);
                if (remoteSerialized !== lastSavedSnapshotRef.current) {
                    updateNode(nodeId, {
                        data: {
                            docSnapshot: remoteDoc.snapshotJson,
                            contentFormat: 'blocksuite.page.v1'
                        }
                    });
                    lastSavedSnapshotRef.current = remoteSerialized;
                }
            } else {
                lastRemoteSnapshotRef.current = lastSavedSnapshotRef.current;
            }

            setRemoteHydrating(false);
        })();

        return () => {
            canceled = true;
        };
    }, [currentSpaceId, isNodeView, nodeId, updateNode]);

    React.useEffect(() => {
        return () => {
            if (remoteSaveTimerRef.current !== null) {
                window.clearTimeout(remoteSaveTimerRef.current);
                remoteSaveTimerRef.current = null;
            }
        };
    }, []);

    const initialSnapshot = hydratedSnapshot ?? localSnapshot;
    const editorSeed = React.useMemo(() => hashSnapshot(initialSnapshot), [initialSnapshot]);

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

        if (!currentSpaceId || !isSfContentRemoteEnabled()) return;
        if (serialized === lastRemoteSnapshotRef.current) return;
        if (remoteSaveTimerRef.current !== null) {
            window.clearTimeout(remoteSaveTimerRef.current);
            remoteSaveTimerRef.current = null;
        }

        const title = typeof node.data?.label === 'string' ? node.data.label : 'Untitled Node';
        remoteSaveTimerRef.current = window.setTimeout(() => {
            remoteSaveTimerRef.current = null;
            const payload = {
                docId: node.id,
                spaceId: currentSpaceId,
                nodeId: node.id,
                title,
                snapshotJson: snapshot,
                schemaVersion: 1,
                updatedAt: Date.now()
            } as const;
            void (async () => {
                const ok = await upsertSfDoc(payload);
                if (ok) {
                    lastRemoteSnapshotRef.current = serialized;
                }
            })();
        }, REMOTE_SAVE_DEBOUNCE_MS);
    }, [currentSpaceId, isNodeView, node, updateNode]);

    if (!isNodeView || !activeScope || !node) return null;

    const nodeLabel = typeof node.data?.label === 'string' ? node.data.label : 'Untitled Node';

    return (
        <div className="absolute inset-0 z-[var(--z-overlay)] bg-os-dark/95 backdrop-blur-xl animate-fade-scale flex flex-col" data-overlay="node">
            <div className="h-[14.6vh] flex items-center justify-between px-8 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={exitNode}
                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-secondary"
                    >
                        ←
                    </button>

                    <div className="flex flex-col">
                        <span className="text-xs uppercase tracking-widest text-text-meta">Node Editor</span>
                        <h1 className="text-2xl font-light tracking-wide text-text-primary">
                            {nodeLabel}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-xs text-text-meta uppercase">Mode</div>
                        <div className="text-sm font-mono text-emerald-400">node</div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-12 max-w-5xl mx-auto w-full">
                <div className="mb-4 text-sm text-white/50">
                    {isSfContentRemoteEnabled()
                        ? (remoteHydrating
                            ? 'Syncing BlockSuite document from DB...'
                            : 'Edit with BlockSuite PageEditor. Changes save automatically to UI + DB.')
                        : 'Edit node content with BlockSuite PageEditor. Changes save locally.'}
                </div>
                <NodeBuilder
                    key={`${node.id}:${editorSeed}`}
                    initialSnapshot={initialSnapshot}
                    legacyContent={legacyContent}
                    onSnapshotChange={handleSnapshotChange}
                />
            </div>

        </div>
    );
};

export default NodeOverlay;
