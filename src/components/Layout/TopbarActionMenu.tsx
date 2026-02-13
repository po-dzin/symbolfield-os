import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useGraphStore } from '../../store/useGraphStore';
import { spaceManager } from '../../core/state/SpaceManager';
import { importFilesToNode, importFilesToStation } from '../../core/import/ImportService';
import { exportNodeToFile, NODE_EXPORT_FORMATS, type NodeExportFormat } from '../../core/export/NodeExportService';
import {
    exportSpaceToFile,
    SPACE_CLUSTER_EXPORT_FORMATS,
    SPACE_EXPORT_FORMATS,
    type SpaceExportFormat
} from '../../core/export/SpaceExportService';
import { EntitlementLimitError } from '../../core/access/EntitlementsService';
import { nodeBuilderBridge } from '../../core/node/NodeBuilderBridge';
import { collectClusterDescendantIds } from '../../core/graph/clusterHierarchy';
import { asNodeId } from '../../core/types';

type ImportTarget = 'space' | 'node' | null;
type MenuLayer = 'root' | 'import' | 'export';

interface ImportFormatOption {
    id: string;
    label: string;
    icon: string;
    accept: string;
}

const DEFAULT_IMPORT_ACCEPT = '.md,.markdown,.txt,.canvas,.pdf';

const NODE_IMPORT_FORMAT_OPTIONS: ImportFormatOption[] = [
    { id: 'markdown', label: 'Markdown', icon: '⌘', accept: '.md,.markdown,.txt' },
    { id: 'canvas', label: 'Canvas', icon: '◫', accept: '.canvas' },
    { id: 'pdf', label: 'PDF', icon: '⎙', accept: '.pdf' }
];

const SPACE_IMPORT_FORMAT_OPTIONS: ImportFormatOption[] = [
    { id: 'markdown', label: 'Markdown', icon: '⌘', accept: '.md,.markdown,.txt' },
    { id: 'canvas', label: 'Canvas', icon: '◫', accept: '.canvas' },
    { id: 'pdf', label: 'PDF', icon: '⎙', accept: '.pdf' }
];

const cloneRecord = <T,>(value: T): T => {
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value)) as T;
};

interface MenuRowProps {
    icon: string;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    danger?: boolean;
    trailing?: React.ReactNode;
}

const MenuRow = ({ icon, label, onClick, disabled = false, danger = false, trailing }: MenuRowProps) => (
    <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={`ui-selectable ui-shape-soft w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${danger ? 'text-[var(--semantic-color-status-error)] hover:text-[var(--semantic-color-status-error)] hover:bg-[var(--semantic-color-status-error)]/10' : ''}`}
    >
        <span className="w-4 text-center text-[12px] opacity-85">{icon}</span>
        <span className="flex-1">{label}</span>
        {trailing}
    </button>
);

