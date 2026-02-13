import React, { useEffect, useMemo, useState } from 'react';
import { spaceManager } from '../../core/state/SpaceManager';
import { stateEngine } from '../../core/state/StateEngine';
import { buildPortalPreviewLayout } from '../../core/gateway/portalPreview';
import { buildShareUrl, shareService, type ShareLinkSnapshot } from '../../core/share/ShareService';
import { useAppStore } from '../../store/useAppStore';
import { EntitlementLimitError } from '../../core/access/EntitlementsService';

const SharePage = ({ token }: { token: string }) => {
    const setGatewayRoute = useAppStore(state => state.setGatewayRoute);
    const setViewContext = useAppStore(state => state.setViewContext);
    const [shareLink, setShareLink] = useState<ShareLinkSnapshot | null>(null);
    const [loadingShare, setLoadingShare] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoadingShare(true);
        void (async () => {
            const next = await shareService.resolveShareLinkByTokenAsync(token);
            if (cancelled) return;
            setShareLink(next);
            setLoadingShare(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [token]);

    const preview = useMemo(
        () => buildPortalPreviewLayout(
            shareLink
                ? { nodes: shareLink.nodes, edges: shareLink.edges }
                : undefined,
            { width: 960, height: 560, padding: 48 }
        ),
        [shareLink]
    );
    const nodeLookup = useMemo(
        () => new Map(preview.nodes.map(node => [node.id, node])),
        [preview]
    );

    const handleCopyLink = async () => {
        if (!shareLink) return;
        const url = buildShareUrl(shareLink.token);
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1400);
        } catch {
            window.prompt('Copy share link', url);
        }
    };

    const handleFork = () => {
        if (!shareLink) return;
        try {
            const forkId = spaceManager.forkSpace(
                { nodes: shareLink.nodes, edges: shareLink.edges },
                `${shareLink.title} (Shared)`
            );
            stateEngine.setViewContext('space');
            void spaceManager.loadSpace(forkId);
            setGatewayRoute(null);
        } catch (error) {
            if (error instanceof EntitlementLimitError) {
                window.alert(error.message);
                return;
            }
            window.alert('Unable to fork shared graph right now.');
        }
    };

    if (loadingShare) {
        return <div className="p-10 text-center opacity-50">Resolving shared graph…</div>;
    }

    if (!shareLink) {
        return (
            <div className="max-w-4xl mx-auto p-10 md:p-16">
                <div className="rounded-2xl border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)] p-8 text-center">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--semantic-color-text-muted)] mb-3">
                        Share Link
                    </div>
                    <h1 className="text-3xl font-light mb-3">Shared graph not found</h1>
                    <p className="text-sm text-[var(--semantic-color-text-muted)] mb-6">
                        This token is unavailable in the current workspace storage.
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setGatewayRoute({ type: 'atlas' });
                            setViewContext('gateway');
                        }}
                        className="ui-selectable ui-shape-pill px-4 py-2 text-sm"
                    >
                        Open Atlas
                    </button>
                </div>
            </div>
        );
    }

    if (shareLink.visibility === 'private') {
        return (
            <div className="max-w-4xl mx-auto p-10 md:p-16">
                <div className="rounded-2xl border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)] p-8 text-center">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--semantic-color-text-muted)] mb-3">
                        Share Link
                    </div>
                    <h1 className="text-3xl font-light mb-3">Access Restricted</h1>
                    <p className="text-sm text-[var(--semantic-color-text-muted)] mb-6">
                        This shared graph is currently set to private.
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setGatewayRoute({ type: 'atlas' });
                            setViewContext('gateway');
                        }}
                        className="ui-selectable ui-shape-pill px-4 py-2 text-sm"
                    >
                        Open Atlas
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 md:p-12 animate-fade-in flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--semantic-color-text-muted)] mb-2">
                        Read-only Shared Subgraph
                    </div>
                    <h1 className="text-4xl font-light">{shareLink.title}</h1>
                    <p className="mt-2 text-sm text-[var(--semantic-color-text-muted)]">
                        Scope {shareLink.scopeType.toUpperCase()} · Nodes {shareLink.nodes.length} · Links {shareLink.edges.length}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleCopyLink}
                        className="ui-selectable ui-shape-pill px-4 py-2 text-sm"
                    >
                        {copied ? 'Copied' : 'Copy Link'}
                    </button>
                    <button
                        type="button"
                        onClick={handleFork}
                        className="ui-selectable ui-shape-pill px-4 py-2 text-sm"
                    >
                        Fork to Station
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)] p-4 md:p-6">
                {preview.nodes.length === 0 ? (
                    <div className="h-[560px] rounded-xl border border-dashed border-[var(--semantic-color-border-default)] flex items-center justify-center text-sm text-[var(--semantic-color-text-muted)]">
                        No nodes in shared scope.
                    </div>
                ) : (
                    <svg
                        viewBox="0 0 960 560"
                        className="w-full h-[560px] rounded-xl border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-app)]/25"
                        aria-label="Read-only shared graph"
                    >
                        {preview.edges.map((edge) => {
                            const source = nodeLookup.get(edge.source);
                            const target = nodeLookup.get(edge.target);
                            if (!source || !target) return null;
                            return (
                                <line
                                    key={edge.id}
                                    x1={source.x}
                                    y1={source.y}
                                    x2={target.x}
                                    y2={target.y}
                                    stroke="var(--semantic-color-border-default)"
                                    strokeOpacity="0.74"
                                    strokeWidth="1.2"
                                />
                            );
                        })}
                        {preview.nodes.map((node) => {
                            const isCore = node.type === 'core';
                            const isCluster = node.type === 'cluster';
                            return (
                                <circle
                                    key={node.id}
                                    cx={node.x}
                                    cy={node.y}
                                    r={isCore ? 12 : isCluster ? 10 : 8}
                                    fill={isCore ? 'var(--semantic-color-action-primary)' : 'var(--semantic-color-bg-surface-hover)'}
                                    stroke="var(--semantic-color-border-default)"
                                    strokeWidth={isCore ? 2 : 1.2}
                                />
                            );
                        })}
                    </svg>
                )}
            </div>
        </div>
    );
};

export default SharePage;
