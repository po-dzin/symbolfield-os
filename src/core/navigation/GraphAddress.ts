import { eventBus, EVENTS } from '../events/EventBus';
import { selectionState } from '../state/SelectionState';
import { stateEngine, VIEW_CONTEXTS } from '../state/StateEngine';
import type { GraphAddress, NodeId } from '../types';
import { useCameraStore } from '../../store/useCameraStore';

const toNodeId = (value: NodeId | string | undefined): NodeId | undefined => {
    if (!value) return undefined;
    return value as NodeId;
};

export const buildGraphAddressSnapshot = (overrides: Partial<GraphAddress> = {}): GraphAddress => {
    const state = stateEngine.getState();
    const nodeIds = selectionState.getSelection();
    const cameraState = useCameraStore.getState();

    const targetMode = state.viewContext === VIEW_CONTEXTS.NOW ? 'now' : 'field';
    const targetNodeId = state.viewContext === VIEW_CONTEXTS.NOW ? state.activeScope ?? undefined : undefined;

    const base: GraphAddress = {
        spaceId: state.currentSpaceId || '',
        target: targetNodeId ? { nodeId: targetNodeId, mode: targetMode } : { mode: targetMode },
        camera: { x: cameraState.pan.x, y: cameraState.pan.y, z: cameraState.zoom }
    };

    if (state.fieldScopeId) {
        base.scope = { clusterId: state.fieldScopeId }; // Changed hubId to clusterId
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

    if (targetNodeId && mode === 'now') {
        stateEngine.enterNow(targetNodeId);
    } else {
        stateEngine.exitNow();
    }

    // TODO: support rect+padding focus intent (spec allows, v0.5 uses x/y/z).
    if (address.camera && 'x' in address.camera && 'y' in address.camera && 'z' in address.camera) {
        const camera = address.camera;
        useCameraStore.getState().setPan({ x: camera.x, y: camera.y });
        useCameraStore.getState().setZoom(camera.z);
    }

    if (address.selection?.nodeIds?.length) {
        selectionState.setSelection(address.selection.nodeIds, address.selection.nodeIds.length > 1 ? 'multi' : 'single');
    }

    eventBus.emit(EVENTS.ADDRESS_RESOLVED, { address });
    return { ok: true } as const;
};
