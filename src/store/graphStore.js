import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export const useGraphStore = create((set, get) => ({
    nodes: [],
    edges: [],
    selection: [],
    interactionState: 'IDLE', // IDLE, CONNECTING, DRAGGING

    // Mode State
    mode: 'GRAPH', // 'GRAPH' | 'NOW'
    activeNodeId: null, // ID of the node being viewed in NOW mode


    // Core Lifecycle
    hasCore: false,

    // Connection State
    // Connection State
    tempConnection: null, // { sourceId, sourcePos, currentPos }

    // History State
    history: [],
    future: [],

    // History Actions
    pushToHistory: () => {
        const { nodes, edges, history } = get();
        // Deep copy to prevent reference issues
        const snapshot = {
            nodes: JSON.parse(JSON.stringify(nodes)),
            edges: JSON.parse(JSON.stringify(edges))
        };
        set({
            history: [...history.slice(-49), snapshot],
            future: []
        });
    },

    undo: () => {
        const { history, future, nodes, edges } = get();
        if (history.length === 0) return;

        const previous = history[history.length - 1];
        const newHistory = history.slice(0, -1);

        // Save current state to future
        const currentSnapshot = {
            nodes: JSON.parse(JSON.stringify(nodes)),
            edges: JSON.parse(JSON.stringify(edges))
        };

        set({
            nodes: previous.nodes,
            edges: previous.edges,
            history: newHistory,
            future: [currentSnapshot, ...future]
        });
        console.log('Start Undo');
    },

    redo: () => {
        const { history, future, nodes, edges } = get();
        if (future.length === 0) return;

        const next = future[0];
        const newFuture = future.slice(1);

        // Save current state to history
        const currentSnapshot = {
            nodes: JSON.parse(JSON.stringify(nodes)),
            edges: JSON.parse(JSON.stringify(edges))
        };

        set({
            nodes: next.nodes,
            edges: next.edges,
            history: [...history, currentSnapshot],
            future: newFuture
        });
        console.log('Start Redo');
    },

    // Actions
    startConnection: (sourceId, sourcePos) => {
        set({
            interactionState: 'CONNECTING',
            tempConnection: { sourceId, sourcePos, currentPos: sourcePos }
        });
    },

    updateTempConnection: (currentPos) => {
        set(state => ({
            tempConnection: { ...state.tempConnection, currentPos }
        }));
    },

    endConnection: (targetId) => {
        const { tempConnection, edges, pushToHistory } = get();
        if (tempConnection && targetId && tempConnection.sourceId !== targetId) {
            pushToHistory(); // Save state before adding edge
            // Create Edge
            const newEdge = {
                id: uuidv4(),
                source: tempConnection.sourceId,
                target: targetId,
                type: 'mycelial'
            };
            // Check for duplicates
            const exists = edges.some(e =>
                (e.source === newEdge.source && e.target === newEdge.target) ||
                (e.source === newEdge.target && e.target === newEdge.source)
            );

            if (!exists) {
                set(state => ({ edges: [...state.edges, newEdge] }));
            }
        }
        set({ interactionState: 'IDLE', tempConnection: null });
    },

    cancelConnection: () => {
        set({ interactionState: 'IDLE', tempConnection: null });
    },

    initializeGraph: () => {
        const { nodes, hasCore } = get();
        if (nodes.length === 0 && !hasCore) {
            // Spawn Source Node at origin (not screen center)
            set({
                nodes: [{
                    id: 'source-node',
                    position: { x: 0, y: 0 },
                    entity: { type: 'source' },
                    components: {
                        glyph: { id: 'source' },
                        tone: { id: 'void' },
                        xp: { hp: 0, ep: 0, mp: 0, sp: 0, np: 100 },
                        temporal: { scale: 'now' }
                    },
                    state: {
                        isSource: true,
                        isCore: false,
                        mode: 'DEEP'
                    }
                }]
            });
        }
    },

    transformSourceToCore: (id) => {
        get().pushToHistory();
        set(state => ({
            hasCore: true,
            nodes: state.nodes.map(node => {
                if (node.id === id) {
                    return {
                        ...node,
                        position: { x: 0, y: 0 }, // Force Core to center
                        entity: { type: 'core' },
                        components: {
                            ...node.components,
                            glyph: { id: 'core' }, // Base core glyph
                            tone: { id: 'base' } // Inherit base tone
                        },
                        state: {
                            ...node.state,
                            isSource: false,
                            isCore: true
                        }
                    };
                }
                return node;
            })
        }));
    },

    addNode: (position, autoConnectTo = null) => {
        get().pushToHistory();
        const newNode = {
            id: uuidv4(),
            position,
            entity: { type: 'container' }, // Empty container
            components: {
                glyph: null, // No glyph
                tone: null, // No tone initially
                xp: { hp: 0, ep: 0, mp: 0, sp: 0, np: 0 },
                temporal: { scale: 'day' }
            },
            state: {
                mode: 'DEEP',
                lastEditedAt: Date.now(), // Timestamp for aging system
                activatedAt: Date.now() // For "joy" animation
            }
        };

        set(state => {
            const newNodes = [...state.nodes, newNode];
            let newEdges = state.edges;

            // Auto-connect if requested
            if (autoConnectTo) {
                const newEdge = {
                    id: uuidv4(),
                    source: autoConnectTo,
                    target: newNode.id,
                    type: 'mycelial'
                };
                newEdges = [...state.edges, newEdge];
            }

            return {
                nodes: newNodes,
                edges: newEdges,
                interactionState: 'IDLE',
                tempConnection: null
            };
        });

        return newNode.id;
    },

    activateNode: (id) => {
        set(state => ({
            nodes: state.nodes.map(node =>
                node.id === id
                    ? {
                        ...node,
                        state: {
                            ...node.state,
                            lastEditedAt: Date.now(),
                            activatedAt: Date.now()
                        }
                    }
                    : node
            )
        }));
    },

    updateNodePosition: (id, position) => {
        set(state => ({
            nodes: state.nodes.map(node =>
                node.id === id ? { ...node, position } : node
            )
        }));
    },

    // Mode Actions
    setMode: (mode) => set({ mode }),

    enterNOW: (nodeId) => {
        console.log('🏪 graphStore: enterNOW triggered for', nodeId);
        set((state) => {
            console.log('🏪 graphStore: switching mode to NOW');
            // Push current state to history before switching? 
            // For now just switch.
            return {
                mode: 'NOW',
                activeNodeId: nodeId,
                selection: [nodeId] // Also select it
            };
        });
    },

    exitNOW: () => {
        set({
            mode: 'GRAPH',
            activeNodeId: null
        });
    },

    selectNode: (id) => {
        set({ selection: [id] });
    },

    clearSelection: () => {
        set({ selection: [] });
    },

    // Node Management Actions
    cloneNode: (id) => {
        const { nodes } = get();
        const sourceNode = nodes.find(n => n.id === id);
        if (!sourceNode) return null;

        const clonedNode = {
            ...sourceNode,
            id: uuidv4(),
            position: {
                x: sourceNode.position.x + 50,
                y: sourceNode.position.y + 50
            },
            state: {
                ...sourceNode.state,
                lastEditedAt: Date.now(),
                activatedAt: Date.now()
            }
        };

        set(state => ({
            nodes: [...state.nodes, clonedNode]
        }));

        return clonedNode.id;
    },

    deleteNode: (id) => {
        const { nodes, pushToHistory } = get();
        const node = nodes.find(n => n.id === id);

        // Cannot delete Core node
        if (node?.entity.type === 'core') {
            console.warn('⚠️ Cannot delete Core node');
            return false;
        }

        pushToHistory();

        set(state => ({
            nodes: state.nodes.filter(n => n.id !== id),
            edges: state.edges.filter(e => e.source !== id && e.target !== id),
            selection: state.selection.filter(s => s !== id)
        }));

        console.log('🗑 Node deleted:', id);
        return true;
    },

    // Component Management Actions
    addComponentToNode: (nodeId, componentType, initialData = {}) => {
        get().pushToHistory();
        set(state => ({
            nodes: state.nodes.map(node => {
                if (node.id === nodeId) {
                    const updatedComponents = { ...node.components };

                    // Set default data based on component type
                    switch (componentType) {
                        case 'glyph':
                            updatedComponents.glyph = initialData.id || { id: 'node' };
                            break;
                        case 'tone':
                            updatedComponents.tone = initialData.id || { id: 'void' };
                            break;
                        case 'xp':
                            updatedComponents.xp = initialData || { hp: 0, ep: 0, mp: 0, sp: 0, np: 0 };
                            break;
                        case 'temporal':
                            updatedComponents.temporal = initialData || { scale: 'day' };
                            break;
                        case 'process':
                            updatedComponents.process = initialData || { enabled: false };
                            break;
                        case 'ritual':
                            updatedComponents.ritual = initialData || { enabled: false };
                            break;
                        default:
                            break;
                    }

                    return {
                        ...node,
                        components: updatedComponents,
                        state: {
                            ...node.state,
                            lastEditedAt: Date.now()
                        }
                    };
                }
                return node;
            })
        }));
    },

    removeComponentFromNode: (nodeId, componentType) => {
        get().pushToHistory();
        set(state => ({
            nodes: state.nodes.map(node => {
                if (node.id === nodeId) {
                    const updatedComponents = { ...node.components };
                    updatedComponents[componentType] = null;

                    return {
                        ...node,
                        components: updatedComponents,
                        state: {
                            ...node.state,
                            lastEditedAt: Date.now()
                        }
                    };
                }
                return node;
            })
        }));
    },

    updateNodeComponent: (nodeId, componentType, data) => {
        get().pushToHistory();
        set(state => ({
            nodes: state.nodes.map(node => {
                if (node.id === nodeId) {
                    return {
                        ...node,
                        components: {
                            ...node.components,
                            [componentType]: data
                        },
                        state: {
                            ...node.state,
                            lastEditedAt: Date.now()
                        }
                    };
                }
                return node;
            })
        }));
    }
}));
