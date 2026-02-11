/**
 * playgroundContent.ts
 * Defines the default Playground Space structure for onboarding
 */

import type { NodeId } from '../types';
import { asNodeId } from '../types';
import { getCoreId } from './coreIds';

export const PLAYGROUND_SPACE_ID = 'playground' as NodeId;
export const PLAYGROUND_CORE_ID = getCoreId(PLAYGROUND_SPACE_ID) as NodeId;

export interface PlaygroundNodeDef {
    id: NodeId;
    label: string;
    icon_value?: string;
    icon_source?: 'sf' | 'generated' | 'blocksuite' | 'unicode';
    type: 'node' | 'cluster' | 'core';
    position: { x: number; y: number };
    content?: string; // Node view content
}

/**
 * Default Playground Space content
 * Based on UI_ONBOARDING_SANDBOX_SoT_v0.5 spec
 */
export const PLAYGROUND_NODES: PlaygroundNodeDef[] = [
    // Central Core
    {
        id: PLAYGROUND_CORE_ID,
        label: 'Playground Core',
        type: 'core',
        position: { x: 0, y: 0 }
    },

    // Tutorial Node 1: Welcome
    {
        id: asNodeId('playground-welcome'),
        label: 'Welcome to SymbolField',
        icon_value: '👋',
        type: 'node',
        position: { x: -200, y: -150 },
        content: `# Welcome to SymbolField

**Field** is space — your infinite canvas.
**Node** is the node interior — where you read and write.
**NOW** is ritual — a focused deep state.

**Keys to remember:**
- **Enter**: Open Node
- **Esc**: Return to Field
- **Double-click**: Also opens Node
- **Cmd/Ctrl+K**: Search & Omni Input

Try opening this card in Node by pressing Enter!`
    },

    // Tutorial Node 2: Make a Node
    {
        id: asNodeId('playground-create'),
        label: 'Create a Node',
        icon_value: '✦',
        type: 'node',
        position: { x: 200, y: -150 },
        content: `# Create a Node

**Double-click** anywhere on the Field to create a new node.

Try it now! Create your first node below this one.

You can also:
- Use the keyboard shortcut (coming soon)`
    },

    // Tutorial Node 3: Link Nodes
    {
        id: asNodeId('playground-link'),
        label: 'Link Two Nodes',
        icon_value: '🔗',
        type: 'node',
        position: { x: -200, y: 150 },
        content: `# Link Two Nodes

**Drag from a node's edge** to another node to create a link.

Or use **L mode**:
1. Press \`L\` to enter Link mode
2. Click first node
3. Click second node
4. Press \`L\` again to exit

Links represent relationships in your graph.`
    },

    // Tutorial Node 4: Group into Cluster
    {
        id: asNodeId('playground-group'),
        label: 'Group & Organize',
        icon_value: '📦',
        type: 'node',
        position: { x: 200, y: 150 },
        content: `# Group & Organize

**Multi-select** nodes:
- Shift+Click to add/remove
- Shift+Drag for box select

**Create a Cluster** from selection:
- Shift+Enter

Clusters are containers that organize related nodes into subgraphs.`
    }
];

/**
 * Edges between tutorial nodes
 */
export const PLAYGROUND_EDGES = [
    { from: PLAYGROUND_CORE_ID, to: asNodeId('playground-welcome') },
    { from: PLAYGROUND_CORE_ID, to: asNodeId('playground-create') },
    { from: PLAYGROUND_CORE_ID, to: asNodeId('playground-link') },
    { from: PLAYGROUND_CORE_ID, to: asNodeId('playground-group') },
    { from: asNodeId('playground-welcome'), to: asNodeId('playground-create') },
    { from: asNodeId('playground-link'), to: asNodeId('playground-group') }
];
