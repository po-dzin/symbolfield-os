import React, { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { gatewayData } from '../../core/gateway/GatewayData';
import type { Brand } from '../../core/types/gateway';

const radiusByCount = (count: number): number => Math.max(120, 42 * Math.max(1, count));

const AtlasPage: React.FC = () => {
    const setGatewayRoute = useAppStore(state => state.setGatewayRoute);
    const setViewContext = useAppStore(state => state.setViewContext);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        void (async () => {
            setLoading(true);
            const list = await gatewayData.getAllBrands();
            if (!mounted) return;
            setBrands(list);
            setLoading(false);
        })();
        return () => {
            mounted = false;
        };
    }, []);

    const nodes = useMemo(() => {
        if (!brands.length) return [];
        const cx = 420;
        const cy = 260;
        const orbit = radiusByCount(brands.length);
        return brands.map((brand, index) => {
            const angle = (Math.PI * 2 * index) / brands.length;
            return {
                brand,
                x: cx + Math.cos(angle) * orbit,
                y: cy + Math.sin(angle) * orbit
            };
        });
    }, [brands]);

    return (
        <div className="max-w-6xl mx-auto p-6 md:p-12 animate-fade-in">
            <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                    <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--semantic-color-text-muted)]">Platform Atlas</div>
                    <h1 className="mt-2 text-3xl tracking-tight font-light">Brand Portals Graph</h1>
                    <p className="mt-3 text-sm text-[var(--semantic-color-text-secondary)] max-w-2xl">
                        Public map of brand portals in Symbolverse. Current seed contains the SymbolField official portal and creator samples.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setGatewayRoute({ type: 'symbolverse' });
                        setViewContext('gateway');
                    }}
                    className="px-4 py-2 rounded-[var(--primitive-radius-pill)] border border-[var(--semantic-color-border-default)] text-xs uppercase tracking-[0.18em] text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)] hover:bg-[var(--semantic-color-bg-surface-hover)] transition-colors"
                >
                    Symbolverse
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] gap-4">
                <section className="glass-panel rounded-[var(--primitive-radius-panel)] border border-[var(--semantic-color-border-default)] p-4 md:p-6">
                    {loading ? (
                        <div className="min-h-[420px] flex items-center justify-center text-sm text-[var(--semantic-color-text-muted)]">Loading atlas…</div>
                    ) : (
                        <svg viewBox="0 0 840 520" className="w-full h-auto">
                            <defs>
                                <radialGradient id="atlas-core" cx="50%" cy="50%" r="70%">
                                    <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
                                    <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
                                </radialGradient>
                            </defs>
                            <circle cx="420" cy="260" r="52" fill="url(#atlas-core)" stroke="rgba(255,255,255,0.28)" />
                            <text x="420" y="265" textAnchor="middle" className="fill-white/80 text-[11px] tracking-[0.25em] uppercase">Atlas</text>

                            {nodes.map((node) => {
                                const featured = node.brand.slug === 'symbolfield';
                                return (
                                    <g key={node.brand.id}>
                                        <line x1="420" y1="260" x2={node.x} y2={node.y} stroke="rgba(255,255,255,0.16)" strokeWidth={featured ? 1.8 : 1} />
                                        <circle
                                            cx={node.x}
                                            cy={node.y}
                                            r={featured ? 24 : 18}
                                            fill={featured ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)'}
                                            stroke={featured ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.24)'}
                                            className="cursor-pointer transition-opacity hover:opacity-80"
                                            onClick={() => {
                                                setGatewayRoute({ type: 'brand', slug: node.brand.slug });
                                                setViewContext('gateway');
                                            }}
                                        />
                                        <text
                                            x={node.x}
                                            y={node.y + 42}
                                            textAnchor="middle"
                                            className="fill-white/70 text-[10px] tracking-[0.18em] uppercase"
                                        >
                                            {node.brand.name}
                                        </text>
                                    </g>
                                );
                            })}
                        </svg>
                    )}
                </section>

                <section className="glass-panel rounded-[var(--primitive-radius-panel)] border border-[var(--semantic-color-border-default)] p-6">
                    <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--semantic-color-text-muted)]">Portals</div>
                    <div className="mt-4 space-y-3">
                        {brands.map((brand) => (
                            <button
                                key={brand.id}
                                type="button"
                                onClick={() => {
                                    setGatewayRoute({ type: 'brand', slug: brand.slug });
                                    setViewContext('gateway');
                                }}
                                className="w-full text-left rounded-[var(--primitive-radius-card)] border border-[var(--semantic-color-border-default)] px-3 py-2 hover:bg-[var(--semantic-color-bg-surface-hover)] transition-colors"
                            >
                                <div className="text-sm">{brand.name}</div>
                                <div className="mt-1 text-[11px] text-[var(--semantic-color-text-muted)]">
                                    {brand.portal?.subdomain ?? `${brand.slug}.sf`}
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AtlasPage;
