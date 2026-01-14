import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Node from '../Node'

describe('Node Component', () => {
    it('renders Source node correctly', () => {
        const sourceNode = {
            id: 'source-1',
            entity: { type: 'source' },
            components: {},
            state: {},
            position: { x: 100, y: 100 }
        }

        render(<Node node={sourceNode} />)

        // Source should have the "SOURCE" label
        expect(screen.getByText('SOURCE')).toBeInTheDocument()
    })

    it('renders Core node correctly', () => {
        const coreNode = {
            id: 'core-1',
            entity: { type: 'core' },
            components: { glyph: { id: 'core' } },
            state: {},
            position: { x: 200, y: 200 }
        }

        render(<Node node={coreNode} />)

        // Core should render (no specific text to check, but should not error)
        expect(screen.queryByText('SOURCE')).not.toBeInTheDocument()
    })

    it('renders Container node correctly', () => {
        const containerNode = {
            id: 'container-1',
            entity: { type: 'container' },
            components: {
                glyph: { id: 'node' },
                tone: { id: 'base' }
            },
            state: {},
            position: { x: 300, y: 300 }
        }

        render(<Node node={containerNode} />)

        // Container should render without errors
        expect(screen.queryByText('SOURCE')).not.toBeInTheDocument()
    })

    it('handles double-click on Source node', async () => {
        const user = userEvent.setup()
        const sourceNode = {
            id: 'source-1',
            entity: { type: 'source' },
            components: {},
            state: {},
            position: { x: 100, y: 100 }
        }

        const { container } = render(<Node node={sourceNode} />)
        const nodeElement = container.firstChild

        // Double-click should trigger transformSourceToCore
        await user.dblClick(nodeElement)

        // Note: This test just verifies no errors occur on double-click
        // Actual transformation testing should be in graphStore tests
        expect(nodeElement).toBeInTheDocument()
    })
})
