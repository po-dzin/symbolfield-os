import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { gatewayData } from '../../core/gateway/GatewayData';
import type { Listing, Brand } from '../../core/types/gateway';
import { spaceManager } from '../../core/state/SpaceManager';
import { stateEngine } from '../../core/state/StateEngine';
import { stationStorage } from '../../core/storage/StationStorage';
import { buildPortalPreviewLayout } from '../../core/gateway/portalPreview';

const PortalPage = ({ brandSlug, portalSlug }: { brandSlug: string; portalSlug: string }) => {
    const setGatewayRoute = useAppStore(state => state.setGatewayRoute);
    const [listing, setListing] = useState<Listing | null>(null);
    const [brand, setBrand] = useState<Brand | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const l = await gatewayData.getListingBySlug(brandSlug, portalSlug);
            const b = await gatewayData.getBrandBySlug(brandSlug);
            setListing(l);
            setBrand(b);
            setLoading(false);
        };
        load();
    }, [brandSlug, portalSlug]);

    if (loading) return <div className="p-10 text-center opacity-50">Loading portal...</div>;
    if (!listing || !brand) return <div className="p-10 text-center">Portal not found</div>;

    const preview = buildPortalPreviewLayout(listing.spaceSnapshot, { width: 640, height: 460, padding: 40 });
    const nodeLookup = new Map(preview.nodes.map(node => [node.id, node]));

    const handleFork = () => {
        if (!listing || !listing.spaceSnapshot) return;

        // 1. Fork the space
        const newSpaceId = spaceManager.forkSpace(listing.spaceSnapshot, listing.title);

        // 2. Navigate to it
        // We need to switch context to SPACE and load the new space
        stateEngine.setViewContext('space'); // This might be redundant as setSpace does it, but to be sure
        spaceManager.loadSpace(newSpaceId);

        // 3. Clear Gateway route to exit Gateway mode completely
        setGatewayRoute(null);
    };

    return (
        <div className="max-w-6xl mx-auto p-6 md:p-12 animate-fade-in flex flex-col md:flex-row gap-12">

            {/* Left: Metadata & Actions */}
            <div className="flex-1 max-w-md">
                <button
                    onClick={() => setGatewayRoute({ type: 'brand', slug: brandSlug })}
                    className="flex items-center gap-2 text-sm text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)] mb-6 transition-colors"
                >
                    ← Back to {brand.name}
                </button>

                <div className="aspect-video bg-[var(--semantic-color-bg-surface-hover)] rounded-xl mb-6 flex items-center justify-center text-6xl relative overflow-hidden border border-[var(--semantic-color-border-default)]">
                    {listing.type === 'map' ? '🗺️' : listing.type === 'course' ? '🎓' : '📦'}
                </div>

                <h1 className="text-4xl font-light mb-2">{listing.title}</h1>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200">
                        {brand.avatar && <img src={brand.avatar} alt={brand.name} />}
                    </div>
                    <span className="text-sm font-medium">{brand.name}</span>
                </div>

                <p className="text-lg text-[var(--semantic-color-text-muted)] leading-relaxed mb-8">
                    {listing.description}
                </p>

                <div className="flex gap-4">
                    <button
                        onClick={handleFork}
                        className="flex-1 py-3 px-6 rounded-lg bg-[var(--semantic-color-action-primary)] text-[var(--semantic-color-action-on-primary)] font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                        <span>Fork Space</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            stationStorage.upsertExternalGraphLink(
                                { type: 'portal', brandSlug, portalSlug },
                                { label: listing.title, visibility: 'private' }
                            );
                        }}
                        className="py-3 px-6 rounded-lg border border-[var(--semantic-color-border-default)] hover:bg-[var(--semantic-color-bg-surface-hover)] transition-colors"
                    >
                        Save Link
                    </button>
                </div>

                <div className="mt-8 pt-8 border-t border-[var(--semantic-color-border-default)]/50 grid grid-cols-2 gap-4 text-sm text-[var(--semantic-color-text-secondary)]">
                    <div>
                        <div className="opacity-50 text-xs uppercase tracking-wider mb-1">Type</div>
                        <div className="capitalize">{listing.type}</div>
                    </div>
                    <div>
                        <div className="opacity-50 text-xs uppercase tracking-wider mb-1">Last Updated</div>
                        <div>{new Date(listing.stats?.updatedAt || 0).toLocaleDateString()}</div>
                    </div>
                    <div>
                        <div className="opacity-50 text-xs uppercase tracking-wider mb-1">Views</div>
                        <div>{listing.stats?.views}</div>
                    </div>
                    <div>
                        <div className="opacity-50 text-xs uppercase tracking-wider mb-1">Forks</div>
                        <div>{listing.stats?.forks}</div>
                    </div>
                </div>
            </div>

            {/* Right: Read-only subgraph preview */}
            <div className="flex-1 bg-[var(--semantic-color-bg-surface)] rounded-2xl border border-[var(--semantic-color-border-default)] p-5 min-h-[500px]">
                <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--semantic-color-text-muted)]">Portal Preview</div>
                        <div className="text-sm text-[var(--semantic-color-text-secondary)]">Read-only subgraph snapshot</div>
                    </div>
                    <div className="text-[11px] text-[var(--semantic-color-text-muted)]">
                        Nodes {preview.nodes.length} · Links {preview.edges.length}
                    </div>
                </div>
                {preview.nodes.length === 0 ? (
                    <div className="h-[430px] rounded-xl border border-dashed border-[var(--semantic-color-border-default)] flex items-center justify-center text-sm text-[var(--semantic-color-text-muted)]">
                        Listing has no snapshot data yet.
                    </div>
                ) : (
                    <svg
                        viewBox="0 0 640 460"
                        className="w-full h-[430px] rounded-xl border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-app)]/25"
                        aria-label="Read-only subgraph preview"
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
                                    strokeOpacity="0.75"
                                    strokeWidth="1.2"
                                />
                            );
                        })}
                        {preview.nodes.map((node) => {
                            const isCore = node.type === 'core';
                            return (
                                <circle
                                    key={node.id}
                                    cx={node.x}
                                    cy={node.y}
                                    r={isCore ? 12 : 8}
                                    fill={isCore ? 'var(--semantic-color-action-primary)' : 'var(--semantic-color-bg-surface-hover)'}
                                    stroke="var(--semantic-color-border-default)"
                                    strokeWidth={isCore ? 2 : 1.2}
                                />
                            );
                        })}
                    </svg>
                )}
                <div className="mt-3 text-[11px] text-[var(--semantic-color-text-muted)]">
                    Preview is view-only in MVP v0.5.
                </div>
            </div>

        </div>
    );
};

export default PortalPage;