const TopbarActionMenu: React.FC = () => {
    const viewContext = useAppStore(state => state.viewContext);
    const currentSpaceId = useAppStore(state => state.currentSpaceId);
    const activeScope = useAppStore(state => state.activeScope);
    const fieldScopeId = useAppStore(state => state.fieldScopeId);
    const setViewContext = useAppStore(state => state.setViewContext);
    const openSettings = useAppStore(state => state.openSettings);
    const setDrawerOpen = useAppStore(state => state.setDrawerOpen);
    const setDrawerRightTab = useAppStore(state => state.setDrawerRightTab);
    const nodes = useGraphStore(state => state.nodes);
    const addNode = useGraphStore(state => state.addNode);
    const updateNode = useGraphStore(state => state.updateNode);
    const removeNode = useGraphStore(state => state.removeNode);

    const [open, setOpen] = React.useState(false);
    const [busy, setBusy] = React.useState(false);
    const [status, setStatus] = React.useState('');
    const [importTarget, setImportTarget] = React.useState<ImportTarget>(null);
    const [importAccept, setImportAccept] = React.useState(DEFAULT_IMPORT_ACCEPT);
    const [menuLayer, setMenuLayer] = React.useState<MenuLayer>('root');
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

    React.useEffect(() => {
        if (open) return;
        setMenuLayer('root');
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

    const triggerImport = (target: Exclude<ImportTarget, null>, accept: string) => {
        setImportTarget(target);
        setImportAccept(accept);
        inputRef.current?.click();
    };

    const handleImportInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const filesList = event.target.files;
        if (!filesList || filesList.length === 0) return;
        const files = Array.from(filesList);
        const target = importTarget;
        setImportTarget(null);
        setImportAccept(DEFAULT_IMPORT_ACCEPT);
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

    const handleExportSpace = (format: SpaceExportFormat) => withBusy(async () => {
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

    const handleToggleFavourite = () => {
        if (isNodeContext) {
            if (!node) return;
            const nextFavorite = !Boolean(node.data?.favorite);
            updateNode(node.id, { data: { favorite: nextFavorite } });
            setFeedback(nextFavorite ? 'Added to favourites' : 'Removed from favourites');
            setOpen(false);
            return;
        }

        if (!currentSpaceId) return;
        spaceManager.toggleFavorite(currentSpaceId);
        const nextFavorite = !Boolean(currentSpaceMeta?.favorite);
        setFeedback(nextFavorite ? 'Added to favourites' : 'Removed from favourites');
        setOpen(false);
    };

    const handleInfo = () => {
        if (isNodeContext && node) {
            const summary = [
                `Name: ${nodeLabel}`,
                `ID: ${String(node.id)}`,
                `Type: ${String(node.type ?? 'node')}`,
                `Created: ${new Date(node.created_at ?? Date.now()).toLocaleString()}`,
                `Updated: ${new Date(node.updated_at ?? Date.now()).toLocaleString()}`
            ];
            window.alert(summary.join('\n'));
            setOpen(false);
            return;
        }

        setDrawerRightTab('props');
        setDrawerOpen('right', true);
        setFeedback('Inspector opened');
        setOpen(false);
    };

    const handleOpenSettings = () => {
        openSettings(isNodeContext ? 'node' : 'space');
        setOpen(false);
    };

    const handleMoveNode = () => {
        if (!node) return;
        const currentX = Math.round(node.position.x);
        const currentY = Math.round(node.position.y);
        const nextRaw = window.prompt('Move node to coordinates (x,y)', `${currentX}, ${currentY}`);
        if (!nextRaw) return;
        const parts = nextRaw.split(',').map(item => Number.parseFloat(item.trim())).filter(value => Number.isFinite(value));
        if (parts.length !== 2) {
            window.alert('Use format: x,y');
            return;
        }
        const [nextX, nextY] = parts;
        if (nextX === undefined || nextY === undefined) return;
        updateNode(node.id, { position: { x: nextX, y: nextY } });
        setFeedback('Moved');
        setOpen(false);
    };

    const handleMoveSpace = () => {
        if (!currentSpaceId) return;
        const currentTarget = `${currentSpaceMeta?.portalBrandSlug || 'symbolfield'}/${currentSpaceMeta?.portalSlug || currentSpaceMeta?.name.toLowerCase().replace(/\s+/g, '-') || 'space'}`;
        const nextTarget = window.prompt('Move publish target (brand/portal)', currentTarget);
        if (!nextTarget) return;
        const [brandRaw, slugRaw] = nextTarget.split('/');
        const brand = (brandRaw ?? '').trim();
        const slug = (slugRaw ?? '').trim();
        if (!brand || !slug) {
            window.alert('Use format: brand/portal');
            return;
        }
        spaceManager.setSpacePortalTarget(currentSpaceId, { portalBrandSlug: brand, portalSlug: slug });
        setFeedback('Moved');
        setOpen(false);
    };

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

    const isFavorite = isNodeContext ? Boolean(node?.data?.favorite) : Boolean(currentSpaceMeta?.favorite);
    const importOptions = isNodeContext ? NODE_IMPORT_FORMAT_OPTIONS : SPACE_IMPORT_FORMAT_OPTIONS;
    const exportOptions = isNodeContext
        ? NODE_EXPORT_FORMATS.map((option) => ({
            id: option.id,
            label: option.extension.toUpperCase(),
            icon: option.id === 'markdown' ? '⌘' : option.id === 'pdf' ? '⎙' : option.id === 'html' ? '<>' : '{}'
        }))
        : (clusterExportTarget ? SPACE_CLUSTER_EXPORT_FORMATS : SPACE_EXPORT_FORMATS).map((option) => ({
            id: option.id,
            label: option.extension.toUpperCase(),
            icon: option.id === 'pdf' ? '⎙' : option.id === 'png' ? '◨' : option.id === 'html' ? '<>' : option.id === 'markdown' ? '⌘' : '{}'
        }));

    return (
        <div className="relative ml-2 shrink-0">
            <input
                ref={inputRef}
                type="file"
                className="hidden"
                multiple
                accept={importAccept}
                onChange={handleImportInput}
            />
            <button
                ref={buttonRef}
                type="button"
                aria-label="Topbar action menu"
                aria-expanded={open}
                onClick={() => setOpen(prev => !prev)}
                className="ui-selectable ui-shape-pill h-8 w-8 text-[11px] uppercase tracking-[0.14em] border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)]/55 flex items-center justify-center"
            >
                <span className="text-[15px] leading-none opacity-85">•••</span>
            </button>
            {open && (
                <div
                    ref={menuRef}
                    className="absolute left-0 top-[calc(100%+8px)] z-[var(--component-z-topbar)] min-w-[286px] rounded-[var(--primitive-radius-card)] border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)]/95 backdrop-blur-xl p-2 shadow-2xl"
                >
                    {menuLayer === 'root' ? (
                        <>
                            <MenuRow icon="✎" label="Rename" disabled={busy} onClick={isNodeContext ? handleRenameNode : handleRenameSpace} />
                            <MenuRow
                                icon="★"
                                label={isFavorite ? 'Remove from favourites' : 'Add to favourites'}
                                disabled={busy}
                                onClick={handleToggleFavourite}
                            />
                            <MenuRow icon="ⓘ" label="Info" disabled={busy} onClick={handleInfo} />
                            <MenuRow icon="⧉" label="Duplicate" disabled={busy} onClick={isNodeContext ? handleDuplicateNode : () => { void handleDuplicateSpace(); }} />
                            <MenuRow icon="↗" label="Move" disabled={busy} onClick={isNodeContext ? handleMoveNode : handleMoveSpace} />
                            <MenuRow icon="⌫" label="Delete" danger disabled={busy} onClick={isNodeContext ? handleDeleteNode : handleArchiveSpace} />
                            <div className="my-1 h-px bg-[var(--semantic-color-border-default)]/80" />
                            <MenuRow
                                icon="↓"
                                label="Import"
                                disabled={busy}
                                onClick={() => setMenuLayer('import')}
                                trailing={<span className="text-xs opacity-75">›</span>}
                            />
                            <MenuRow
                                icon="↑"
                                label="Export"
                                disabled={busy}
                                onClick={() => setMenuLayer('export')}
                                trailing={<span className="text-xs opacity-75">›</span>}
                            />
                            <div className="my-1 h-px bg-[var(--semantic-color-border-default)]/80" />
                            <MenuRow icon="⚙" label="Settings" disabled={busy} onClick={handleOpenSettings} />
                        </>
                    ) : menuLayer === 'import' ? (
                        <>
                            <MenuRow icon="←" label="Back" disabled={busy} onClick={() => setMenuLayer('root')} />
                            <div className="my-1 h-px bg-[var(--semantic-color-border-default)]/80" />
                            {importOptions.map((option) => (
                                <MenuRow
                                    key={option.id}
                                    icon={option.icon}
                                    label={option.label}
                                    disabled={busy}
                                    onClick={() => triggerImport(isNodeContext ? 'node' : 'space', option.accept)}
                                />
                            ))}
                        </>
                    ) : (
                        <>
                            <MenuRow icon="←" label="Back" disabled={busy} onClick={() => setMenuLayer('root')} />
                            <div className="my-1 h-px bg-[var(--semantic-color-border-default)]/80" />
                            {exportOptions.map((option) => (
                                <MenuRow
                                    key={option.id}
                                    icon={option.icon}
                                    label={option.label}
                                    disabled={busy}
                                    onClick={() => {
                                        if (isNodeContext) {
                                            void handleExportNode(option.id as NodeExportFormat);
                                            return;
                                        }
                                        void handleExportSpace(option.id as SpaceExportFormat);
                                    }}
                                />
                            ))}
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
