import type { Brand, Listing } from '../types/gateway';

type GatewayCacheSnapshot = {
    brandsBySlug: Record<string, Brand>;
    brandOrder: string[];
    listingsByBrandSlug: Record<string, Listing[]>;
    featuredListings: Listing[];
};

const STORAGE_KEY = 'sf_gateway_cache.v0.5';

const DEFAULT_SNAPSHOT: GatewayCacheSnapshot = {
    brandsBySlug: {},
    brandOrder: [],
    listingsByBrandSlug: {},
    featuredListings: []
};

const normalizeSlug = (value: string): string => value.trim().toLowerCase();

const cloneListing = (listing: Listing): Listing => ({
    ...listing,
    tags: Array.isArray(listing.tags) ? [...listing.tags] : []
});

const cloneBrand = (brand: Brand): Brand => (
    Array.isArray(brand.links)
        ? {
            ...brand,
            links: [...brand.links]
        }
        : { ...brand }
);

const normalizeBrands = (input: unknown): Brand[] => (
    Array.isArray(input)
        ? input.filter(item => !!item && typeof item === 'object').map(item => cloneBrand(item as Brand))
        : []
).filter(brand => typeof brand.slug === 'string' && normalizeSlug(brand.slug).length > 0);

const normalizeListings = (input: unknown): Listing[] => (
    Array.isArray(input)
        ? input.filter(item => !!item && typeof item === 'object').map(item => cloneListing(item as Listing))
        : []
).filter(listing => typeof listing.slug === 'string' && normalizeSlug(listing.slug).length > 0);

const readSnapshot = (): GatewayCacheSnapshot => {
    if (typeof window === 'undefined') return DEFAULT_SNAPSHOT;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_SNAPSHOT;
        const parsed = JSON.parse(raw) as Partial<GatewayCacheSnapshot>;
        const brands = normalizeBrands(Object.values(parsed.brandsBySlug ?? {}));
        const brandsBySlug: Record<string, Brand> = {};
        const brandOrder: string[] = [];
        brands.forEach((brand) => {
            const slug = normalizeSlug(brand.slug);
            if (!slug) return;
            brandsBySlug[slug] = cloneBrand(brand);
            if (!brandOrder.includes(slug)) brandOrder.push(slug);
        });

        const listingsByBrandSlug: Record<string, Listing[]> = {};
        const rawListingsByBrand = parsed.listingsByBrandSlug ?? {};
        Object.entries(rawListingsByBrand).forEach(([brandSlug, listings]) => {
            const key = normalizeSlug(brandSlug);
            if (!key) return;
            listingsByBrandSlug[key] = normalizeListings(listings);
        });

        return {
            brandsBySlug,
            brandOrder: parsed.brandOrder?.filter((slug) => typeof slug === 'string').map(normalizeSlug).filter(Boolean) ?? brandOrder,
            listingsByBrandSlug,
            featuredListings: normalizeListings(parsed.featuredListings)
        };
    } catch {
        return DEFAULT_SNAPSHOT;
    }
};

const writeSnapshot = (snapshot: GatewayCacheSnapshot) => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
        // Ignore storage quota errors.
    }
};

let snapshot: GatewayCacheSnapshot = readSnapshot();

const updateSnapshot = (updater: (current: GatewayCacheSnapshot) => GatewayCacheSnapshot) => {
    snapshot = updater(snapshot);
    writeSnapshot(snapshot);
};

const ensureBrandOrder = (next: GatewayCacheSnapshot): GatewayCacheSnapshot => {
    const known = new Set(Object.keys(next.brandsBySlug));
    const order = next.brandOrder.filter(slug => known.has(slug));
    Object.keys(next.brandsBySlug).forEach((slug) => {
        if (!order.includes(slug)) order.push(slug);
    });
    return { ...next, brandOrder: order };
};

