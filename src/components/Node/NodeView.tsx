import React from 'react';
import type { DocSnapshot } from '@blocksuite/store';
import { useAppStore } from '../../store/useAppStore';
import { useGraphStore } from '../../store/useGraphStore';
import { NodeBuilder, type NodeBuilderHandle } from './NodeBuilder';
import { getSfDocById, isSfContentRemoteEnabled, listSfDocs, upsertSfDoc } from '../../core/data/sfContentRemote';
import { buildNodeDocId, buildNodeDocRecord, pickNodeDocRecord } from '../../core/data/sfContentNodeSync';
import { importFilesToNode } from '../../core/import/ImportService';
import { EntitlementLimitError } from '../../core/access/EntitlementsService';
import { nodeBuilderBridge } from '../../core/node/NodeBuilderBridge';

const serializeSnapshot = (snapshot: unknown): string => {
    try {
        return JSON.stringify(snapshot ?? null);
    } catch {
        return '';
    }
};

const formatTimestamp = (value: unknown): string => {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed || 'Unknown';
    }
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 'Unknown';
    return new Date(value).toLocaleString();
};

const normalizeTags = (raw: unknown): string => {
    if (Array.isArray(raw)) {
        return raw
            .map(entry => (typeof entry === 'string' ? entry.trim() : ''))
            .filter(Boolean)
            .join(', ');
    }
    if (typeof raw === 'string') return raw;
    return '';
};

const firstNonEmptyString = (...values: unknown[]): string => {
    for (const value of values) {
        if (typeof value !== 'string') continue;
        const trimmed = value.trim();
        if (trimmed) return trimmed;
    }
    return '';
};

