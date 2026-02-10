import React, { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useGraphStore } from '../../store/useGraphStore';
import { spaceManager } from '../../core/state/SpaceManager';
import CapsuleTabs, { type CapsuleTabItem } from '../Common/CapsuleTabs';

type ScopeId = 'brand' | 'home' | 'space' | 'node';

const DEFAULT_BRAND_SLUG = 'symbolfield';

const toDisplayLabel = (value: string): string => {
    const normalized = value.trim();
    if (!normalized) return '';
    return normalized
        .split(/[-_]/g)
        .map(part => part ? part.charAt(0).toUpperCase() + part.slice(1) : '')
        .join(' ');
};

const ScopeTabs: React.FC = () => {
    const viewContext = useAppStore(state => state.viewContext);
    const setViewContext = useAppStore(state => state.setViewContext);
    const currentSpaceId = useAppStore(state => state.currentSpaceId);
    const activeScope = useAppStore(state => state.activeScope);
    const gatewayRoute = useAppStore(state => state.gatewayRoute);
    const setGatewayRoute = useAppStore(state => state.setGatewayRoute);
    const pathDisplayMode = useAppStore(state => state.pathDisplayMode);

    const nodes = useGraphStore(state => state.nodes);
    const activeNode = useMemo(
        () => nodes.find(node => node.id === activeScope) ?? null,
        [nodes, activeScope]
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

    const brandLabel = useMemo(() => {
        if (gatewayRoute?.type === 'portal') return toDisplayLabel(gatewayRoute.brandSlug) || 'SymbolField';
        if (gatewayRoute?.type === 'brand') return toDisplayLabel(gatewayRoute.slug) || 'SymbolField';
        return 'SymbolField';
    }, [gatewayRoute]);

    const currentId: ScopeId = viewContext === 'gateway'
        ? 'brand'
        : viewContext === 'node'
            ? 'node'
            : viewContext === 'space'
                ? 'space'
                : 'home';

    const segments = useMemo<Array<CapsuleTabItem & { onSelect: () => void }>>(() => ([
        {
            id: 'brand',
            label: brandLabel,
            enabled: true,
            onSelect: () => {
                const slug = gatewayRoute?.type === 'portal'
                    ? gatewayRoute.brandSlug
                    : gatewayRoute?.type === 'brand'
                        ? gatewayRoute.slug
                        : DEFAULT_BRAND_SLUG;
                setGatewayRoute({ type: 'brand', slug });
                setViewContext('gateway');
            }
        },
        {
            id: 'home',
            label: 'Station',
            enabled: true,
            onSelect: () => setViewContext('home')
        },
        {
            id: 'space',
            label: spaceLabel,
            enabled: Boolean(currentSpaceId),
            onSelect: () => {
                if (!currentSpaceId) return;
                setViewContext('space');
            }
        },
        {
            id: 'node',
            label: nodeLabel,
            enabled: Boolean(activeScope),
            onSelect: () => {
                if (!activeScope) return;
                setViewContext('node');
            }
        }
    ]), [brandLabel, gatewayRoute, setGatewayRoute, setViewContext, spaceLabel, currentSpaceId, nodeLabel, activeScope]);

    const cycleToNextLevel = (direction: 1 | -1) => {
        const ids: ScopeId[] = ['brand', 'home', 'space', 'node'];
        const currentIndex = Math.max(0, ids.indexOf(currentId));
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
        <div className="ml-3">
            <CapsuleTabs
                items={segments}
                activeId={currentId}
                onSelect={(id) => {
                    if (pathDisplayMode === 'compact') {
                        cycleToNextLevel(1);
                        return;
                    }
                    const match = segments.find(segment => segment.id === id);
                    if (match && match.enabled !== false) {
                        match.onSelect();
                    }
                }}
                onCycle={cycleToNextLevel}
                collapsed={pathDisplayMode === 'compact'}
                title={pathDisplayMode === 'compact'
                    ? 'Compact path: click or Tab to move to next level'
                    : 'Path: full breadcrumb (Tab cycles levels)'}
                size="sm"
            />
        </div>
    );
};

export default ScopeTabs;
