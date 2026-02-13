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
        const remote = await fetchRemoteBrands();
        if (remote !== null) {
            gatewayCache.setAllBrands(remote);
            return remote;
        }
        return readFallbackBrands();
    },

    getBrandBySlug: async (slug: string): Promise<Brand | null> => {
        const remote = await fetchRemoteBrandBySlug(slug);
        if (remote) {
            gatewayCache.upsertBrand(remote);
            return remote;
        }
        return readFallbackBrand(slug);
    },

    getBrandListingsBySlug: async (brandSlug: string): Promise<Listing[]> => {
        const remote = await fetchRemoteBrandListings(brandSlug);
        if (remote !== null) {
            gatewayCache.setBrandListingsBySlug(brandSlug, remote);
            return remote;
        }
        return readFallbackBrandListings(brandSlug);
    },

    getListingBySlug: async (brandSlug: string, listingSlug: string): Promise<Listing | null> => {
        const remote = await fetchRemoteListingBySlug(brandSlug, listingSlug);
        if (remote) {
            gatewayCache.upsertListingBySlug(brandSlug, remote);
            return remote;
        }
        return readFallbackListing(brandSlug, listingSlug);
    },

    getFeaturedListings: async (): Promise<Listing[]> => {
        const remote = await fetchRemoteFeaturedListings();
        if (remote !== null) {
            gatewayCache.setFeaturedListings(remote);
            return remote;
        }
        return readFallbackFeaturedListings();
    }
};
