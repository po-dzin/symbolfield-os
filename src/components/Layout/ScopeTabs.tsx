import React, { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useGraphStore } from '../../store/useGraphStore';
import { spaceManager } from '../../core/state/SpaceManager';
import CapsuleTabs, { type CapsuleTabItem } from '../Common/CapsuleTabs';
import {
    DEFAULT_ATLAS_LABEL,
    DEFAULT_PORTAL_LABEL,
    resolvePathProjection,
    toDisplayLabel,
    type PathSegmentId
} from '../../core/navigation/PathProjection';

const DEFAULT_BRAND_SLUG = 'symbolfield';

const ScopeTabs: React.FC = () => {
    const viewContext = useAppStore(state => state.viewContext);
    const setViewContext = useAppStore(state => state.setViewContext);
    const currentSpaceId = useAppStore(state => state.currentSpaceId);
    const fieldScopeId = useAppStore(state => state.fieldScopeId);
    const activeScope = useAppStore(state => state.activeScope);
    const gatewayRoute = useAppStore(state => state.gatewayRoute);
    const setGatewayRoute = useAppStore(state => state.setGatewayRoute);
    const pathDisplayMode = useAppStore(state => state.pathDisplayMode);
    const breadcrumbLens = useAppStore(state => state.breadcrumbLens);
    const navigationFlowMode = useAppStore(state => state.navigationFlowMode);

    const nodes = useGraphStore(state => state.nodes);
    const activeNode = useMemo(
        () => nodes.find(node => node.id === activeScope) ?? null,
        [nodes, activeScope]
    );
    const activeCluster = useMemo(
        () => nodes.find(node => node.id === fieldScopeId && node.type === 'cluster') ?? null,
        [nodes, fieldScopeId]
    );

    const spaceLabel = useMemo(() => {
        if (!currentSpaceId) return 'Space';
        return spaceManager.getSpaceMeta(currentSpaceId)?.name || 'Space';
    }, [currentSpaceId]);

    const nodeLabel = useMemo(() => {
        if (!activeScope) return 'Node';
        const raw = typeof activeNode?.data?.label === 'string' ? activeNode.data.label.trim() : '';
        return raw || `Node ${String(activeScope).slice(0, 6)}`;
    }, [activeNode, activeScope]);

    const clusterLabel = useMemo(() => {
        if (!fieldScopeId) return 'Cluster';
        const raw = typeof activeCluster?.data?.label === 'string' ? activeCluster.data.label.trim() : '';
        return raw || `Cluster ${String(fieldScopeId).slice(0, 6)}`;
    }, [activeCluster, fieldScopeId]);

    const portalLabel = useMemo(() => {
        if (gatewayRoute?.type === 'portal') {
            const brand = toDisplayLabel(gatewayRoute.brandSlug) || 'Brand';
            const portal = toDisplayLabel(gatewayRoute.portalSlug);
            return portal ? `${brand} / ${portal}` : brand;
        }
        if (gatewayRoute?.type === 'brand') {
            return toDisplayLabel(gatewayRoute.slug) || DEFAULT_PORTAL_LABEL;
        }
        return DEFAULT_PORTAL_LABEL;
    }, [gatewayRoute]);

    const projection = useMemo(
        () =>
            resolvePathProjection({
                viewContext,
                gatewayRoute,
                currentSpaceId: currentSpaceId || null,
                fieldScopeId,
                activeScope,
                navigationFlowMode,
                breadcrumbLens,
                pathDisplayMode,
                labels: {
                    atlas: DEFAULT_ATLAS_LABEL,
                    portal: portalLabel,
                    station: 'Station',
                    space: spaceLabel,
                    cluster: clusterLabel,
                    node: nodeLabel
                }
            }),
        [
            viewContext,
            gatewayRoute,
            currentSpaceId,
            fieldScopeId,
            activeScope,
            navigationFlowMode,
            breadcrumbLens,
            pathDisplayMode,
            portalLabel,
            spaceLabel,
            clusterLabel,
            nodeLabel
        ]
    );

    const goAtlas = () => {
        const slug = gatewayRoute?.type === 'portal'
            ? gatewayRoute.brandSlug
            : gatewayRoute?.type === 'brand'
                ? gatewayRoute.slug
                : DEFAULT_BRAND_SLUG;
        setGatewayRoute({ type: 'brand', slug });
        setViewContext('gateway');
    };

    const goPortal = () => {
        if (gatewayRoute?.type === 'portal') {
            setGatewayRoute({
                type: 'portal',
                brandSlug: gatewayRoute.brandSlug,
                portalSlug: gatewayRoute.portalSlug
            });
            setViewContext('gateway');
            return;
        }
        const slug = gatewayRoute?.type === 'brand' ? gatewayRoute.slug : DEFAULT_BRAND_SLUG;
        setGatewayRoute({ type: 'brand', slug });
        setViewContext('gateway');
    };

    const segmentActions: Record<PathSegmentId, () => void> = {
        atlas: goAtlas,
        portal: goPortal,
        station: () => setViewContext('home'),
        space: () => {
            if (!currentSpaceId) return;
            setViewContext('space');
        },
        cluster: () => {
            if (!fieldScopeId) return;
            setViewContext('cluster');
        },
        node: () => {
            if (!activeScope) return;
            setViewContext('node');
        }
    };

    const segmentEnabled = (id: PathSegmentId): boolean => {
        if (id === 'space') return Boolean(currentSpaceId);
        if (id === 'cluster') return Boolean(fieldScopeId);
        if (id === 'node') return Boolean(activeScope);
        return true;
    };

    const segments: Array<CapsuleTabItem & { onSelect: () => void }> = projection.segments.map(segment => ({
        id: segment.id,
        label: segment.label,
        enabled: segment.enabled && segmentEnabled(segment.id),
        onSelect: segmentActions[segment.id]
    }));

    const cycleToNextLevel = (direction: 1 | -1) => {
        if (!segments.length) return;
        const ids = segments.map(segment => segment.id as PathSegmentId);
        const currentIndex = Math.max(0, ids.indexOf(projection.activeId));
        const step = direction === -1 ? -1 : 1;
        for (let offset = 1; offset <= ids.length; offset += 1) {
            const nextIndex = (currentIndex + (offset * step) + ids.length) % ids.length;
            const nextId = ids[nextIndex];
            const next = segments.find(segment => segment.id === nextId);
            if (next && next.enabled !== false) {
                next.onSelect();
                return;
            }
        }
    };

    return (
        <div className="ml-3 min-w-0">
            <CapsuleTabs
                items={segments}
                activeId={projection.activeId}
                onSelect={(id) => {
                    if (projection.collapsed) {
                        cycleToNextLevel(1);
                        return;
                    }
                    const match = segments.find(segment => segment.id === id);
                    if (match && match.enabled !== false) {
                        match.onSelect();
                    }
                }}
                onCycle={cycleToNextLevel}
                collapsed={projection.collapsed}
                title={projection.collapsed
                    ? 'Compact path: click or Tab to move to next level'
                    : `Path lens: ${breadcrumbLens}, flow: ${projection.effectiveFlow} (Tab cycles levels)`}
                size="sm"
            />
        </div>
    );
};

export default ScopeTabs;
