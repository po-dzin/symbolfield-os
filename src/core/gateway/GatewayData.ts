import type { Brand, Listing } from '../types/gateway';
import { mockCloud } from './MockCloud';
import {
    fetchRemoteBrandBySlug,
    fetchRemoteBrandListings,
    fetchRemoteBrands,
    fetchRemoteFeaturedListings,
    fetchRemoteListingBySlug
} from '../data/gatewayRemote';

const getLocalBrandListingsBySlug = async (brandSlug: string): Promise<Listing[]> => {
    const brand = await mockCloud.getBrandBySlug(brandSlug);
    if (!brand) return [];
    return mockCloud.getBrandListings(brand.id);
};

export const gatewayData = {
    getAllBrands: async (): Promise<Brand[]> => {
        const remote = await fetchRemoteBrands();
        if (remote) return remote;
        return mockCloud.getAllBrands();
    },

    getBrandBySlug: async (slug: string): Promise<Brand | null> => {
        const remote = await fetchRemoteBrandBySlug(slug);
        if (remote) return remote;
        return mockCloud.getBrandBySlug(slug);
    },

    getBrandListingsBySlug: async (brandSlug: string): Promise<Listing[]> => {
        const remote = await fetchRemoteBrandListings(brandSlug);
        if (remote) return remote;
        return getLocalBrandListingsBySlug(brandSlug);
    },

    getListingBySlug: async (brandSlug: string, listingSlug: string): Promise<Listing | null> => {
        const remote = await fetchRemoteListingBySlug(brandSlug, listingSlug);
        if (remote) return remote;
        return mockCloud.getListingBySlug(brandSlug, listingSlug);
    },

    getFeaturedListings: async (): Promise<Listing[]> => {
        const remote = await fetchRemoteFeaturedListings();
        if (remote) return remote;
        return mockCloud.getFeaturedListings();
    }
};
