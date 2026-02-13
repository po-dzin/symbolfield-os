import type { Brand, Listing } from '../types/gateway';
import { mockCloud } from './MockCloud';
import {
    fetchRemoteBrandBySlug,
    fetchRemoteBrandListings,
    fetchRemoteBrands,
    fetchRemoteFeaturedListings,
    fetchRemoteListingBySlug,
    isGatewayRemoteEnabled
} from '../data/gatewayRemote';
import {
    gatewayCache,
    resolveCachedListingBySlug
} from './GatewayCache';
import { publishedSpacesStorage } from './PublishedSpacesStorage';

const normalizeSlug = (value: string): string => value.trim().toLowerCase();

const mergeBrandsBySlug = (primary: Brand[], secondary: Brand[]): Brand[] => {
    const map = new Map<string, Brand>();
    primary.forEach((brand) => {
        const slug = normalizeSlug(brand.slug);
        if (slug) map.set(slug, brand);
    });
    secondary.forEach((brand) => {
        const slug = normalizeSlug(brand.slug);
        if (!slug || map.has(slug)) return;
        map.set(slug, brand);
    });
    return Array.from(map.values());
};

const mergeListingsBySlug = (primary: Listing[], secondary: Listing[]): Listing[] => {
    const map = new Map<string, Listing>();
    primary.forEach((listing) => {
        const slug = normalizeSlug(listing.slug);
        if (slug) map.set(slug, listing);
    });
    secondary.forEach((listing) => {
        const slug = normalizeSlug(listing.slug);
        if (!slug || map.has(slug)) return;
        map.set(slug, listing);
    });
    return Array.from(map.values()).sort(
        (a, b) => (b.stats?.updatedAt ?? 0) - (a.stats?.updatedAt ?? 0)
    );
};

const getLocalBrandListingsBySlug = async (brandSlug: string): Promise<Listing[]> => {
    const brand = await mockCloud.getBrandBySlug(brandSlug);
    if (!brand) return [];
    return mockCloud.getBrandListings(brand.id);
};

const readFallbackBrands = async (): Promise<Brand[]> => {
    if (isGatewayRemoteEnabled()) {
        return gatewayCache.getAllBrands();
    }
    return mockCloud.getAllBrands();
};

const readFallbackBrand = async (slug: string): Promise<Brand | null> => {
    if (isGatewayRemoteEnabled()) {
        return gatewayCache.getBrandBySlug(slug);
    }
    return mockCloud.getBrandBySlug(slug);
};

const readFallbackBrandListings = async (brandSlug: string): Promise<Listing[]> => {
    if (isGatewayRemoteEnabled()) {
        return gatewayCache.getBrandListingsBySlug(brandSlug);
    }
    return getLocalBrandListingsBySlug(brandSlug);
};

const readFallbackListing = async (brandSlug: string, listingSlug: string): Promise<Listing | null> => {
    if (isGatewayRemoteEnabled()) {
        return resolveCachedListingBySlug(brandSlug, listingSlug, gatewayCache.getBrandListingsBySlug);
    }
    return mockCloud.getListingBySlug(brandSlug, listingSlug);
};

const readFallbackFeaturedListings = async (): Promise<Listing[]> => {
    if (isGatewayRemoteEnabled()) {
        return gatewayCache.getFeaturedListings();
    }
    return mockCloud.getFeaturedListings();
};

export const gatewayData = {
    getAllBrands: async (): Promise<Brand[]> => {
        const publishedBrands = await publishedSpacesStorage.getPublishedBrands();
        const remote = await fetchRemoteBrands();
        if (remote !== null) {
            gatewayCache.setAllBrands(remote);
            return mergeBrandsBySlug(remote, publishedBrands);
        }
        return mergeBrandsBySlug(await readFallbackBrands(), publishedBrands);
    },

    getBrandBySlug: async (slug: string): Promise<Brand | null> => {
        const remote = await fetchRemoteBrandBySlug(slug);
        if (remote) {
            gatewayCache.upsertBrand(remote);
            return remote;
        }
        const fallback = await readFallbackBrand(slug);
        if (fallback) return fallback;
        const publishedBrands = await publishedSpacesStorage.getPublishedBrands();
        return publishedBrands.find((brand) => normalizeSlug(brand.slug) === normalizeSlug(slug)) ?? null;
    },

    getBrandListingsBySlug: async (brandSlug: string): Promise<Listing[]> => {
        const published = await publishedSpacesStorage.getPublishedListingsByBrandSlug(brandSlug);
        const remote = await fetchRemoteBrandListings(brandSlug);
        if (remote !== null) {
            gatewayCache.setBrandListingsBySlug(brandSlug, remote);
            return mergeListingsBySlug(remote, published);
        }
        return mergeListingsBySlug(await readFallbackBrandListings(brandSlug), published);
    },

    getListingBySlug: async (brandSlug: string, listingSlug: string): Promise<Listing | null> => {
        const remote = await fetchRemoteListingBySlug(brandSlug, listingSlug);
        if (remote) {
            gatewayCache.upsertListingBySlug(brandSlug, remote);
            return remote;
        }
        const fallback = await readFallbackListing(brandSlug, listingSlug);
        if (fallback) return fallback;
        return publishedSpacesStorage.getPublishedListingBySlug(brandSlug, listingSlug);
    },

    getFeaturedListings: async (): Promise<Listing[]> => {
        const published = await publishedSpacesStorage.loadPublishedSpacesAsync();
        const publishedVisible = published
            .filter((record) => record.visibility !== 'private')
            .map((record) => ({
                id: record.id,
                brandId: `brand:${record.brandSlug}`,
                slug: record.portalSlug,
                type: record.type,
                title: record.title,
                description: record.description,
                tags: [...record.tags],
                visibility: record.visibility,
                stats: {
                    views: 0,
                    forks: 0,
                    updatedAt: record.updatedAt
                },
                spaceSnapshot: record.spaceSnapshot
            } satisfies Listing));
        const remote = await fetchRemoteFeaturedListings();
        if (remote !== null) {
            gatewayCache.setFeaturedListings(remote);
            return mergeListingsBySlug(remote, publishedVisible);
        }
        return mergeListingsBySlug(await readFallbackFeaturedListings(), publishedVisible);
    }
};