const NodeView = () => {
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

    const initialSnapshot = React.useMemo(() => {
        if (!node) return null;
        const candidate = node.data?.docSnapshot;
        return candidate ?? null;
    }, [node]);

    const legacyContent = React.useMemo(() => {
        if (!node) return '';
        return typeof node.data?.content === 'string' ? node.data.content : '';
    }, [node]);

    const nodeLabel = React.useMemo(() => {
        if (!node) return 'Untitled Node';
        return typeof node.data?.label === 'string' ? node.data.label : 'Untitled Node';
    }, [node]);

    const nodeIcon = React.useMemo(() => {
        if (!node) return '';
        return typeof node.data?.icon_value === 'string' ? node.data.icon_value : '';
    }, [node]);

    const createdAt = React.useMemo(
        () => formatTimestamp(node?.created_at ?? node?.data?.created),
        [node?.created_at, node?.data?.created]
    );
    const updatedAt = React.useMemo(
        () => formatTimestamp(node?.updated_at ?? node?.data?.updated),
        [node?.updated_at, node?.data?.updated]
    );
    const ownerName = React.useMemo(() => {
        if (!node) return 'Owner';
        return firstNonEmptyString(
            node.data?.owner,
            node.data?.createdBy,
            node.meta?.owner,
            node.meta?.createdBy
        ) || 'Owner';
    }, [node]);
    const storedTags = React.useMemo(() => normalizeTags(node?.data?.tags), [node?.data?.tags]);

    const [titleDraft, setTitleDraft] = React.useState('Untitled Node');
    const [tagsDraft, setTagsDraft] = React.useState('');
    const [infoCollapsed, setInfoCollapsed] = React.useState(true);
    const [isImporting, setIsImporting] = React.useState(false);
    const [importStatus, setImportStatus] = React.useState('');
    const importInputRef = React.useRef<HTMLInputElement | null>(null);
    const builderRef = React.useRef<NodeBuilderHandle | null>(null);

    const lastSavedSnapshotRef = React.useRef('');
    const remoteSaveTimerRef = React.useRef<number | null>(null);
    const lastRemoteUpsertSignatureRef = React.useRef('');

    React.useEffect(() => {
        lastSavedSnapshotRef.current = serializeSnapshot(initialSnapshot);
    }, [node?.id, initialSnapshot]);

    React.useEffect(() => {
        lastRemoteUpsertSignatureRef.current = '';
    }, [node?.id]);

    const queueRemoteDocUpsert = React.useCallback(
        (snapshot: unknown, title: string, delayMs = 700) => {
            if (!node) return;
            if (!isSfContentRemoteEnabled()) return;

            const normalizedTitle = title.trim() || 'Untitled Node';
            const signature = `${serializeSnapshot(snapshot)}::${normalizedTitle}`;
            if (signature === lastRemoteUpsertSignatureRef.current) return;
            lastRemoteUpsertSignatureRef.current = signature;

            if (remoteSaveTimerRef.current !== null) {
                window.clearTimeout(remoteSaveTimerRef.current);
            }
            const nodeId = node.id;
            remoteSaveTimerRef.current = window.setTimeout(() => {
                const record = buildNodeDocRecord({
                    spaceId: currentSpaceId,
                    nodeId,
                    title: normalizedTitle,
                    snapshotJson: snapshot
                });
                void upsertSfDoc(record);
            }, delayMs);
        },
        [node, currentSpaceId]
    );

    React.useEffect(() => {
        if (!isNodeView || !node) return;
        if (!isSfContentRemoteEnabled()) return;
        if (node.data?.docSnapshot) {
            queueRemoteDocUpsert(node.data.docSnapshot, nodeLabel, 240);
            return;
        }

        let cancelled = false;
        void (async () => {
            const remoteById = await getSfDocById(buildNodeDocId(currentSpaceId, node.id));
            if (cancelled) return;
            const remoteDoc = remoteById ?? pickNodeDocRecord(await listSfDocs(), currentSpaceId, node.id);
            if (!remoteDoc) return;
            updateNode(node.id, {
                data: {
                    docSnapshot: remoteDoc.snapshotJson,
                    contentFormat: 'blocksuite.page.v1'
                }
            });
            lastSavedSnapshotRef.current = serializeSnapshot(remoteDoc.snapshotJson);
        })();

        return () => {
            cancelled = true;
        };
    }, [isNodeView, node, node?.id, node?.data?.docSnapshot, currentSpaceId, updateNode, queueRemoteDocUpsert, nodeLabel]);

    React.useEffect(() => {
        return () => {
            if (remoteSaveTimerRef.current !== null) {
                window.clearTimeout(remoteSaveTimerRef.current);
                remoteSaveTimerRef.current = null;
            }
        };
    }, []);

    React.useEffect(() => {
        setTitleDraft(nodeLabel);
    }, [node?.id, nodeLabel]);

    React.useEffect(() => {
        setTagsDraft(storedTags);
    }, [node?.id, storedTags]);

    React.useEffect(() => {
        if (!isNodeView || !node || !builderRef.current) return;
        const nodeId = String(node.id);
        nodeBuilderBridge.register(nodeId, builderRef.current);
        return () => {
            nodeBuilderBridge.unregister(nodeId);
        };
    }, [isNodeView, node?.id]);

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

        queueRemoteDocUpsert(snapshot, nodeLabel);

        lastSavedSnapshotRef.current = serialized;
    }, [isNodeView, node, updateNode, nodeLabel, queueRemoteDocUpsert]);

    const commitTitle = React.useCallback(() => {
        if (!node) return;
        const nextTitle = titleDraft.trim() || 'Untitled Node';
        if (nextTitle === nodeLabel) {
            if (nextTitle !== titleDraft) setTitleDraft(nextTitle);
            return;
        }
        updateNode(node.id, {
            data: {
                label: nextTitle
            }
        });
        if (node.data?.docSnapshot) {
            queueRemoteDocUpsert(node.data.docSnapshot, nextTitle, 240);
        }
        setTitleDraft(nextTitle);
    }, [node, nodeLabel, titleDraft, updateNode, queueRemoteDocUpsert]);

    const commitTags = React.useCallback(() => {
        if (!node) return;
        const normalized = tagsDraft
            .split(',')
            .map(part => part.trim())
            .filter(Boolean);

        updateNode(node.id, {
            data: {
                tags: normalized
            }
        });
        setTagsDraft(normalized.join(', '));
    }, [node, tagsDraft, updateNode]);

    const handleIconToggle = React.useCallback(() => {
        if (!node) return;
        const nextIcon = nodeIcon.trim() ? '' : '◉';
        updateNode(node.id, {
            data: {
                icon_value: nextIcon
            }
        });
    }, [node, nodeIcon, updateNode]);

    const handleNodeImport = React.useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const list = event.target.files;
        if (!list || list.length === 0) return;

        setIsImporting(true);
        setImportStatus('');
        try {
            const files = Array.from(list);
            const result = await importFilesToNode(files);
            if (result.markdown.trim()) {
                await builderRef.current?.appendMarkdown(result.markdown);
                builderRef.current?.focus();
            }

            if (result.warnings.length > 0) {
                window.alert(result.warnings.join('\n'));
            }
            setImportStatus(
                result.importedCount > 0
                    ? `Imported ${result.importedCount} file${result.importedCount === 1 ? '' : 's'}`
                    : 'No supported files imported'
            );
        } catch (error) {
            if (error instanceof EntitlementLimitError) {
                window.alert(error.message);
            } else {
                window.alert('Unable to import files into this node right now.');
            }
        } finally {
            setIsImporting(false);
            event.target.value = '';
        }
    }, []);

    if (!isNodeView || !activeScope || !node) return null;

    return (
        <div className="relative w-full h-full flex flex-col bg-[var(--semantic-color-bg-canvas)]" data-view="node">
            <div className="flex-1 overflow-auto p-[var(--primitive-space-panel-padding)] pt-[calc(var(--component-topbar-height)+20px)] max-w-5xl mx-auto w-full">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div />
                    <div className="flex items-center gap-2 shrink-0">
                        <input
                            ref={importInputRef}
                            type="file"
                            className="hidden"
                            multiple
                            accept=".md,.markdown,.txt,.canvas,.pdf"
                            onChange={handleNodeImport}
                        />
                        <button
                            type="button"
                            onClick={() => importInputRef.current?.click()}
                            disabled={isImporting}
                            className="ui-selectable ui-shape-pill h-8 px-3 border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)]/65 text-[11px] uppercase tracking-[0.14em] text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)] transition-colors disabled:opacity-50"
                        >
                            {isImporting ? 'Importing...' : 'Import'}
                        </button>
                        <button
                            type="button"
                            onClick={exitNode}
                            className="ui-selectable ui-shape-pill h-8 px-3 border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)]/65 text-[11px] uppercase tracking-[0.14em] text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)] transition-colors"
                        >
                            Space
                        </button>
                    </div>
                </div>

                <div className="mb-6 flex items-center gap-2">
                    <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)]/55 text-sm text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)] transition-colors"
                        onClick={handleIconToggle}
                        title={nodeIcon.trim() ? 'Remove icon' : 'Add icon'}
                    >
                        {nodeIcon.trim() || '◌'}
                    </button>
                    <span className="text-sm text-[var(--semantic-color-text-secondary)]">
                        {nodeIcon.trim() ? 'Icon set' : 'Add icon'}
                    </span>
                </div>

                <div className="mb-6">
                    <input
                        id="node-title-input"
                        value={titleDraft}
                        onChange={(event) => setTitleDraft(event.target.value)}
                        onBlur={commitTitle}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                (event.currentTarget as HTMLInputElement).blur();
                            }
                        }}
                        className="w-full bg-transparent text-[clamp(2.2rem,5.2vw,4rem)] leading-[1.02] font-semibold text-[var(--semantic-color-text-primary)] outline-none border-0 border-b border-[var(--semantic-color-border-default)]/65 focus:border-[var(--semantic-color-interactive-active-border)] pb-4"
                        placeholder="Untitled Node"
                        aria-label="Node title"
                    />
                </div>

                {importStatus && (
                    <div className="mb-3 text-[11px] uppercase tracking-[0.12em] text-[var(--semantic-color-text-muted)]">
                        {importStatus}
                    </div>
                )}
                <div className="mb-6 border-y border-[var(--semantic-color-border-default)]/70 py-2">
                    <button
                        type="button"
                        onClick={() => setInfoCollapsed(prev => !prev)}
                        className="ui-selectable w-full flex items-center justify-between px-2 py-2 rounded-[var(--primitive-radius-input)]"
                        aria-expanded={!infoCollapsed}
                    >
                        <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--semantic-color-text-muted)]">Info</span>
                        <span
                            className={`text-xs text-[var(--semantic-color-text-secondary)] transition-transform ${infoCollapsed ? '' : 'rotate-180'}`}
                            aria-hidden="true"
                        >
                            ▾
                        </span>
                    </button>
                    {!infoCollapsed && (
                        <div className="pt-2 pb-2">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-[180px_1fr]">
                                <div className="text-sm text-[var(--semantic-color-text-secondary)]">Tags</div>
                                <input
                                    id="node-tags-input"
                                    value={tagsDraft}
                                    onChange={(event) => setTagsDraft(event.target.value)}
                                    onBlur={commitTags}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault();
                                            (event.currentTarget as HTMLInputElement).blur();
                                        }
                                    }}
                                    className="w-full rounded-[var(--primitive-radius-input)] border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)]/50 px-3 py-2 text-sm text-[var(--semantic-color-text-primary)] outline-none focus:border-[var(--semantic-color-interactive-active-border)]"
                                    placeholder="Empty"
                                    aria-label="Node tags"
                                />
                            </div>
                            <div className="mt-4 space-y-2 text-sm">
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-[180px_1fr]">
                                    <div className="text-[var(--semantic-color-text-secondary)]">Created</div>
                                    <div className="text-[var(--semantic-color-text-primary)]">{createdAt}</div>
                                </div>
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-[180px_1fr]">
                                    <div className="text-[var(--semantic-color-text-secondary)]">Updated</div>
                                    <div className="text-[var(--semantic-color-text-primary)]">{updatedAt}</div>
                                </div>
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-[180px_1fr]">
                                    <div className="text-[var(--semantic-color-text-secondary)]">Owner</div>
                                    <div className="text-[var(--semantic-color-text-primary)]">{ownerName}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <NodeBuilder
                    ref={builderRef}
                    key={node.id}
                    nodeLabel={nodeLabel}
                    initialSnapshot={initialSnapshot}
                    legacyContent={legacyContent}
                    onSnapshotChange={handleSnapshotChange}
                    onActivity={() => {
                        // "Live" signal - eventually dispatch to NowCore
                        // console.log('Activity detected in node:', node.id);
                    }}
                />
            </div>

        </div>
    );
};

export default NodeView;
