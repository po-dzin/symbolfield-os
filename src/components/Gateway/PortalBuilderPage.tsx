import React, { useMemo, useState } from 'react';
import { TogglePill } from '../Common';
import { useAppStore } from '../../store/useAppStore';

const SKINS = ['deep', 'flow', 'luma'] as const;
const ACCENTS = [
    { id: 'taupe', color: '#B8B2A6' },
    { id: 'sage', color: '#9CAD98' },
    { id: 'rose', color: '#E09F9F' },
    { id: 'cyan', color: '#6FE4FF' }
] as const;
const WIDGETS = [
    { id: 'signals', label: 'Signals Widget' },
    { id: 'chronos', label: 'Now/Cycles/Chronos' },
    { id: 'offers', label: 'Offers / CTA' },
    { id: 'community', label: 'Community Links' }
] as const;

type PortalSkin = (typeof SKINS)[number];
type AccentId = (typeof ACCENTS)[number]['id'];
type WidgetId = (typeof WIDGETS)[number]['id'];

const PortalBuilderPage = ({ brandSlug }: { brandSlug: string }) => {
    const setGatewayRoute = useAppStore(state => state.setGatewayRoute);
    const setViewContext = useAppStore(state => state.setViewContext);
    const [skin, setSkin] = useState<PortalSkin>('deep');
    const [accent, setAccent] = useState<AccentId>('taupe');
    const [showEntryPreview, setShowEntryPreview] = useState(true);
    const [widgets, setWidgets] = useState<Record<WidgetId, boolean>>({
        signals: true,
        chronos: true,
        offers: false,
        community: true
    });

    const brandLabel = useMemo(
        () => brandSlug.replace(/[-_]/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase()),
        [brandSlug]
    );

    return (
        <div className="max-w-6xl mx-auto p-6 md:p-12 animate-fade-in">
            <section className="glass-panel rounded-[var(--primitive-radius-panel)] border border-[var(--semantic-color-border-default)] p-8">
                <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--semantic-color-text-muted)]">Private Builder Module</div>
                <h1 className="mt-3 text-3xl md:text-4xl font-light tracking-tight">{brandLabel} Portal Builder</h1>
                <p className="mt-4 text-[var(--semantic-color-text-secondary)] max-w-3xl leading-relaxed">
                    Separate layer between public brand portal and station. Customize shell style, module widgets, and portal pages/maps before publishing.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            setGatewayRoute({ type: 'brand', slug: brandSlug });
                            setViewContext('gateway');
                        }}
                        className="ui-selectable ui-shape-pill px-4 py-2 text-sm"
                    >
                        View Public Portal
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewContext('home')}
                        className="ui-selectable ui-shape-pill px-4 py-2 text-sm"
                    >
                        Back To Station
                    </button>
                </div>
            </section>

            <section className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
                <article className="glass-panel rounded-[var(--primitive-radius-card)] border border-[var(--semantic-color-border-default)] p-6 space-y-6">
                    <div>
                        <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--semantic-color-text-muted)]">Shell Style</div>
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                            {SKINS.map(item => (
                                <button
                                    key={item}
                                    type="button"
                                    onClick={() => setSkin(item)}
                                    data-state={skin === item ? 'active' : 'inactive'}
                                    className="ui-selectable ui-shape-pill px-3 py-1.5 text-[11px] uppercase tracking-[0.16em]"
                                >
                                    {item}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--semantic-color-text-muted)]">Accent Map</div>
                        <div className="mt-3 flex items-center gap-3">
                            {ACCENTS.map(item => (
                                <button
                                    key={item.id}
                                    type="button"
                                    aria-label={`Set accent ${item.id}`}
                                    onClick={() => setAccent(item.id)}
                                    className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-105"
                                    style={{
                                        backgroundColor: item.color,
                                        borderColor: accent === item.id
                                            ? 'var(--semantic-color-text-primary)'
                                            : 'transparent'
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--semantic-color-text-muted)]">Widget Slots</div>
                        {WIDGETS.map(widget => (
                            <div key={widget.id} className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                                <span>{widget.label}</span>
                                <TogglePill
                                    checked={widgets[widget.id]}
                                    onToggle={() => setWidgets(prev => ({ ...prev, [widget.id]: !prev[widget.id] }))}
                                />
                            </div>
                        ))}
                    </div>
                </article>

                <article className="glass-panel rounded-[var(--primitive-radius-card)] border border-[var(--semantic-color-border-default)] p-6 space-y-5">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--semantic-color-text-muted)]">Pages / Tabs / Maps</div>
                    <div className="space-y-2">
                        {['Home', 'Catalog', 'Graph Preview', 'About'].map((page, index) => (
                            <div key={page} className="ui-drawer-row flex items-center justify-between px-3 py-2">
                                <span className="text-sm">{page}</span>
                                <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--semantic-color-text-muted)]">L{index}</span>
                            </div>
                        ))}
                    </div>

                    <div className="pt-2 border-t border-[var(--semantic-color-border-default)]">
                        <div className="flex items-center justify-between text-sm text-[var(--semantic-color-text-secondary)]">
                            <span>Preview graph before station entry</span>
                            <TogglePill checked={showEntryPreview} onToggle={() => setShowEntryPreview(v => !v)} />
                        </div>
                        <div className="mt-3 rounded-[var(--primitive-radius-card)] border border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-bg-surface)]/60 p-4">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--semantic-color-text-muted)]">Entry Preview</div>
                            <div className="mt-2 text-sm text-[var(--semantic-color-text-secondary)]">
                                Mode: <span className="text-[var(--semantic-color-text-primary)] uppercase">{skin}</span> · Accent:{' '}
                                <span className="text-[var(--semantic-color-text-primary)] uppercase">{accent}</span> · Graph card:{' '}
                                <span className="text-[var(--semantic-color-text-primary)]">{showEntryPreview ? 'enabled' : 'disabled'}</span>
                            </div>
                        </div>
                    </div>
                </article>
            </section>

            <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    className="ui-shape-pill px-5 py-2.5 bg-[var(--semantic-color-action-primary)] text-[var(--semantic-color-action-on-primary)] border border-[var(--semantic-color-action-primary)] font-medium"
                >
                    Publish Portal Draft
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setGatewayRoute({ type: 'brand', slug: brandSlug });
                        setViewContext('gateway');
                    }}
                    className="ui-selectable ui-shape-pill px-5 py-2.5 text-sm"
                >
                    Open Public View
                </button>
            </div>
        </div>
    );
};

export default PortalBuilderPage;
