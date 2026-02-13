import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useGraphStore } from '../../store/useGraphStore';
import { buildShareUrl, shareService } from '../../core/share/ShareService';
import { stationStorage } from '../../core/storage/StationStorage';
import { spaceManager } from '../../core/state/SpaceManager';

const TopbarShareButton = () => {
    const viewContext = useAppStore(state => state.viewContext);
    const currentSpaceId = useAppStore(state => state.currentSpaceId);
    const activeScope = useAppStore(state => state.activeScope);
    const fieldScopeId = useAppStore(state => state.fieldScopeId);
    const nodes = useGraphStore(state => state.nodes);

    const [busy, setBusy] = React.useState(false);
    const [copied, setCopied] = React.useState(false);

    const node = React.useMemo(() => {
        if (viewContext !== 'node' || !activeScope) return null;
        return nodes.find(item => String(item.id) === String(activeScope)) ?? null;
    }, [viewContext, activeScope, nodes]);

    const currentSpaceMeta = React.useMemo(
        () => (currentSpaceId ? spaceManager.getSpaceMeta(currentSpaceId) : undefined),
        [currentSpaceId]
    );

    const clusterNode = React.useMemo(() => {
        if (viewContext !== 'cluster' || !fieldScopeId) return null;
        return nodes.find(item => String(item.id) === String(fieldScopeId) && item.type === 'cluster') ?? null;
    }, [viewContext, fieldScopeId, nodes]);

    if (viewContext !== 'space' && viewContext !== 'cluster' && viewContext !== 'node') {
        return null;
    }

    const handleShare = async () => {
        if (busy || !currentSpaceId) return;
        setBusy(true);

        try {
            let title = currentSpaceMeta?.name ?? 'Space';
            let scopeType: 'space' | 'cluster' | 'node' = 'space';
            let scopeNodeId: string | null = null;
            let visibility = currentSpaceMeta?.accessLevel ?? 'shared';

            if (viewContext === 'node' && node) {
                scopeType = node.type === 'cluster' ? 'cluster' : 'node';
                scopeNodeId = String(node.id);
                title = (typeof node.data?.label === 'string' && node.data.label.trim())
                    ? node.data.label.trim()
                    : `Node ${String(node.id).slice(0, 8)}`;
                visibility = 'shared';
            } else if (viewContext === 'cluster' && fieldScopeId) {
                scopeType = 'cluster';
                scopeNodeId = String(fieldScopeId);
                title = (typeof clusterNode?.data?.label === 'string' && clusterNode.data.label.trim())
                    ? clusterNode.data.label.trim()
                    : 'Cluster';
                visibility = currentSpaceMeta?.accessLevel ?? 'shared';
            }

            const link = await shareService.createShareLinkAsync({
                title,
                scopeType,
                spaceId: currentSpaceId,
                scopeNodeId,
                visibility
            });

            if (!link) return;

            stationStorage.upsertExternalGraphLink(
                { type: 'share', token: link.token },
                {
                    label: `${title} (${scopeType})`,
                    visibility
                }
            );

            const url = buildShareUrl(link.token);
            if (!url) return;

            try {
                await navigator.clipboard.writeText(url);
            } catch {
                window.prompt('Copy share link', url);
            }

            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            type="button"
            onClick={() => { void handleShare(); }}
            disabled={busy}
            className="ui-shape-pill h-8 px-3 border border-[var(--semantic-color-action-primary)] bg-[var(--semantic-color-action-primary)] text-[var(--semantic-color-action-on-primary)] inline-flex items-center gap-1.5 text-xs font-medium tracking-[0.04em] shadow-sm disabled:opacity-70"
            title="Create share link"
        >
            <span className="text-[11px] leading-none">🔒</span>
            <span>{copied ? 'Copied' : 'Share'}</span>
        </button>
    );
};

export default TopbarShareButton;
