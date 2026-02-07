
import { render } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import CanvasView from '../CanvasView';
import { useGraphStore } from '../../../store/useGraphStore';
import { gestureRouter } from '../../../core/interaction/GestureRouter';

// Mock dependencies
vi.mock('../../../store/useGraphStore');
vi.mock('../../../store/useAppStore', () => ({
    useAppStore: (sel: any) => sel({ activeTool: 'pointer', viewContext: 'space' })
}));
vi.mock('../../../store/useCameraStore', () => {
    const store = () => ({ pan: { x: 0, y: 0 }, zoom: 1, zoomAt: vi.fn(), centerOn: vi.fn() });
    store.getState = () => ({ pan: { x: 0, y: 0 }, zoom: 1 });
    return { useCameraStore: store };
});
vi.mock('../../../core/graph/GraphEngine', () => ({
    graphEngine: {
        addNode: vi.fn(),
        getNode: vi.fn(),
        getNodes: vi.fn(() => []),
        getEdges: vi.fn(() => []),
        on: vi.fn(),
        emit: vi.fn()
    }
}));
vi.mock('../../../core/interaction/GestureRouter', () => ({
    gestureRouter: {
        handlePointerDown: vi.fn(),
        handlePointerMove: vi.fn(),
        handlePointerUp: vi.fn(),
        handleKeyDown: vi.fn()
    }
}));

describe('CanvasView Cosmogenesis', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        document.elementFromPoint = vi.fn();
    });

    test('renders Source Node when graph is empty', () => {
        // Mock empty nodes
        (useGraphStore as any).mockImplementation((sel: any) => sel({ nodes: [], edges: [] }));

        const view = render(<CanvasView />);
        expect(view.getByText('Source')).toBeInTheDocument();
        expect(view.getByText('Double-click to materialize')).toBeInTheDocument();
    });

    test('delegates double click to gesture router on Source', () => {
        (useGraphStore as any).mockImplementation((sel: any) => sel({ nodes: [], edges: [] }));

        const view = render(<CanvasView />);
        // Get the div with the handler. The span is inside it.
        const sourceNode = view.getByText('Source').closest('div');
        if (sourceNode) {
            sourceNode.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
            if (sourceNode) {
                sourceNode.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
                expect(gestureRouter.handlePointerDown).toHaveBeenCalled();
            }
        }
    });

    test('does NOT render Source Node when graph has nodes', () => {
        (useGraphStore as any).mockImplementation((sel: any) => sel({
            nodes: [{ id: 'n1', position: { x: 0, y: 0 }, data: {} }],
            edges: []
        }));

        const view = render(<CanvasView />);
        expect(view.queryByText('Source')).not.toBeInTheDocument();
    });
});