const setAllBrands = (brands: Brand[]) => {
    updateSnapshot((current) => {
        const brandsBySlug: Record<string, Brand> = { ...current.brandsBySlug };
        const brandOrder: string[] = [];
        normalizeBrands(brands).forEach((brand) => {
            const slug = normalizeSlug(brand.slug);
            brandsBySlug[slug] = cloneBrand(brand);
            brandOrder.push(slug);
        });
        return ensureBrandOrder({
            ...current,
            brandsBySlug,
            brandOrder
        });
    });
};

const upsertBrand = (brand: Brand) => {
    updateSnapshot((current) => {
        const slug = normalizeSlug(brand.slug);
        if (!slug) return current;
        const next: GatewayCacheSnapshot = {
            ...current,
            brandsBySlug: {
                ...current.brandsBySlug,
                [slug]: cloneBrand(brand)
            },
            brandOrder: current.brandOrder.includes(slug)
                ? [...current.brandOrder]
                : [...current.brandOrder, slug]
        };
        return ensureBrandOrder(next);
    });
};

const setBrandListingsBySlug = (brandSlug: string, listings: Listing[]) => {
    const slug = normalizeSlug(brandSlug);
    if (!slug) return;
    updateSnapshot((current) => ({
        ...current,
        listingsByBrandSlug: {
            ...current.listingsByBrandSlug,
            [slug]: normalizeListings(listings)
        }
    }));
};

const upsertListingBySlug = (brandSlug: string, listing: Listing) => {
    const slug = normalizeSlug(brandSlug);
    if (!slug) return;
    updateSnapshot((current) => {
        const existing = current.listingsByBrandSlug[slug] ?? [];
        const listingSlug = normalizeSlug(listing.slug);
        const nextListings = existing.filter(entry => normalizeSlug(entry.slug) !== listingSlug);
        nextListings.push(cloneListing(listing));
        return {
            ...current,
            listingsByBrandSlug: {
                ...current.listingsByBrandSlug,
                [slug]: nextListings
            }
        };
    });
};

const setFeaturedListings = (listings: Listing[]) => {
    updateSnapshot((current) => ({
        ...current,
        featuredListings: normalizeListings(listings)
    }));
};

const getAllBrands = (): Brand[] => {
    const order = snapshot.brandOrder.length > 0
        ? snapshot.brandOrder
        : Object.keys(snapshot.brandsBySlug);
    return order
        .map(slug => snapshot.brandsBySlug[slug])
        .filter((brand): brand is Brand => !!brand)
        .map(cloneBrand);
};

const getBrandBySlug = (slug: string): Brand | null => {
    const normalized = normalizeSlug(slug);
    if (!normalized) return null;
    const brand = snapshot.brandsBySlug[normalized];
    return brand ? cloneBrand(brand) : null;
};

const getBrandListingsBySlug = (brandSlug: string): Listing[] => {
    const slug = normalizeSlug(brandSlug);
    if (!slug) return [];
    return (snapshot.listingsByBrandSlug[slug] ?? []).map(cloneListing);
};

const getFeaturedListings = (): Listing[] => (
    snapshot.featuredListings.length > 0
        ? snapshot.featuredListings.map(cloneListing)
        : []
);

const resetForTests = () => {
    snapshot = DEFAULT_SNAPSHOT;
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.removeItem(STORAGE_KEY);
        } catch {
            // ignore
        }
    }
};

export const resolveCachedListingBySlug = async (
    brandSlug: string,
    listingSlug: string,
    getListings: (brandSlug: string) => Promise<Listing[]> | Listing[]
): Promise<Listing | null> => {
    const normalizedListingSlug = normalizeSlug(listingSlug);
    if (!normalizedListingSlug) return null;
    const listings = await getListings(brandSlug);
    return listings.find((entry) => normalizeSlug(entry.slug) === normalizedListingSlug) ?? null;
};

export const gatewayCache = {
    setAllBrands,
    upsertBrand,
    setBrandListingsBySlug,
    upsertListingBySlug,
    setFeaturedListings,
    getAllBrands,
    getBrandBySlug,
    getBrandListingsBySlug,
    getFeaturedListings,
    __resetForTests: resetForTests
};
