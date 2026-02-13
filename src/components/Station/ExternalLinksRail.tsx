import React, { useEffect, useMemo, useState } from 'react';
import { eventBus, EVENTS } from '../../core/events/EventBus';
import { stationStorage } from '../../core/storage/StationStorage';
import { useAppStore } from '../../store/useAppStore';
import type { ExternalGraphLink } from '../../core/types/gateway';

const buildSecondaryLabel = (link: ExternalGraphLink): string => (
    link.target.type === 'symbolverse'
        ? 'platform/symbolverse'
        : link.target.type === 'atlas'
            ? 'platform/atlas'
        : link.target.type === 'brand'
            ? `brand/${link.target.slug}`
            : link.target.type === 'portal-builder'
                ? `builder/${link.target.slug}`
                : link.target.type === 'share'
                    ? `share/${link.target.token.slice(0, 12)}`
                : `${link.target.brandSlug}/${link.target.portalSlug}`
);

const ExternalLinksRail: React.FC = () => {
    const setGatewayRoute = useAppStore(state => state.setGatewayRoute);
    const setViewContext = useAppStore(state => state.setViewContext);
    const [links, setLinks] = useState<ExternalGraphLink[]>([]);

    useEffect(() => {
        const refresh = () => {
            setLinks(stationStorage.loadExternalGraphLinks());
        };
        refresh();
        const unsub = eventBus.on(EVENTS.EXTERNAL_GRAPH_LINKS_CHANGED, refresh);
        return unsub;
    }, []);

    const sortedLinks = useMemo(
        () =>
            links
                .slice()
                .sort((a, b) => (b.lastOpenedAt ?? b.updatedAt ?? 0) - (a.lastOpenedAt ?? a.updatedAt ?? 0)),
        [links]
    );

    const openLink = (link: ExternalGraphLink) => {
        stationStorage.touchExternalGraphLink(link.id);
        setGatewayRoute(link.target);
        setViewContext('gateway');
    };

    if (!sortedLinks.length) {
        return <div className="text-[var(--semantic-color-text-muted)] text-[10px] italic py-2">No linked graphs yet</div>;
    }

    return (
        <div className="space-y-1">
            {sortedLinks.map(link => (
                <div key={link.id} className="relative group/link">
                    <button
                        onClick={() => openLink(link)}
                        className="ui-drawer-row group flex items-center gap-3 w-full text-left px-2 py-1.5"
                        title={buildSecondaryLabel(link)}
                    >
                        <div className="w-5 h-5 rounded-full border-[1.5px] border-[var(--semantic-color-text-muted)] opacity-55 group-hover:opacity-100 group-hover:border-[var(--semantic-color-text-secondary)] transition-all flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                            <div className="text-[12px] text-[var(--semantic-color-text-primary)] truncate">{link.label}</div>
                            <div className="text-[10px] text-[var(--semantic-color-text-muted)] truncate">{buildSecondaryLabel(link)}</div>
                        </div>
                    </button>
                    <button
                        type="button"
                        onClick={() => stationStorage.removeExternalGraphLink(link.id)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 px-2 text-[10px] text-[var(--semantic-color-text-muted)] hover:text-[var(--semantic-color-status-error)] transition-colors opacity-0 group-hover/link:opacity-100"
                        aria-label="Remove external graph link"
                        title="Remove link"
                    >
                        ✕
                    </button>
                </div>
            ))}
        </div>
    );
};

export default ExternalLinksRail;
