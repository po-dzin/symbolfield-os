import { create } from 'zustand';

/**
 * OS Shell Store (L0 Infrastructure Layer)
 * Manages the "Frame" of the OS: tabs, layout modes, and focus.
 * 
 * Source of Truth for:
 * - activeTab: 'graph' | 'now' | 'agent' | 'log' | 'settings'
 * - layoutMode: 'window' | 'split' | 'fullscreen'
 * - activeNodeId: UUID of the focused node (for NOW context)
 */
export const useOsShellStore = create((set, get) => ({
    // State
    activeTab: 'graph',
    layoutMode: 'window',
    activeNodeId: null,
    splitState: { left: 'now', right: 'graph' },

    // History for restore (internal)
    _history: [],

    // Actions
    setTab: (tabId) => {
        // Basic validation could go here
        set({ activeTab: tabId });
    },

    setLayout: (mode) => {
        set({ layoutMode: mode });
    },

    /**
     * Enter NOW mode for a specific node.
     * Automatically sets tab='now' and layout='fullscreen' (default for focus).
     */
    enterNOW: (nodeId) => {
        const { activeTab, layoutMode, activeNodeId } = get();

        // Save history before dive
        const historyState = { activeTab, layoutMode, activeNodeId };

        set((state) => ({
            activeTab: 'now',
            layoutMode: 'fullscreen',
            activeNodeId: nodeId,
            _history: [...state._history, historyState]
        }));
    },

    /**
     * Exit NOW mode.
     * Restores previous state or defaults to Graph.
     */
    exitNOW: () => {
        set((state) => {
            if (state._history.length === 0) {
                // Default fallback
                return {
                    activeTab: 'graph',
                    layoutMode: 'window',
                    activeNodeId: null
                };
            }

            // Pop last state
            const newHistory = [...state._history];
            const prevState = newHistory.pop();

            return {
                ...prevState,
                _history: newHistory
            };
        });
    }
}));
