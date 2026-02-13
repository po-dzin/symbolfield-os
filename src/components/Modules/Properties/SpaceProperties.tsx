import React, { useMemo, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { spaceManager } from '../../../core/state/SpaceManager';
import { buildShareUrl, shareService } from '../../../core/share/ShareService';
import { stationStorage } from '../../../core/storage/StationStorage';

const SpaceProperties = () => {
    const viewContext = useAppStore(state => state.viewContext);
    const currentSpaceId = useAppStore(state => state.currentSpaceId);
    const stationInspectorSpaceId = useAppStore(state => state.stationInspectorSpaceId);
    const inspectedSpaceId = viewContext === 'home' ? stationInspectorSpaceId : currentSpaceId;
    const [copied, setCopied] = useState(false);

    const meta = useMemo(
        () => (inspectedSpaceId ? spaceManager.getSpaceMeta(inspectedSpaceId) : undefined),
        [inspectedSpaceId]
    );
    const spaceData = useMemo(
        () => (inspectedSpaceId ? spaceManager.getSpaceData(inspectedSpaceId) : null),
        [inspectedSpaceId]
    );
    const nodeCount = spaceData?.nodes.length ?? 0;
    const edgeCount = spaceData?.edges.length ?? 0;
    const clusterCount = spaceData?.nodes?.filter(node => node.type === 'cluster').length ?? 0;

    const handleCreateShare = async () => {
        if (!inspectedSpaceId || !meta) return;
        const link = shareService.createShareLink({
            title: meta.name,
            scopeType: 'space',
            spaceId: inspectedSpaceId
        });
        if (!link) return;
        stationStorage.upsertExternalGraphLink(
            { type: 'share', token: link.token },
            { label: `${meta.name} (Shared)`, visibility: 'shared' }
        );
        const url = buildShareUrl(link.token);
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1400);
        } catch {
            window.prompt('Copy share link', url);
        }
    };

    if (!meta) {
        return (
            <div className="p-4 text-[var(--semantic-color-text-muted)] text-sm">
                {viewContext === 'home' ? 'Select a space on station map to inspect.' : 'No space selected.'}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header / Identity */}
            <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wider text-[var(--semantic-color-text-muted)] font-mono">
                    Space Name
                </label>
                <input
                    key={`space-name-${inspectedSpaceId ?? 'none'}`}
                    type="text"
                    defaultValue={meta.name ?? ''}
                    className="ui-field-soft w-full px-3 py-2 text-[var(--semantic-color-text-primary)] font-medium text-base"
                />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wider text-[var(--semantic-color-text-muted)] font-mono">
                    Description
                </label>
                <textarea
                    key={`space-description-${inspectedSpaceId ?? 'none'}`}
                    defaultValue={meta.description ?? ''}
                    rows={4}
                    className="ui-field-soft w-full p-3 text-sm resize-none"
                    placeholder="Add a description..."
                />
            </div>

            {/* Stats / Metadata */}
            <div className="p-4 rounded-[var(--primitive-radius-md)] bg-[var(--semantic-color-bg-surface-hover)] flex flex-col gap-3">
                <div className="flex justify-between text-xs">
                    <span className="text-[var(--semantic-color-text-muted)]">ID</span>
                    <span className="font-mono text-[var(--semantic-color-text-secondary)] opacity-70 truncate max-w-[120px]" title={inspectedSpaceId ?? ''}>
                        {inspectedSpaceId}
                    </span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-[var(--semantic-color-text-muted)]">Created</span>
                    <span className="text-[var(--semantic-color-text-secondary)]">
                        {meta.createdAt ? new Date(meta.createdAt).toLocaleDateString() : '—'}
                    </span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-[var(--semantic-color-text-muted)]">Updated</span>
                    <span className="text-[var(--semantic-color-text-secondary)]">
                        {meta.updatedAt ? new Date(meta.updatedAt).toLocaleDateString() : '—'}
                    </span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-[var(--semantic-color-text-muted)]">Nodes</span>
                    <span className="text-[var(--semantic-color-text-secondary)]">
                        {nodeCount}
                    </span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-[var(--semantic-color-text-muted)]">Edges</span>
                    <span className="text-[var(--semantic-color-text-secondary)]">
                        {edgeCount}
                    </span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-[var(--semantic-color-text-muted)]">Clusters</span>
                    <span className="text-[var(--semantic-color-text-secondary)]">
                        {clusterCount}
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
                    <span>Export Space</span>
                </button>
                <button className="ui-selectable ui-shape-soft w-full py-2 px-4 text-sm font-medium text-[var(--semantic-color-status-error)] hover:bg-[var(--semantic-color-status-error)]/10 flex items-center justify-center gap-2">
                    <span>Archive Space</span>
                </button>
            </div>
        </div>
    );
};

export default SpaceProperties;
