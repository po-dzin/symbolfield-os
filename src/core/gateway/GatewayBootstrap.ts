import type { Brand } from '../types/gateway';

const PLATFORM_BRANDS: Brand[] = [
    {
        id: 'brand:symbolfield',
        slug: 'symbolfield',
        name: 'SymbolField Official',
        bio: 'Official SymbolField portal in Symbolverse.',
        portal: {
            subdomain: 'symbolfield.sf',
            skin: 'deep',
            builder: {
                layoutPreset: 'core-shell',
                moduleSlots: ['signals', 'chronos'],
                panelSlots: ['insights', 'links']
            }
        },
        links: [
            { label: 'Website', url: 'https://symbolfield.com' },
            { label: 'Documentation', url: 'https://docs.symbolfield.com' }
        ]
    }
];

const normalizeSlug = (value: string): string => value.trim().toLowerCase();

export const gatewayBootstrap = {
    getPlatformBrands: (): Brand[] => PLATFORM_BRANDS.map(brand => ({
        ...brand,
        ...(Array.isArray(brand.links) ? { links: [...brand.links] } : {})
    })),
    getPlatformBrandBySlug: (slug: string): Brand | null => {
        const normalized = normalizeSlug(slug);
        if (!normalized) return null;
        const match = PLATFORM_BRANDS.find(brand => normalizeSlug(brand.slug) === normalized);
        if (!match) return null;
        return {
            ...match,
            ...(Array.isArray(match.links) ? { links: [...match.links] } : {})
        };
    }
};
