import type { Brand, Listing } from '../types/gateway';
import type { SpaceData } from '../state/SpaceManager';

// --- MOCK DATA ---

const MOCK_BRANDS: Brand[] = [
    {
        id: 'brand_sf',
        slug: 'symbolfield',
        name: 'SymbolField Official',
        bio: 'The official showroom for SymbolField OS templates, maps, and guides.',
        avatar: 'https://ui-avatars.com/api/?name=SF&background=000&color=fff',
        links: [
            { label: 'Website', url: 'https://symbolfield.com' },
            { label: 'Documentation', url: 'https://docs.symbolfield.com' }
        ]
    },
    {
        id: 'brand_creator',
        slug: 'creator_labs',
        name: 'Creator Labs',
        bio: 'Experimental spaces for thinkers and builders.',
        avatar: 'https://ui-avatars.com/api/?name=CL&background=333&color=fff'
    }
];

const MOCK_LISTINGS: Listing[] = [
    {
        id: 'listing_starter',
        brandId: 'brand_sf',
        slug: 'starter-kit',
        type: 'template',
        title: 'Personal OS Starter Kit',
        description: 'A clean, structured workspace to start your journey. Includes basic clusters for Inbox, Projects, and Areas.',
        tags: ['start', 'template', 'productivity'],
        stats: { views: 1204, forks: 342, updatedAt: Date.now() - 10000000 },
        spaceSnapshot: {
            spaceId: 'temp_starter',
            nodes: [],
            edges: [],
            clusters: {},
            version: 1
        }
    },
    {
        id: 'listing_atlas',
        brandId: 'brand_sf',
        slug: 'atlas',
        type: 'map',
        title: 'SymbolField Atlas',
        description: 'Navigate the multiverse of public spaces. A map of the most popular community portals.',
        tags: ['map', 'community', 'featured'],
        stats: { views: 5402, forks: 12, updatedAt: Date.now() - 500000 },
        spaceSnapshot: {
            spaceId: 'temp_atlas',
            nodes: [],
            edges: [],
            clusters: {},
            version: 1
        }
    },
    {
        id: 'listing_course_101',
        brandId: 'brand_creator',
        slug: 'thinking-in-graphs',
        type: 'course',
        title: 'Thinking in Graphs 101',
        description: 'A short course on how to structure your thoughts using nodes and edges.',
        tags: ['course', 'education', 'graphs'],
        stats: { views: 890, forks: 156, updatedAt: Date.now() - 20000000 },
        spaceSnapshot: {
            spaceId: 'temp_course',
            nodes: [],
            edges: [],
            clusters: {},
            version: 1
        }
    }
];

// --- SERVICE ---

export const mockCloud = {
    getBrandBySlug: async (slug: string): Promise<Brand | null> => {
        await new Promise(resolve => setTimeout(resolve, 300)); // Simulate latency
        return MOCK_BRANDS.find(b => b.slug === slug) || null;
    },

    getBrandListings: async (brandId: string): Promise<Listing[]> => {
        await new Promise(resolve => setTimeout(resolve, 300));
        return MOCK_LISTINGS.filter(l => l.brandId === brandId);
    },

    getListingBySlug: async (brandSlug: string, listingSlug: string): Promise<Listing | null> => {
        await new Promise(resolve => setTimeout(resolve, 300));
        const brand = MOCK_BRANDS.find(b => b.slug === brandSlug);
        if (!brand) return null;
        return MOCK_LISTINGS.find(l => l.brandId === brand.id && l.slug === listingSlug) || null;
    },

    getAllBrands: async (): Promise<Brand[]> => {
        await new Promise(resolve => setTimeout(resolve, 300));
        return MOCK_BRANDS;
    },

    getFeaturedListings: async (): Promise<Listing[]> => {
        await new Promise(resolve => setTimeout(resolve, 300));
        return MOCK_LISTINGS; // Return all for now
    }
};
