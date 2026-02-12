import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { mockCloud } from '../../core/gateway/MockCloud';
import type { Brand, Listing } from '../../core/types/gateway';
import { stationStorage } from '../../core/storage/StationStorage';

const BrandPage = ({ brandSlug }: { brandSlug: string }) => {
    const setGatewayRoute = useAppStore(state => state.setGatewayRoute);
    const [brand, setBrand] = useState<Brand | null>(null);
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const b = await mockCloud.getBrandBySlug(brandSlug);
            setBrand(b);
            if (b) {
                const l = await mockCloud.getBrandListings(b.id);
                setListings(l);
            }
            setLoading(false);
        };
        load();
    }, [brandSlug]);

    if (loading) return <div className="p-10 text-center opacity-50">Loading showroom...</div>;
    if (!brand) return <div className="p-10 text-center">Brand not found</div>;

    return (
        <div className="max-w-5xl mx-auto p-6 md:p-12 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-16">
                <div className="w-24 h-24 rounded-full bg-[var(--semantic-color-bg-surface-hover)] border-2 border-[var(--semantic-color-border-default)] overflow-hidden mb-6 shadow-xl">
                    {brand.avatar ? (
                        <img src={brand.avatar} alt={brand.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl font-bold bg-gradient-to-br from-gray-800 to-black text-white">
                            {brand.name[0]}
                        </div>
                    )}
                </div>
                <h1 className="text-3xl font-light tracking-tight mb-3">{brand.name}</h1>
                <p className="text-lg text-[var(--semantic-color-text-muted)] max-w-xl leading-relaxed">
                    {brand.bio}
                </p>
                {brand.links && (
                    <div className="flex gap-4 mt-6">
                        {brand.links.map((link, i) => (
                            <a
                                key={i}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)] transition-colors border-b border-transparent hover:border-current pb-0.5"
                            >
                                {link.label}
                            </a>
                        ))}
                    </div>
                )}
                <button
                    type="button"
                    onClick={() => {
                        stationStorage.upsertExternalGraphLink(
                            { type: 'brand', slug: brandSlug },
                            { label: `${brand.name} Portal`, visibility: 'private' }
                        );
                    }}
                    className="mt-4 px-4 py-2 rounded-[var(--primitive-radius-pill)] border border-[var(--semantic-color-border-default)] text-sm text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)] hover:bg-[var(--semantic-color-bg-surface-hover)] transition-colors"
                >
                    Save Link to Station
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map(listing => (
                    <div
                        key={listing.id}
                        onClick={() => setGatewayRoute({ type: 'portal', brandSlug: brandSlug, portalSlug: listing.slug })}
                        className="group bg-[var(--semantic-color-bg-surface)] border border-[var(--semantic-color-border-default)] rounded-[var(--primitive-radius-card)] overflow-hidden hover:border-[var(--semantic-color-text-secondary)] transition-all cursor-pointer flex flex-col h-full"
                    >
                        {/* Cover Placeholder */}
                        <div className="aspect-video bg-[var(--semantic-color-bg-surface-hover)] relative overflow-hidden">
                            <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-20 group-hover:scale-105 transition-transform duration-500">
                                {listing.type === 'map' ? '🗺️' : listing.type === 'course' ? '🎓' : '📦'}
                            </div>
                            {/* Badge */}
                            <div className="absolute top-3 left-3 px-2 py-1 rounded-[var(--primitive-radius-pill)] bg-black/50 backdrop-blur-md text-[10px] uppercase tracking-wider text-white border border-white/10">
                                {listing.type}
                            </div>
                        </div>

                        <div className="p-5 flex flex-col flex-1">
                            <h3 className="text-lg font-medium mb-2 group-hover:text-[var(--semantic-color-action-primary)] transition-colors">
                                {listing.title}
                            </h3>
                            <p className="text-sm text-[var(--semantic-color-text-muted)] line-clamp-2 mb-4 flex-1">
                                {listing.description}
                            </p>

                            <div className="flex items-center justify-between text-xs text-[var(--semantic-color-text-secondary)] mt-auto pt-4 border-t border-[var(--semantic-color-border-default)]/50">
                                <div className="flex gap-3">
                                    <span>👁️ {listing.stats?.views}</span>
                                    <span>🍴 {listing.stats?.forks}</span>
                                </div>
                                <div className="uppercase tracking-wider opacity-70">Privately Visible</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BrandPage;
