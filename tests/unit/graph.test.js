/**
 * tests/unit/graph.test.js
 * Unit testing GraphEngine logic.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { graphEngine } from '../../src/core/graph/GraphEngine';
import { asNodeId } from '../../src/core/types';

describe('GraphEngine', () => {
    beforeEach(() => {
        // Reset graph? GraphEngine is singleton, needs a reset method or direct map clear
        graphEngine.nodes.clear();
        graphEngine.edges.clear();
    });

    it('should add a node', () => {
        const node = graphEngine.addNode({ id: asNodeId('test'), data: { label: 'Test' } });
        expect(node).toBeDefined();
        expect(graphEngine.nodes.has('test')).toBe(true);
        expect(node.data.label).toBe('Test');
    });

    it('should remove a node', () => {
        graphEngine.addNode({ id: asNodeId('test') });
        graphEngine.removeNode(asNodeId('test'));
        expect(graphEngine.nodes.has('test')).toBe(false);
    });
});
