import type { SpaceData } from '../state/SpaceManager';

export type ListingType = 'brand_base' | 'course' | 'template' | 'map';

export interface Brand {
    id: string;
    slug: string;
    name: string;
    bio: string;
    coverImage?: string;
    avatar?: string;
    links?: { label: string; url: string }[];
}

export interface Listing {
    id: string;
    brandId: string;
    slug: string;
    type: ListingType;
    title: string;
    description: string;
    tags: string[];

    // Stats (Mock for now)
    stats?: {
        views: number;
        forks: number;
        updatedAt: number;
    };

    // The Payload
    spaceSnapshot?: SpaceData; // Serialized space data for forking

    // Collaboration Foundation
    contributors?: {
        userId: string;
        role: 'owner' | 'editor' | 'viewer';
    }[];
}

export type ExternalGraphRoute =
    | { type: 'brand'; slug: string }
    | { type: 'portal'; brandSlug: string; portalSlug: string };

export type ExternalGraphLinkVisibility = 'private' | 'shared' | 'public';

export interface ExternalGraphLink {
    id: string;
    label: string;
    target: ExternalGraphRoute;
    visibility: ExternalGraphLinkVisibility;
    createdAt: number;
    updatedAt: number;
    lastOpenedAt?: number;
}
