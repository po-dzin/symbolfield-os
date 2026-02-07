
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { gestureRouter } from '../GestureRouter';
import { graphEngine } from '../../../core/graph/GraphEngine';
import { selectionState } from '../../../core/state/SelectionState';
import { eventBus } from '../../../core/events/EventBus';

// Mock Dependencies
vi.mock('../../../core/graph/GraphEngine', () => ({
    graphEngine: {
        getNode: vi.fn(),
        removeNode: vi.fn()
    }
}));
vi.mock('../../../core/state/SelectionState', () => ({
    selectionState: {
        getSelection: vi.fn(),
        clear: vi.fn()
    }
}));
vi.mock('../../../core/events/EventBus', () => ({
    eventBus: {
        emit: vi.fn()
    }
}));

describe('GestureRouter Logic', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Core Protection', () => {
        test('should not delete core nodes', () => {
            // Setup: Selection contains a 'core' node
            (selectionState.getSelection as any).mockReturnValue(['core-1']);
            (graphEngine.getNode as any).mockReturnValue({ id: 'core-1', type: 'core' });

            const event = { code: 'Delete', preventDefault: vi.fn() } as any;
            gestureRouter.handleKeyDown(event);

            expect(graphEngine.removeNode).not.toHaveBeenCalled();
            expect(selectionState.clear).toHaveBeenCalled();
        });

        test('should not delete core nodes', () => {
            // Setup: Selection contains a core node
            (selectionState.getSelection as any).mockReturnValue(['core-1']);
            (graphEngine.getNode as any).mockReturnValue({ id: 'core-1', type: 'core' });

            const event = { code: 'Delete', preventDefault: vi.fn() } as any;
            gestureRouter.handleKeyDown(event);

            expect(graphEngine.removeNode).not.toHaveBeenCalled();
        });

        test('should delete regular nodes', () => {
            // Setup: Selection contains a 'node' node
            (selectionState.getSelection as any).mockReturnValue(['node-1']);
            (graphEngine.getNode as any).mockReturnValue({ id: 'node-1', type: 'node' });

            const event = { code: 'Delete', preventDefault: vi.fn() } as any;
            gestureRouter.handleKeyDown(event);

            expect(graphEngine.removeNode).toHaveBeenCalledWith('node-1');
        });
    });
});
