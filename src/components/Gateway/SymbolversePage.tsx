import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { mockCloud } from '../../core/gateway/MockCloud';
import type { Brand } from '../../core/types/gateway';

const SymbolversePage: React.FC = () => {
    const setGatewayRoute = useAppStore(state => state.setGatewayRoute);
    const setViewContext = useAppStore(state => state.setViewContext);
    const [brands, setBrands] = useState<Brand[]>([]);

    useEffect(() => {
        let mounted = true;
        void mockCloud.getAllBrands().then((items) => {
            if (!mounted) return;
            setBrands(items);
        });
        return () => {
            mounted = false;
        };
    }, []);

    const featuredBrand = brands.find(item => item.slug === 'symbolfield') ?? brands[0] ?? null;

    return (
        <div className="max-w-6xl mx-auto p-6 md:p-12 animate-fade-in">
            <section className="glass-panel rounded-[var(--primitive-radius-panel)] border border-[var(--semantic-color-border-default)] px-8 py-10">
                <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--semantic-color-text-muted)]">Platform Layer</div>
                <h1 className="mt-3 text-4xl md:text-5xl tracking-tight font-light">Symbolverse</h1>
                <p className="mt-5 max-w-3xl text-[var(--semantic-color-text-secondary)] leading-relaxed">
                    Symbolverse is the public communication layer for graph-native brands and creators.
                    It separates external discoverability from private build space and keeps both connected through a shared graph contract.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setGatewayRoute({ type: 'atlas' });
                                setViewContext('gateway');
                            }}
                            className="px-5 py-2.5 rounded-[var(--primitive-radius-pill)] bg-[var(--semantic-color-action-primary)] text-[var(--semantic-color-action-on-primary)] text-sm font-medium tracking-wide hover:brightness-110 transition-[filter]"
                        >
                            Open Atlas Map
                        </button>
                    <button
                        type="button"
                        onClick={() => setViewContext('home')}
                        className="px-5 py-2.5 rounded-[var(--primitive-radius-pill)] border border-[var(--semantic-color-border-default)] text-sm text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)] hover:bg-[var(--semantic-color-bg-surface-hover)] transition-colors"
                    >
                        Go To Station
                    </button>
                </div>
            </section>

            <section className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
                <article className="glass-panel rounded-[var(--primitive-radius-card)] border border-[var(--semantic-color-border-default)] p-6 lg:col-span-2">
                    <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--semantic-color-text-muted)]">Mission</div>
                    <p className="mt-3 text-[var(--semantic-color-text-secondary)] leading-relaxed">
                        Give creators a structured surface where identity, portals, and internal stations can scale fractally:
                        platform → brand portal → station → space → cluster → node.
                    </p>
                </article>

                <article className="glass-panel rounded-[var(--primitive-radius-card)] border border-[var(--semantic-color-border-default)] p-6">
                    <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--semantic-color-text-muted)]">Atlas Seed</div>
                    {featuredBrand ? (
                        <>
                            <div className="mt-3 text-xl">{featuredBrand.name}</div>
                            <div className="mt-1 text-xs text-[var(--semantic-color-text-muted)]">
                                {featuredBrand.portal?.subdomain ?? `${featuredBrand.slug}.sf`}
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setGatewayRoute({ type: 'brand', slug: featuredBrand.slug });
                                    setViewContext('gateway');
                                }}
                                className="mt-5 px-4 py-2 rounded-[var(--primitive-radius-pill)] border border-[var(--semantic-color-border-default)] text-xs uppercase tracking-[0.2em] text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)] hover:bg-[var(--semantic-color-bg-surface-hover)] transition-colors"
                            >
                                Open Brand Portal
                            </button>
                        </>
                    ) : (
                        <div className="mt-3 text-sm text-[var(--semantic-color-text-muted)]">Loading…</div>
                    )}
                </article>
            </section>
        </div>
    );
};

export default SymbolversePage;
