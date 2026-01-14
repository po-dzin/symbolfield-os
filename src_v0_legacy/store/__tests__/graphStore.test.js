import { describe, it, expect, beforeEach } from 'vitest'
import { useGraphStore } from '../graphStore'

describe('graphStore', () => {
    beforeEach(() => {
        // Reset store before each test
        useGraphStore.setState({
            nodes: [],
            edges: [],
            hasCore: false,
            selectedNodeId: null,
            interactionState: 'IDLE',
            tempConnection: null
        })
    })

    it('starts with empty state', () => {
        const state = useGraphStore.getState()
        expect(state.nodes).toEqual([])
        expect(state.edges).toEqual([])
        expect(state.hasCore).toBe(false)
    })

    it('adds a node correctly', () => {
        const { addNode } = useGraphStore.getState()

        addNode({ x: 100, y: 100 }, { type: 'container' })

        const state = useGraphStore.getState()
        expect(state.nodes).toHaveLength(1)
        expect(state.nodes[0].entity.type).toBe('container')
        expect(state.nodes[0].position).toEqual({ x: 100, y: 100 })
    })

    it('transforms Source to Core correctly', () => {
        const { addNode, transformSourceToCore } = useGraphStore.getState()

        // Add a source node
        const sourceId = addNode({ x: 100, y: 100 }, { type: 'source' })

        // Transform it
        transformSourceToCore(sourceId)

        const state = useGraphStore.getState()
        expect(state.hasCore).toBe(true)
        expect(state.nodes[0].entity.type).toBe('core')
    })

    it('deletes a node correctly', () => {
        const { addNode, deleteNode } = useGraphStore.getState()

        // Add two nodes
        const id1 = addNode({ x: 100, y: 100 }, { type: 'container' })
        addNode({ x: 200, y: 200 }, { type: 'container' })

        // Delete first node
        deleteNode(id1)

        const state = useGraphStore.getState()
        expect(state.nodes).toHaveLength(1)
        expect(state.nodes[0].position).toEqual({ x: 200, y: 200 })
    })
})
