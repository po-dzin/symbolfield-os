import type { NodeId } from '../types';

export type NavigationFlowMode = 'auto' | 'build' | 'explore';
export type BreadcrumbLens = 'full' | 'external' | 'internal' | 'focus';
export type PathDisplayMode = 'full' | 'compact';
export type PathSegmentId = 'atlas' | 'portal' | 'station' | 'space' | 'cluster' | 'node';

type ViewContext = 'home' | 'space' | 'cluster' | 'node' | 'now' | 'gateway';

type GatewayRoute =
    | { type: 'brand'; slug: string }
    | { type: 'portal'; brandSlug: string; portalSlug: string }
    | null;

export interface PathSegment {
    id: PathSegmentId;
    label: string;
    enabled: boolean;
    group: 'external' | 'internal';
}

export interface PathProjectionInput {
    viewContext: ViewContext;
    gatewayRoute: GatewayRoute;
    currentSpaceId: string | null;
    fieldScopeId: NodeId | null;
    activeScope: NodeId | null;
    navigationFlowMode: NavigationFlowMode;
    breadcrumbLens: BreadcrumbLens;
    pathDisplayMode: PathDisplayMode;
    labels: {
        atlas: string;
        portal: string;
        station: string;
        space: string;
        cluster: string;
        node: string;
    };
}

export interface PathProjectionResult {
    segments: PathSegment[];
    activeId: PathSegmentId;
    collapsed: boolean;
    effectiveFlow: 'build' | 'explore';
}

export const DEFAULT_ATLAS_LABEL = 'Symbolverse';
export const DEFAULT_PORTAL_LABEL = 'Brand Portal';

export const toDisplayLabel = (value: string): string => {
    const normalized = value.trim();
    if (!normalized) return '';
    return normalized
        .split(/[-_]/g)
        .map(part => (part ? part.charAt(0).toUpperCase() + part.slice(1) : ''))
        .join(' ');
};

export const resolveEffectiveFlow = (
    flowMode: NavigationFlowMode,
    viewContext: ViewContext
): 'build' | 'explore' => {
    if (flowMode === 'build' || flowMode === 'explore') return flowMode;
    return viewContext === 'gateway' ? 'explore' : 'build';
};

const resolveCurrentDepthId = (viewContext: ViewContext): PathSegmentId => {
    if (viewContext === 'node' || viewContext === 'now') return 'node';
    if (viewContext === 'cluster') return 'cluster';
    if (viewContext === 'space') return 'space';
    if (viewContext === 'gateway') return 'portal';
    return 'station';
};

const resolveInternalSegments = (input: PathProjectionInput): PathSegment[] => {
    const base: PathSegment[] = [
        { id: 'station', label: input.labels.station, enabled: true, group: 'internal' }
    ];

    if (!input.currentSpaceId) {
        return base;
    }

    base.push({
        id: 'space',
        label: input.labels.space,
        enabled: true,
        group: 'internal'
    });

    if (input.fieldScopeId) {
        base.push({
            id: 'cluster',
            label: input.labels.cluster,
            enabled: true,
            group: 'internal'
        });
    }

    if (input.activeScope) {
        base.push({
            id: 'node',
            label: input.labels.node,
            enabled: true,
            group: 'internal'
        });
    }

    return base;
};

const resolveExternalSegments = (input: PathProjectionInput): PathSegment[] => {
    const segments: PathSegment[] = [
        {
            id: 'atlas',
            label: input.labels.atlas || DEFAULT_ATLAS_LABEL,
            enabled: true,
            group: 'external'
        }
    ];

    if (input.gatewayRoute?.type === 'portal') {
        const brandLabel = toDisplayLabel(input.gatewayRoute.brandSlug) || DEFAULT_PORTAL_LABEL;
        const portalLabel = toDisplayLabel(input.gatewayRoute.portalSlug);
        segments.push({
            id: 'portal',
            label: portalLabel ? `${brandLabel} / ${portalLabel}` : brandLabel,
            enabled: true,
            group: 'external'
        });
        return segments;
    }

    if (input.gatewayRoute?.type === 'brand') {
        const brandLabel = toDisplayLabel(input.gatewayRoute.slug) || DEFAULT_PORTAL_LABEL;
        segments.push({
            id: 'portal',
            label: brandLabel,
            enabled: true,
            group: 'external'
        });
        return segments;
    }

    segments.push({
        id: 'portal',
        label: input.labels.portal || DEFAULT_PORTAL_LABEL,
        enabled: true,
        group: 'external'
    });

    return segments;
};

const combineUnique = (left: PathSegment[], right: PathSegment[]): PathSegment[] => {
    const ids = new Set<PathSegmentId>();
    const result: PathSegment[] = [];
    [...left, ...right].forEach(segment => {
        if (ids.has(segment.id)) return;
        ids.add(segment.id);
        result.push(segment);
    });
    return result;
};

export const resolvePathProjection = (input: PathProjectionInput): PathProjectionResult => {
    const effectiveFlow = resolveEffectiveFlow(input.navigationFlowMode, input.viewContext);
    const currentDepthId = resolveCurrentDepthId(input.viewContext);
    const internal = resolveInternalSegments(input);
    const external = resolveExternalSegments(input);

    let projected: PathSegment[];

    if (input.breadcrumbLens === 'full') {
        projected = input.viewContext === 'gateway'
            ? external
            : combineUnique(external, internal);
    } else if (input.breadcrumbLens === 'external') {
        projected = external;
    } else if (input.breadcrumbLens === 'internal') {
        projected = internal;
    } else {
        projected = effectiveFlow === 'explore' ? external : internal;
    }

    const segmentIds = projected.map(segment => segment.id);
    const fallbackActiveId = projected[projected.length - 1]?.id ?? 'station';
    const activeId = segmentIds.includes(currentDepthId) ? currentDepthId : fallbackActiveId;

    return {
        segments: projected,
        activeId,
        collapsed: input.pathDisplayMode === 'compact',
        effectiveFlow
    };
};
