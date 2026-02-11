import { eventBus, EVENTS } from '../events/EventBus';
import { selectionState } from '../state/SelectionState';
import { stateEngine, VIEW_CONTEXTS } from '../state/StateEngine';
import { graphEngine } from '../graph/GraphEngine';
import type { GraphAddress, GraphAddressV2, GraphViewLevel, NodeId } from '../types';
import { useCameraStore } from '../../store/useCameraStore';

const toNodeId = (value: NodeId | string | undefined): NodeId | undefined => {
    if (!value) return undefined;
    return value as NodeId;
};

export const DEFAULT_ATLAS_ID = 'symbolverse';
export const DEFAULT_STATION_ID = 'local-station';

const mapLegacyViewContextToV2Level = (context: string): GraphViewLevel => {
    if (context === VIEW_CONTEXTS.GATEWAY) return 'atlas';
    if (context === VIEW_CONTEXTS.NODE || context === VIEW_CONTEXTS.NOW) return 'node';
    if (context === VIEW_CONTEXTS.CLUSTER) return 'cluster';
    if (context === VIEW_CONTEXTS.SPACE) return 'space';
    return 'station';
};

export const buildGraphAddressSnapshotV2 = (overrides: Partial<GraphAddressV2> = {}): GraphAddressV2 => {
    const state = stateEngine.getState();
    const v2: GraphAddressV2 = {
        atlasId: DEFAULT_ATLAS_ID,
        stationId: DEFAULT_STATION_ID,
        view: mapLegacyViewContextToV2Level(state.viewContext),
        lod: state.subspaceLod
    };
    if (state.currentSpaceId) {
        v2.spaceId = state.currentSpaceId;
    }
    if (state.fieldScopeId) {
        v2.clusterId = state.fieldScopeId;
    }
    if (state.activeScope) {
        v2.nodeId = state.activeScope;
    }
    return {
        ...v2,
        ...overrides
    };
};

export const mapGraphAddressV2ToLegacy = (address: GraphAddressV2): GraphAddress => {
    const targetMode = address.view === 'node'
        ? 'node'
        : address.view === 'cluster'
            ? 'cluster'
            : 'field';
    const legacy: GraphAddress = {
        spaceId: address.spaceId || '',
        target: address.nodeId
            ? { nodeId: address.nodeId, mode: targetMode }
            : { mode: targetMode }
    };
    if (address.clusterId) {
        legacy.scope = { clusterId: address.clusterId };
    }
    return legacy;
};

export const buildGraphAddressSnapshot = (overrides: Partial<GraphAddress> = {}): GraphAddress => {
    const state = stateEngine.getState();
    const nodeIds = selectionState.getSelection();
    const cameraState = useCameraStore.getState();

    const isNodeView = state.viewContext === VIEW_CONTEXTS.NODE;
    const isClusterView = state.viewContext === VIEW_CONTEXTS.CLUSTER;
    const isNowView = state.viewContext === VIEW_CONTEXTS.NOW;
    const targetMode = isNowView
        ? 'now'
        : (isNodeView ? 'node' : (isClusterView ? 'cluster' : 'field'));
    const targetNodeId = isNodeView || isNowView
        ? state.activeScope ?? undefined
        : (isClusterView ? state.fieldScopeId ?? undefined : undefined);

    const base: GraphAddress = {
        spaceId: state.currentSpaceId || '',
        target: targetNodeId ? { nodeId: targetNodeId, mode: targetMode } : { mode: targetMode },
        camera: { x: cameraState.pan.x, y: cameraState.pan.y, z: cameraState.zoom }
    };

    if (state.fieldScopeId) {
        base.scope = { clusterId: state.fieldScopeId };
    }

    if (nodeIds.length) {
        base.selection = { nodeIds };
    }

    const { scope, selection, target, camera, ...rest } = overrides;
    const result: GraphAddress = {
        ...base,
        ...rest,
        target: { ...base.target, ...target }
    };

    if (scope) {
        result.scope = { ...base.scope, ...scope };
    }

    if (selection) {
        result.selection = { ...base.selection, ...selection };
    }

    if (camera) {
        result.camera = camera;
    }

    return result;
};

export const resolveGraphAddress = (address: GraphAddress) => {
    if (!address.spaceId) {
        eventBus.emit(EVENTS.ADDRESS_FAILED, { address, reason: 'missing_space_id' });
        return { ok: false, reason: 'missing_space_id' } as const;
    }

    stateEngine.setSpace(address.spaceId);

    // Restore Scope
    if (address.scope?.clusterId) {
        stateEngine.setFieldScope(address.scope.clusterId);
    } else {
        stateEngine.setFieldScope(null);
    }

    const targetNodeId = toNodeId(address.target?.nodeId);
    const mode = address.target?.mode ?? 'field';

    if (targetNodeId && mode === 'cluster') {
        stateEngine.enterClusterScope(targetNodeId);
    } else if (targetNodeId && mode === 'node') {
        const targetNode = graphEngine.getNode(targetNodeId);
        if (targetNode?.type === 'cluster') {
            stateEngine.enterClusterScope(targetNodeId);
        } else {
            stateEngine.enterNode(targetNodeId);
        }
    } else if (targetNodeId && mode === 'now') {
        stateEngine.enterNow(targetNodeId);
    } else {
        stateEngine.exitNode();
    }

    if (address.camera && 'x' in address.camera && 'y' in address.camera && 'z' in address.camera) {
        const camera = address.camera;
        useCameraStore.getState().setPan({ x: camera.x, y: camera.y });
        useCameraStore.getState().setZoom(camera.z);
    } else if (address.camera && 'rect' in address.camera) {
        const rect = address.camera.rect;
        const padding = Math.max(0, address.camera.padding ?? 0);
        const viewportWidth = typeof window !== 'undefined' ? Math.max(1, window.innerWidth) : 1400;
        const viewportHeight = typeof window !== 'undefined' ? Math.max(1, window.innerHeight) : 900;
        const spanW = Math.max(1, rect.width + (padding * 2));
        const spanH = Math.max(1, rect.height + (padding * 2));
        const zoom = Math.min(2, Math.max(0.25, Math.min(viewportWidth / spanW, viewportHeight / spanH)));
        const centerX = rect.x + rect.width / 2;
        const centerY = rect.y + rect.height / 2;
        const pan = {
            x: viewportWidth / 2 - centerX * zoom,
            y: viewportHeight / 2 - centerY * zoom
        };
        useCameraStore.getState().setZoom(zoom);
        useCameraStore.getState().setPan(pan);
    }

    if (address.selection?.nodeIds?.length) {
        selectionState.setSelection(address.selection.nodeIds, address.selection.nodeIds.length > 1 ? 'multi' : 'single');
    }

    eventBus.emit(EVENTS.ADDRESS_RESOLVED, { address });
    return { ok: true } as const;
};
