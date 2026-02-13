import React, { useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { useGraphStore } from '../../../store/useGraphStore';
import { buildShareUrl, shareService } from '../../../core/share/ShareService';
import { stationStorage } from '../../../core/storage/StationStorage';
import { EntitlementLimitError } from '../../../core/access/EntitlementsService';
import {
    exportNodeToFile,
    NODE_EXPORT_FORMATS,
    type NodeExportFormat
} from '../../../core/export/NodeExportService';

const NodeProperties = () => {
    const activeScope = useAppStore(state => state.activeScope);
    const currentSpaceId = useAppStore(state => state.currentSpaceId);
    const nodes = useGraphStore(state => state.nodes);
    const [copied, setCopied] = useState(false);
    const [exportMenuOpen, setExportMenuOpen] = useState(false);
    const [exportingFormat, setExportingFormat] = useState<NodeExportFormat | null>(null);

    // Find the active node
    const node = nodes.find(n => n.id === activeScope);

    if (!node) {
        return (
            <div className="p-4 text-[var(--semantic-color-text-muted)] text-sm">
                No node selected.
            </div>
        );
    }

    const { label, type } = node.data || {};
    const displayLabel = typeof label === 'string' && label.trim() ? label.trim() : 'Node';

    const handleCreateShare = async () => {
        if (!currentSpaceId) return;
        const scopeType = node.type === 'cluster' ? 'cluster' : 'node';
        let shareUrl = '';
        try {
            const link = await shareService.createShareLinkAsync({
                title: displayLabel,
                scopeType,
                spaceId: currentSpaceId,
                scopeNodeId: node.id
            });
            if (!link) return;
            stationStorage.upsertExternalGraphLink(
                { type: 'share', token: link.token },
                { label: `${displayLabel} (${scopeType})`, visibility: 'shared' }
            );
            shareUrl = buildShareUrl(link.token);
            if (!shareUrl) return;
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1400);
        } catch (error) {
            if (error instanceof EntitlementLimitError) {
                window.alert(error.message);
                return;
            }
            if (shareUrl) {
                window.prompt('Copy share link', shareUrl);
                return;
            }
            window.alert('Unable to create share link right now.');
        }
    };

    const handleExport = async (format: NodeExportFormat) => {
        setExportingFormat(format);
        try {
            const exported = await exportNodeToFile({
                format,
                node,
                spaceId: currentSpaceId
            });
            if (!exported) {
                window.alert('Export is unavailable in this environment.');
            }
        } catch {
            window.alert('Unable to export node right now.');
        } finally {
            setExportingFormat(null);
            setExportMenuOpen(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Header / Identity */}
            <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wider text-[var(--semantic-color-text-muted)] font-mono">
                    Node Label
                </label>
                <input
                    type="text"
                    defaultValue={typeof label === 'string' ? label : ''}
                    className="ui-field-soft w-full px-3 py-2 text-[var(--semantic-color-text-primary)] font-medium text-base"
                />
            </div>

            {/* Type & Tags */}
            <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wider text-[var(--semantic-color-text-muted)] font-mono">
                    Type
                </label>
                <div className="flex items-center gap-2">
                    <span className="ui-shape-soft px-2 py-1 bg-[var(--semantic-color-bg-surface-hover)] text-xs font-mono text-[var(--semantic-color-text-secondary)] border border-[var(--semantic-color-border-default)]">
                        {typeof type === 'string' ? type : 'generic'}
                    </span>
                </div>
            </div>

            {/* Position */}
            <div className="p-4 rounded-[var(--primitive-radius-md)] bg-[var(--semantic-color-bg-surface-hover)] flex flex-col gap-3">
                <div className="flex justify-between text-xs">
                    <span className="text-[var(--semantic-color-text-muted)]">ID</span>
                    <span className="font-mono text-[var(--semantic-color-text-secondary)] opacity-70 truncate max-w-[120px]" title={node.id}>
                        {node.id}
                    </span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-[var(--semantic-color-text-muted)]">Position X</span>
                    <span className="font-mono text-[var(--semantic-color-text-secondary)]">
                        {Math.round(node.position.x)}
                    </span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-[var(--semantic-color-text-muted)]">Position Y</span>
                    <span className="font-mono text-[var(--semantic-color-text-secondary)]">
                        {Math.round(node.position.y)}
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-4 border-t border-[var(--semantic-color-border-default)]">
                <button
                    type="button"
                    onClick={() => { void handleCreateShare(); }}
                    className="ui-selectable ui-shape-soft w-full py-2 px-4 text-sm font-medium text-[var(--semantic-color-text-secondary)] flex items-center justify-center gap-2"
                >
                    <span>{copied ? 'Share Link Copied' : 'Create Share Link'}</span>
                </button>
                <button className="ui-selectable ui-shape-soft w-full py-2 px-4 text-sm font-medium text-[var(--semantic-color-text-secondary)] flex items-center justify-center gap-2">
                    <span>Convert Type...</span>
                </button>
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setExportMenuOpen(prev => !prev)}
                        disabled={Boolean(exportingFormat)}
                        className="ui-selectable ui-shape-soft w-full py-2 px-4 text-sm font-medium text-[var(--semantic-color-text-secondary)] flex items-center justify-center gap-2"
                    >
                        <span>{exportingFormat ? `Exporting ${exportingFormat.toUpperCase()}...` : 'Export Node'}</span>
                    </button>
                    {exportMenuOpen && (
                        <div className="absolute left-0 right-0 mt-1 z-10 rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)]/95 backdrop-blur-xl p-1">
                            {NODE_EXPORT_FORMATS.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => { void handleExport(option.id); }}
                                    className="ui-selectable ui-shape-soft w-full py-2 px-3 text-xs text-left uppercase tracking-[0.12em] text-[var(--semantic-color-text-secondary)]"
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <button className="ui-selectable ui-shape-soft w-full py-2 px-4 text-sm font-medium text-[var(--semantic-color-status-error)] hover:bg-[var(--semantic-color-status-error)]/10 flex items-center justify-center gap-2">
                    <span>Delete Node</span>
                </button>
            </div>
        </div>
    );
};

export default NodeProperties;
