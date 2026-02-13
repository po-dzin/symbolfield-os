import type { Brand, Listing } from '../types/gateway';
import {
    fetchRemoteBrandBySlug,
    fetchRemoteBrandListings,
    fetchRemoteBrands,
    fetchRemoteFeaturedListings,
    fetchRemoteListingBySlug
} from '../data/gatewayRemote';
import {
    gatewayCache,
    resolveCachedListingBySlug
} from './GatewayCache';
import { publishedSpacesStorage } from './PublishedSpacesStorage';
import { gatewayBootstrap } from './GatewayBootstrap';

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
    const mergeListing = (head: Listing, tail: Listing): Listing => {
        const headTags = Array.isArray(head.tags) ? head.tags : [];
        const tailTags = Array.isArray(tail.tags) ? tail.tags : [];
        const mergedVisibility = head.visibility ?? tail.visibility;
        const mergedSnapshot = head.spaceSnapshot ?? tail.spaceSnapshot;
        const mergedStats = head.stats || tail.stats
            ? {
                views: head.stats?.views ?? tail.stats?.views ?? 0,
                forks: head.stats?.forks ?? tail.stats?.forks ?? 0,
                updatedAt: head.stats?.updatedAt ?? tail.stats?.updatedAt ?? Date.now()
            }
            : undefined;
        return {
            ...tail,
            ...head,
            tags: headTags.length > 0 ? [...headTags] : [...tailTags],
            ...(mergedVisibility !== undefined ? { visibility: mergedVisibility } : {}),
            ...(mergedSnapshot !== undefined ? { spaceSnapshot: mergedSnapshot } : {}),
            ...(mergedStats ? { stats: mergedStats } : {})
        };
    };

    const map = new Map<string, Listing>();
    primary.forEach((listing) => {
        const slug = normalizeSlug(listing.slug);
        if (slug) map.set(slug, listing);
    });
    secondary.forEach((listing) => {
        const slug = normalizeSlug(listing.slug);
        if (!slug) return;
        const existing = map.get(slug);
        if (!existing) {
            map.set(slug, listing);
            return;
        }
        map.set(slug, mergeListing(existing, listing));
    });
    return Array.from(map.values()).sort(
        (a, b) => (b.stats?.updatedAt ?? 0) - (a.stats?.updatedAt ?? 0)
    );
};

const readFallbackBrands = async (): Promise<Brand[]> => {
    return gatewayCache.getAllBrands();
};

const readFallbackBrand = async (slug: string): Promise<Brand | null> => {
    return gatewayCache.getBrandBySlug(slug);
};

const readFallbackBrandListings = async (brandSlug: string): Promise<Listing[]> => {
    return gatewayCache.getBrandListingsBySlug(brandSlug);
};

const readFallbackListing = async (brandSlug: string, listingSlug: string): Promise<Listing | null> => {
    return resolveCachedListingBySlug(brandSlug, listingSlug, gatewayCache.getBrandListingsBySlug);
};

const readFallbackFeaturedListings = async (): Promise<Listing[]> => {
    return gatewayCache.getFeaturedListings();
};

export const gatewayData = {
    getAllBrands: async (): Promise<Brand[]> => {
        const platformBrands = gatewayBootstrap.getPlatformBrands();
        const publishedBrands = await publishedSpacesStorage.getPublishedBrands();
        const remote = await fetchRemoteBrands();
        if (remote !== null) {
            gatewayCache.setAllBrands(remote);
            return mergeBrandsBySlug(mergeBrandsBySlug(remote, publishedBrands), platformBrands);
        }
        return mergeBrandsBySlug(mergeBrandsBySlug(await readFallbackBrands(), publishedBrands), platformBrands);
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
        const published = publishedBrands.find((brand) => normalizeSlug(brand.slug) === normalizeSlug(slug));
        if (published) return published;
        return gatewayBootstrap.getPlatformBrandBySlug(slug);
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
            const published = await publishedSpacesStorage.getPublishedListingBySlug(brandSlug, listingSlug);
            if (published) {
                const [resolved] = mergeListingsBySlug([remote], [published]);
                return resolved ?? remote;
            }
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
