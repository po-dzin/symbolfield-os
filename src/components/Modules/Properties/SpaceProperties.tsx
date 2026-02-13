import React, { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { spaceManager } from '../../../core/state/SpaceManager';
import { buildShareUrl, shareService } from '../../../core/share/ShareService';
import { stationStorage } from '../../../core/storage/StationStorage';
import { EntitlementLimitError } from '../../../core/access/EntitlementsService';
import { publishedSpacesStorage } from '../../../core/gateway/PublishedSpacesStorage';
import type { ExternalGraphLinkVisibility } from '../../../core/types/gateway';
import { collectClusterDescendantIds } from '../../../core/graph/clusterHierarchy';
import { asNodeId } from '../../../core/types';
import {
    exportSpaceToFile,
    SPACE_CLUSTER_EXPORT_FORMATS,
    type SpaceClusterExportFormat
} from '../../../core/export/SpaceExportService';

const ACCESS_LEVELS: ExternalGraphLinkVisibility[] = ['private', 'shared', 'public'];

const slugify = (value: string): string => (
    value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
);

const SpaceProperties = () => {
    const viewContext = useAppStore(state => state.viewContext);
    const currentSpaceId = useAppStore(state => state.currentSpaceId);
    const stationInspectorSpaceId = useAppStore(state => state.stationInspectorSpaceId);
    const activeScope = useAppStore(state => state.activeScope);
    const setGatewayRoute = useAppStore(state => state.setGatewayRoute);
    const setViewContext = useAppStore(state => state.setViewContext);
    const inspectedSpaceId = viewContext === 'home' ? stationInspectorSpaceId : currentSpaceId;
    const [copied, setCopied] = useState(false);
    const [publishStatus, setPublishStatus] = useState('');
    const [accessLevelDraft, setAccessLevelDraft] = useState<ExternalGraphLinkVisibility>('private');
    const [portalBrandDraft, setPortalBrandDraft] = useState('symbolfield');
    const [portalSlugDraft, setPortalSlugDraft] = useState('');
    const [exportMenuOpen, setExportMenuOpen] = useState(false);
    const [exportingFormat, setExportingFormat] = useState<SpaceClusterExportFormat | null>(null);

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
    const exportTarget = useMemo(() => {
        if (!inspectedSpaceId || !spaceData) return null;
        if (viewContext === 'space' && activeScope) {
            const clusterNode = spaceData.nodes.find(
                node => String(node.id) === String(activeScope) && node.type === 'cluster'
            );
            if (clusterNode) {
                const descendants = collectClusterDescendantIds(
                    asNodeId(String(clusterNode.id)),
                    spaceData.nodes,
                    spaceData.edges,
                    { includeEdgeLinked: true }
                );
                const scopedIds = new Set<string>([String(clusterNode.id)]);
                descendants.forEach((id) => scopedIds.add(String(id)));
                const scopedNodes = spaceData.nodes.filter(node => scopedIds.has(String(node.id)));
                const scopedEdges = spaceData.edges.filter(edge => (
                    scopedIds.has(String(edge.source)) && scopedIds.has(String(edge.target))
                ));
                const clusterLabel = typeof clusterNode.data?.label === 'string' && clusterNode.data.label.trim()
                    ? clusterNode.data.label.trim()
                    : 'Cluster';
                return {
                    scope: 'cluster' as const,
                    title: clusterLabel,
                    description: `Cluster export from ${meta?.name ?? 'Space'}`,
                    data: {
                        spaceId: inspectedSpaceId,
                        nodes: scopedNodes,
                        edges: scopedEdges,
                        version: 1
                    }
                };
            }
        }

        return {
            scope: 'space' as const,
            title: meta?.name ?? 'Space',
            description: meta?.description,
            data: spaceData
        };
    }, [inspectedSpaceId, spaceData, viewContext, activeScope, meta?.name, meta?.description]);

    useEffect(() => {
        if (!meta) return;
        setAccessLevelDraft(meta.accessLevel ?? 'private');
        setPortalBrandDraft(meta.portalBrandSlug?.trim() || 'symbolfield');
        setPortalSlugDraft(meta.portalSlug?.trim() || slugify(meta.name));
    }, [meta?.id, meta?.name, meta?.accessLevel, meta?.portalBrandSlug, meta?.portalSlug]);

    const handleCreateShare = async () => {
        if (!inspectedSpaceId || !meta) return;
        let shareUrl = '';
        try {
            const link = await shareService.createShareLinkAsync({
                title: meta.name,
                scopeType: 'space',
                spaceId: inspectedSpaceId,
                visibility: accessLevelDraft
            });
            if (!link) return;
            stationStorage.upsertExternalGraphLink(
                { type: 'share', token: link.token },
                { label: `${meta.name} (Shared)`, visibility: accessLevelDraft }
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

    const handlePublishToPortal = () => {
        if (!inspectedSpaceId || !meta || !spaceData) return;
        const brandSlug = slugify(portalBrandDraft || 'symbolfield');
        const normalizedPortalSlug = slugify(portalSlugDraft || meta.name);
        if (!brandSlug || !normalizedPortalSlug) {
            window.alert('Set valid brand and portal slugs before publishing.');
            return;
        }

        spaceManager.setSpacePortalTarget(inspectedSpaceId, {
            portalBrandSlug: brandSlug,
            portalSlug: normalizedPortalSlug
        });

        const published = publishedSpacesStorage.upsertPublishedSpace({
            spaceId: inspectedSpaceId,
            brandSlug,
            portalSlug: normalizedPortalSlug,
            title: meta.name,
            description: meta.description ?? '',
            visibility: accessLevelDraft,
            type: 'map',
            tags: ['space', 'published'],
            spaceSnapshot: spaceData
        });
        if (!published) {
            window.alert('Unable to publish this space right now.');
            return;
        }

        stationStorage.upsertExternalGraphLink(
            { type: 'portal', brandSlug, portalSlug: normalizedPortalSlug },
            { label: `${meta.name} Portal`, visibility: accessLevelDraft }
        );

        if (accessLevelDraft === 'private') {
            setPublishStatus('Published privately');
            return;
        }

        setPublishStatus('Published to portal');
        setGatewayRoute({
            type: 'portal',
            brandSlug,
            portalSlug: normalizedPortalSlug
        });
        setViewContext('gateway');
    };

    const handleExport = async (format: SpaceClusterExportFormat) => {
        if (!inspectedSpaceId || !meta || !exportTarget) return;
        setExportingFormat(format);
        try {
            const exported = await exportSpaceToFile({
                format,
                spaceId: inspectedSpaceId,
                spaceName: exportTarget.title,
                data: exportTarget.data,
                ...(exportTarget.description !== undefined ? { description: exportTarget.description } : {})
            });
            if (!exported) {
                window.alert('Export is unavailable in this environment.');
                return;
            }
            setPublishStatus(`Exported ${exportTarget.scope} (${format.toUpperCase()})`);
        } catch {
            window.alert('Unable to export this space right now.');
        } finally {
            setExportingFormat(null);
            setExportMenuOpen(false);
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
                    onBlur={(event) => {
                        if (!inspectedSpaceId) return;
                        spaceManager.renameSpace(inspectedSpaceId, event.currentTarget.value || meta.name);
                    }}
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
                    onBlur={(event) => {
                        if (!inspectedSpaceId) return;
                        spaceManager.setSpaceDescription(inspectedSpaceId, event.currentTarget.value);
                    }}
                    className="ui-field-soft w-full p-3 text-sm resize-none"
                    placeholder="Add a description..."
                />
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wider text-[var(--semantic-color-text-muted)] font-mono">
                    Access Level
                </label>
                <div className="flex items-center gap-2">
                    {ACCESS_LEVELS.map(level => (
                        <button
                            key={level}
                            type="button"
                            onClick={() => {
                                if (!inspectedSpaceId) return;
                                spaceManager.setSpaceAccessLevel(inspectedSpaceId, level);
                                setAccessLevelDraft(level);

                                const shareSync = shareService.updateShareVisibilityBySpace(inspectedSpaceId, level);
                                shareSync.links.forEach((link) => {
                                    stationStorage.upsertExternalGraphLink(
                                        { type: 'share', token: link.token },
                                        { label: `${link.title} (Shared)`, visibility: level }
                                    );
                                });

                                const publishSync = publishedSpacesStorage.updateVisibilityBySpaceId(inspectedSpaceId, level);
                                publishSync.records.forEach((record) => {
                                    stationStorage.upsertExternalGraphLink(
                                        { type: 'portal', brandSlug: record.brandSlug, portalSlug: record.portalSlug },
                                        { label: `${record.title} Portal`, visibility: level }
                                    );
                                });

                                if (shareSync.updatedCount > 0 || publishSync.updatedCount > 0) {
                                    const syncedItems = shareSync.updatedCount + publishSync.updatedCount;
                                    setPublishStatus(`Access synced (${syncedItems})`);
                                }
                            }}
                            data-state={accessLevelDraft === level ? 'active' : 'inactive'}
                            className="ui-selectable ui-shape-pill px-3 py-1.5 text-[11px] uppercase tracking-[0.14em]"
                        >
                            {level}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-4 rounded-[var(--primitive-radius-md)] bg-[var(--semantic-color-bg-surface-hover)] flex flex-col gap-3">
                <div className="text-xs uppercase tracking-wider text-[var(--semantic-color-text-muted)] font-mono">
                    Portal Publish Target
                </div>
                <input
                    key={`space-portal-brand-${inspectedSpaceId ?? 'none'}`}
                    type="text"
                    value={portalBrandDraft}
                    onChange={(event) => setPortalBrandDraft(event.currentTarget.value)}
                    onBlur={(event) => {
                        if (!inspectedSpaceId) return;
                        const normalizedBrand = slugify(event.currentTarget.value || portalBrandDraft);
                        setPortalBrandDraft(normalizedBrand);
                        spaceManager.setSpacePortalTarget(inspectedSpaceId, {
                            portalBrandSlug: normalizedBrand,
                            portalSlug: portalSlugDraft
                        });
                    }}
                    className="ui-field-soft w-full px-3 py-2 text-sm"
                    placeholder="brand slug"
                />
                <input
                    key={`space-portal-slug-${inspectedSpaceId ?? 'none'}`}
                    type="text"
                    value={portalSlugDraft}
                    onChange={(event) => setPortalSlugDraft(event.currentTarget.value)}
                    onBlur={(event) => {
                        if (!inspectedSpaceId) return;
                        const normalizedPortalSlug = slugify(event.currentTarget.value || portalSlugDraft || meta.name);
                        setPortalSlugDraft(normalizedPortalSlug);
                        spaceManager.setSpacePortalTarget(inspectedSpaceId, {
                            portalBrandSlug: portalBrandDraft,
                            portalSlug: normalizedPortalSlug
                        });
                    }}
                    className="ui-field-soft w-full px-3 py-2 text-sm"
                    placeholder="portal slug"
                />
                <div className="text-[11px] text-[var(--semantic-color-text-muted)]">
                    Route preview: /{slugify(portalBrandDraft || 'symbolfield')}/{slugify(portalSlugDraft || meta.name || 'space')}
                </div>
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
                <button
                    type="button"
                    onClick={handlePublishToPortal}
                    className="ui-selectable ui-shape-soft w-full py-2 px-4 text-sm font-medium text-[var(--semantic-color-text-secondary)] flex items-center justify-center gap-2"
                >
                    <span>{publishStatus || 'Publish Space to Brand Portal'}</span>
                </button>
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setExportMenuOpen(prev => !prev)}
                        disabled={Boolean(exportingFormat)}
                        className="ui-selectable ui-shape-soft w-full py-2 px-4 text-sm font-medium text-[var(--semantic-color-text-secondary)] flex items-center justify-center gap-2"
                    >
                        <span>
                            {exportingFormat
                                ? `Exporting ${exportingFormat.toUpperCase()}...`
                                : exportTarget?.scope === 'cluster'
                                    ? 'Export Cluster'
                                    : 'Export Space'}
                        </span>
                    </button>
                    {exportMenuOpen && (
                        <div className="absolute left-0 right-0 mt-1 z-10 rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)]/95 backdrop-blur-xl p-1">
                            {SPACE_CLUSTER_EXPORT_FORMATS.map((option) => (
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
                    <span>Archive Space</span>
                </button>
            </div>
        </div>
    );
};

export default SpaceProperties;
