import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useGraphStore } from '../../store/useGraphStore';
import { spaceManager } from '../../core/state/SpaceManager';
import { importFilesToNode, importFilesToStation } from '../../core/import/ImportService';
import { exportNodeToFile, NODE_EXPORT_FORMATS, type NodeExportFormat } from '../../core/export/NodeExportService';
import { exportSpaceToFile, SPACE_CLUSTER_EXPORT_FORMATS, type SpaceClusterExportFormat } from '../../core/export/SpaceExportService';
import { buildShareUrl, shareService } from '../../core/share/ShareService';
import { stationStorage } from '../../core/storage/StationStorage';
import { EntitlementLimitError } from '../../core/access/EntitlementsService';
import { nodeBuilderBridge } from '../../core/node/NodeBuilderBridge';
import { collectClusterDescendantIds } from '../../core/graph/clusterHierarchy';
import { asNodeId } from '../../core/types';

type ImportTarget = 'space' | 'node' | null;

const cloneRecord = <T,>(value: T): T => {
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value)) as T;
};

const TopbarActionMenu: React.FC = () => {
    const viewContext = useAppStore(state => state.viewContext);
    const currentSpaceId = useAppStore(state => state.currentSpaceId);
    const activeScope = useAppStore(state => state.activeScope);
    const fieldScopeId = useAppStore(state => state.fieldScopeId);
    const setViewContext = useAppStore(state => state.setViewContext);
    const nodes = useGraphStore(state => state.nodes);
    const addNode = useGraphStore(state => state.addNode);
    const updateNode = useGraphStore(state => state.updateNode);
    const removeNode = useGraphStore(state => state.removeNode);

    const [open, setOpen] = React.useState(false);
    const [busy, setBusy] = React.useState(false);
    const [status, setStatus] = React.useState('');
    const [importTarget, setImportTarget] = React.useState<ImportTarget>(null);
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const menuRef = React.useRef<HTMLDivElement | null>(null);
    const buttonRef = React.useRef<HTMLButtonElement | null>(null);

    const isNodeContext = viewContext === 'node';
    const isSpaceContext = viewContext === 'space' || viewContext === 'cluster';

    const node = React.useMemo(() => {
        if (!isNodeContext || !activeScope) return null;
        return nodes.find(item => String(item.id) === String(activeScope)) ?? null;
    }, [isNodeContext, activeScope, nodes]);

    const currentSpaceMeta = React.useMemo(
        () => (currentSpaceId ? spaceManager.getSpaceMeta(currentSpaceId) : undefined),
        [currentSpaceId]
    );

    const currentSpaceData = React.useMemo(
        () => (currentSpaceId ? spaceManager.getSpaceData(currentSpaceId) : null),
        [currentSpaceId]
    );

    const clusterExportTarget = React.useMemo(() => {
        if (!currentSpaceId || !currentSpaceData) return null;
        const exportClusterId = viewContext === 'cluster'
            ? fieldScopeId
            : (() => {
                const activeNode = nodes.find(item => String(item.id) === String(activeScope));
                return activeNode?.type === 'cluster' ? activeNode.id : null;
            })();
        if (!exportClusterId) return null;
        const clusterNode = currentSpaceData.nodes.find(item => String(item.id) === String(exportClusterId) && item.type === 'cluster');
        if (!clusterNode) return null;

        const descendants = collectClusterDescendantIds(
            asNodeId(String(clusterNode.id)),
            currentSpaceData.nodes,
            currentSpaceData.edges,
            { includeEdgeLinked: true }
        );
        const scopedIds = new Set<string>([String(clusterNode.id)]);
        descendants.forEach((id) => scopedIds.add(String(id)));
        const scopedNodes = currentSpaceData.nodes.filter(item => scopedIds.has(String(item.id)));
        const scopedEdges = currentSpaceData.edges.filter(edge => (
            scopedIds.has(String(edge.source)) && scopedIds.has(String(edge.target))
        ));
        const label = typeof clusterNode.data?.label === 'string' && clusterNode.data.label.trim()
            ? clusterNode.data.label.trim()
            : 'Cluster';
        return {
            title: label,
            description: `Cluster export from ${currentSpaceMeta?.name ?? 'Space'}`,
            data: {
                spaceId: currentSpaceId,
                nodes: scopedNodes,
                edges: scopedEdges,
                version: 1
            }
        };
    }, [currentSpaceId, currentSpaceData, currentSpaceMeta?.name, viewContext, fieldScopeId, nodes, activeScope]);

    const nodeLabel = React.useMemo(() => {
        if (!node) return 'Node';
        if (typeof node.data?.label === 'string' && node.data.label.trim()) return node.data.label.trim();
        return `Node ${String(node.id).slice(0, 6)}`;
    }, [node]);

    const topLabel = isNodeContext
        ? nodeLabel
        : (currentSpaceMeta?.name || 'Space');

    React.useEffect(() => {
        if (!open) return;
        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node | null;
            if (!target) return;
            if (menuRef.current?.contains(target)) return;
            if (buttonRef.current?.contains(target)) return;
            setOpen(false);
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };
        window.addEventListener('mousedown', handlePointerDown);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('mousedown', handlePointerDown);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    if (!isNodeContext && !isSpaceContext) return null;

    const withBusy = async (action: () => Promise<void>) => {
        if (busy) return;
        setBusy(true);
        try {
            await action();
        } catch (error) {
            if (error instanceof EntitlementLimitError) {
                window.alert(error.message);
            } else {
                window.alert('Action failed. Please retry.');
            }
        } finally {
            setBusy(false);
        }
    };

    const setFeedback = (value: string) => {
        setStatus(value);
        if (!value) return;
        window.setTimeout(() => {
            setStatus((current) => (current === value ? '' : current));
        }, 2400);
    };

    const handleShareSpace = () => withBusy(async () => {
        if (!currentSpaceId || !currentSpaceMeta) return;
        const link = await shareService.createShareLinkAsync({
            title: currentSpaceMeta.name,
            scopeType: 'space',
            spaceId: currentSpaceId,
            visibility: currentSpaceMeta.accessLevel ?? 'private'
        });
        if (!link) return;
        stationStorage.upsertExternalGraphLink(
            { type: 'share', token: link.token },
            { label: `${currentSpaceMeta.name} (Shared)`, visibility: currentSpaceMeta.accessLevel ?? 'private' }
        );
        const url = buildShareUrl(link.token);
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            setFeedback('Space link copied');
        } catch {
            window.prompt('Copy share link', url);
        }
        setOpen(false);
    });

    const handleShareNode = () => withBusy(async () => {
        if (!currentSpaceId || !node) return;
        const scopeType = node.type === 'cluster' ? 'cluster' : 'node';
        const link = await shareService.createShareLinkAsync({
            title: nodeLabel,
            scopeType,
            spaceId: currentSpaceId,
            scopeNodeId: node.id
        });
        if (!link) return;
        stationStorage.upsertExternalGraphLink(
            { type: 'share', token: link.token },
            { label: `${nodeLabel} (${scopeType})`, visibility: 'shared' }
        );
        const url = buildShareUrl(link.token);
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            setFeedback('Node link copied');
        } catch {
            window.prompt('Copy share link', url);
        }
        setOpen(false);
    });

    const triggerImport = (target: Exclude<ImportTarget, null>) => {
        setImportTarget(target);
        inputRef.current?.click();
    };

    const handleImportInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const filesList = event.target.files;
        if (!filesList || filesList.length === 0) return;
        const files = Array.from(filesList);
        const target = importTarget;
        setImportTarget(null);
        event.target.value = '';

        await withBusy(async () => {
            try {
                if (target === 'space') {
                    const result = await importFilesToStation(files);
                    await spaceManager.loadSpace(result.spaceId);
                    setViewContext('space');
                    if (result.warnings.length > 0) {
                        window.alert(result.warnings.join('\n'));
                    }
                    setFeedback(`Imported ${result.importedCount} file${result.importedCount === 1 ? '' : 's'} to space`);
                    setOpen(false);
                    return;
                }

                if (target === 'node' && node) {
                    const result = await importFilesToNode(files);
                    if (result.markdown.trim()) {
                        const appended = await nodeBuilderBridge.appendToNode(String(node.id), result.markdown);
                        if (!appended) {
                            const fallbackContent = typeof node.data?.content === 'string' ? node.data.content.trim() : '';
                            const nextContent = [fallbackContent, result.markdown].filter(Boolean).join('\n\n');
                            updateNode(node.id, { data: { content: nextContent } });
                            window.alert('Node editor not ready yet. Content saved to node data and will appear after reload.');
                        }
                    }
                    if (result.warnings.length > 0) {
                        window.alert(result.warnings.join('\n'));
                    }
                    setFeedback(`Imported ${result.importedCount} file${result.importedCount === 1 ? '' : 's'} to node`);
                    setOpen(false);
                }
            } catch (error) {
                if (error instanceof EntitlementLimitError) {
                    window.alert(error.message);
                    return;
                }
                window.alert('Import failed. Please retry.');
            }
        });
    };

    const handleExportNode = (format: NodeExportFormat) => withBusy(async () => {
        if (!node) return;
        const exported = await exportNodeToFile({
            format,
            node,
            spaceId: currentSpaceId,
            ...(currentSpaceMeta?.name ? { spaceName: currentSpaceMeta.name } : {})
        });
        if (!exported) {
            window.alert('Export is unavailable in this environment.');
            return;
        }
        setFeedback(`Exported node (${format.toUpperCase()})`);
        setOpen(false);
    });

    const handleExportSpace = (format: SpaceClusterExportFormat) => withBusy(async () => {
        if (!currentSpaceId || !currentSpaceData) return;
        const target = clusterExportTarget ?? {
            title: currentSpaceMeta?.name ?? 'Space',
            description: currentSpaceMeta?.description ?? '',
            data: currentSpaceData
        };
        const exported = await exportSpaceToFile({
            format,
            spaceId: currentSpaceId,
            spaceName: target.title,
            data: target.data,
            description: target.description
        });
        if (!exported) {
            window.alert('Export is unavailable in this environment.');
            return;
        }
        setFeedback(`Exported ${clusterExportTarget ? 'cluster' : 'space'} (${format.toUpperCase()})`);
        setOpen(false);
    });

    const handleRenameNode = () => {
        if (!node) return;
        const next = window.prompt('Rename node', nodeLabel);
        if (!next) return;
        const trimmed = next.trim();
        if (!trimmed) return;
        updateNode(node.id, { data: { label: trimmed } });
        setFeedback('Node renamed');
        setOpen(false);
    };

    const handleDuplicateNode = () => {
        if (!node) return;
        const baseLabel = typeof node.data?.label === 'string' && node.data.label.trim()
            ? node.data.label.trim()
            : 'Node';
        const dataPatch = cloneRecord(node.data ?? {});
        (dataPatch as Record<string, unknown>).label = `${baseLabel} Copy`;
        addNode({
            type: node.type ?? 'node',
            position: {
                x: node.position.x + 56,
                y: node.position.y + 56
            },
            data: dataPatch
        });
        setFeedback('Node duplicated');
        setOpen(false);
    };

    const handleDeleteNode = () => {
        if (!node) return;
        const confirmed = window.confirm(`Delete "${nodeLabel}"?`);
        if (!confirmed) return;
        removeNode(node.id);
        setViewContext('space');
        setFeedback('Node deleted');
        setOpen(false);
    };

    const handleRenameSpace = () => {
        if (!currentSpaceId || !currentSpaceMeta) return;
        const next = window.prompt('Rename space', currentSpaceMeta.name);
        if (!next) return;
        const trimmed = next.trim();
        if (!trimmed) return;
        spaceManager.renameSpace(currentSpaceId, trimmed);
        setFeedback('Space renamed');
        setOpen(false);
    };

    const handleDuplicateSpace = () => withBusy(async () => {
        if (!currentSpaceData || !currentSpaceMeta) return;
        const id = spaceManager.forkSpace(currentSpaceData, `${currentSpaceMeta.name} Copy`);
        await spaceManager.loadSpace(id);
        setViewContext('space');
        setFeedback('Space duplicated');
        setOpen(false);
    });

    const handleArchiveSpace = () => {
        if (!currentSpaceId || !currentSpaceMeta) return;
        const confirmed = window.confirm(`Move "${currentSpaceMeta.name}" to trash?`);
        if (!confirmed) return;
        spaceManager.softDeleteSpace(currentSpaceId);
        setViewContext('home');
        setFeedback('Space moved to trash');
        setOpen(false);
    };

    return (
        <div className="relative ml-2 shrink-0">
            <input
                ref={inputRef}
                type="file"
                className="hidden"
                multiple
                accept=".md,.markdown,.txt,.canvas,.pdf"
                onChange={handleImportInput}
            />
            <button
                ref={buttonRef}
                type="button"
                aria-label="Topbar action menu"
                aria-expanded={open}
                onClick={() => setOpen(prev => !prev)}
                className="ui-selectable ui-shape-pill h-8 px-3 text-[11px] uppercase tracking-[0.14em] border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)]/55 flex items-center gap-2"
            >
                <span className="max-w-[160px] truncate">{topLabel}</span>
                <span className="text-xs opacity-80">•••</span>
            </button>
            {open && (
                <div
                    ref={menuRef}
                    className="absolute left-0 top-[calc(100%+8px)] z-[var(--component-z-topbar)] min-w-[270px] rounded-[var(--primitive-radius-card)] border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)]/95 backdrop-blur-xl p-2 shadow-2xl"
                >
                    <div className="px-2 pb-2 text-[10px] uppercase tracking-[0.16em] text-[var(--semantic-color-text-muted)]">
                        {isNodeContext ? 'Node Actions' : 'Space Actions'}
                    </div>

                    {isNodeContext ? (
                        <>
                            <button type="button" disabled={busy} onClick={handleRenameNode} className="ui-selectable ui-shape-soft w-full text-left px-3 py-2 text-sm">Rename Node</button>
                            <button type="button" disabled={busy} onClick={handleDuplicateNode} className="ui-selectable ui-shape-soft w-full text-left px-3 py-2 text-sm">Duplicate Node</button>
                            <button type="button" disabled={busy} onClick={() => { void handleShareNode(); }} className="ui-selectable ui-shape-soft w-full text-left px-3 py-2 text-sm">Share Node Link</button>
                            <button type="button" disabled={busy} onClick={() => triggerImport('node')} className="ui-selectable ui-shape-soft w-full text-left px-3 py-2 text-sm">Import to Node</button>
                            <div className="my-1 h-px bg-[var(--semantic-color-border-default)]/80" />
                            {NODE_EXPORT_FORMATS.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    disabled={busy}
                                    onClick={() => { void handleExportNode(option.id); }}
                                    className="ui-selectable ui-shape-soft w-full text-left px-3 py-2 text-sm"
                                >
                                    {`Export ${option.extension.toUpperCase()}`}
                                </button>
                            ))}
                            <div className="my-1 h-px bg-[var(--semantic-color-border-default)]/80" />
                            <button type="button" disabled={busy} onClick={handleDeleteNode} className="ui-selectable ui-shape-soft w-full text-left px-3 py-2 text-sm text-[var(--semantic-color-status-error)]">Delete Node</button>
                        </>
                    ) : (
                        <>
                            <button type="button" disabled={busy} onClick={handleRenameSpace} className="ui-selectable ui-shape-soft w-full text-left px-3 py-2 text-sm">Rename Space</button>
                            <button type="button" disabled={busy} onClick={() => { void handleDuplicateSpace(); }} className="ui-selectable ui-shape-soft w-full text-left px-3 py-2 text-sm">Duplicate Space</button>
                            <button type="button" disabled={busy} onClick={() => { void handleShareSpace(); }} className="ui-selectable ui-shape-soft w-full text-left px-3 py-2 text-sm">Share Space Link</button>
                            <button type="button" disabled={busy} onClick={() => triggerImport('space')} className="ui-selectable ui-shape-soft w-full text-left px-3 py-2 text-sm">Import Files</button>
                            <div className="my-1 h-px bg-[var(--semantic-color-border-default)]/80" />
                            {SPACE_CLUSTER_EXPORT_FORMATS.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    disabled={busy}
                                    onClick={() => { void handleExportSpace(option.id); }}
                                    className="ui-selectable ui-shape-soft w-full text-left px-3 py-2 text-sm"
                                >
                                    {`Export ${option.extension.toUpperCase()}`}
                                </button>
                            ))}
                            <div className="my-1 h-px bg-[var(--semantic-color-border-default)]/80" />
                            <button type="button" disabled={busy} onClick={handleArchiveSpace} className="ui-selectable ui-shape-soft w-full text-left px-3 py-2 text-sm text-[var(--semantic-color-status-error)]">Move to Trash</button>
                        </>
                    )}

                    {status && (
                        <div className="mt-2 px-2 text-[10px] uppercase tracking-[0.12em] text-[var(--semantic-color-text-muted)]">
                            {status}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TopbarActionMenu;
