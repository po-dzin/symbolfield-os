
import { describe, it, expect, beforeEach } from 'vitest';
import { useOsShellStore } from '../osShellStore';

describe('useOsShellStore', () => {
    beforeEach(() => {
        // Reset store before each test
        const store = useOsShellStore.getState();
        useOsShellStore.setState({
            activeTab: 'graph',
            layoutMode: 'window',
            activeNodeId: null,
            _history: []
        });
    });

    it('should set activeTab correctly', () => {
        const { setTab } = useOsShellStore.getState();
        setTab('log');
        expect(useOsShellStore.getState().activeTab).toBe('log');
    });

    it('should set layoutMode correctly', () => {
        const { setLayout } = useOsShellStore.getState();
        setLayout('split');
        expect(useOsShellStore.getState().layoutMode).toBe('split');
    });

    describe('NOW Mode Logic', () => {
        it('enterNOW should switch tab, layout, and save history', () => {
            const nodeId = 'test-node-123';
            const { enterNOW } = useOsShellStore.getState();

            // Initial state check
            expect(useOsShellStore.getState().activeTab).toBe('graph');

            enterNOW(nodeId);

            const state = useOsShellStore.getState();
            expect(state.activeTab).toBe('now');
            expect(state.layoutMode).toBe('fullscreen');
            expect(state.activeNodeId).toBe(nodeId);
            expect(state._history).toHaveLength(1);
            expect(state._history[0]).toEqual({
                activeTab: 'graph',
                layoutMode: 'window',
                activeNodeId: null
            });
        });

        it('exitNOW should restore previous state', () => {
            const nodeId = 'test-node-123';
            const { enterNOW, exitNOW, setTab } = useOsShellStore.getState();

            // Setup: Go to Log tab
            setTab('log');

            // Action: Enter NOW
            enterNOW(nodeId);

            // Action: Exit NOW
            exitNOW();

            const state = useOsShellStore.getState();
            expect(state.activeTab).toBe('log');
            expect(state.layoutMode).toBe('window'); // Default was window
        });

        it('exitNOW should default to graph if no history', () => {
            const { exitNOW } = useOsShellStore.getState();
            exitNOW();
            const state = useOsShellStore.getState();
            expect(state.activeTab).toBe('graph');
        });
    });
});
