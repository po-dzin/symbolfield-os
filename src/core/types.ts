/**
 * Core type definitions for SymbolField OS
 * Philosophy: Strict contracts, flexible data
 */

// =============================================================================
// Branded ID Types
// =============================================================================

/** Strongly-typed Node identifier */
export type NodeId = string & { readonly __brand: 'NodeId' }

/** Strongly-typed Edge identifier */
export type EdgeId = string & { readonly __brand: 'EdgeId' }

// ID Helpers
export const asNodeId = (s: string): NodeId => s as NodeId
export const asEdgeId = (s: string): EdgeId => s as EdgeId

// =============================================================================
// Position & Geometry
// =============================================================================

export interface Position {
    x: number
    y: number
}

// =============================================================================
// Areas (Zone/Region overlays)
// =============================================================================

export type AreaId = string
export type AreaShape = 'rect' | 'circle'

export interface AreaRect {
    x: number
    y: number
    w: number
    h: number
}

export interface AreaCircle {
    cx?: number
    cy?: number
    r: number
}

export type AreaAnchor =
    | { type: 'canvas' }
    | {
        type: 'node'
        nodeId: NodeId
        attach: 'center'
        offset?: { dx: number; dy: number }
        follow: 'position'
    }

export interface AreaRing {
    id: string
    r: number
    opacityMul?: number
    border?: { width: number; style: 'solid' | 'dashed' }
}

export interface Area {
    id: AreaId
    title?: string
    shape: AreaShape
    rect?: AreaRect
    circle?: AreaCircle
    anchor: AreaAnchor
    color: string
    opacity: number
    border: { width: number; style: 'solid' | 'dashed' }
    borderColor?: string
    zIndex: number
    locked: boolean
    hitbox: 'border' | 'fill'
    purpose?: 'highlight' | 'clusterFrame' | 'influence'
    clusterId?: string
    rings?: AreaRing[]
    created_at: number
    updated_at: number
}

// =============================================================================
// Node Types (Flexible data model)
// =============================================================================

export interface NodeData {
    label?: string
    icon_value?: string
    color?: string
    color_body?: string
    color_stroke?: string
    color_glow?: string
    color_glyph?: string
    glyph_offset_x?: number
    glyph_offset_y?: number
    glyph_scale?: number
    glyph_align?: 'auto' | 'manual'
}

export interface NodeBase {
    id: NodeId
    type?: string
    position: Position
    data: NodeData & Record<string, unknown>
    style?: Record<string, unknown>
    meta?: Record<string, unknown>
    created_at?: number
    updated_at?: number
}

/** Partial update for a node - id is required, rest optional */
export type NodePatch = Partial<Omit<NodeBase, 'id'>> & { id: NodeId }

// =============================================================================
// Edge Types
// =============================================================================

export interface Edge {
    id: EdgeId
    source: NodeId
    target: NodeId
    type?: string
}

// =============================================================================
// Store State Types
// =============================================================================

export interface GraphState {
    nodes: NodeBase[]
    edges: Edge[]
    version: number
}

export interface CameraState {
    zoom: number
    pan: Position
}

export interface SelectionState {
    selectedIds: NodeId[]
}

// =============================================================================
// App Modes
// =============================================================================

export type AppMode = 'default' | 'edit' | 'connect' | 'pan'
export type ActiveTab = 'canvas' | 'settings' | 'debug'

// =============================================================================
// Graph Addressing (Navigation)
// =============================================================================

export type GraphAddressTargetMode = 'field' | 'note' | 'now'

export interface GraphAddressScope {
    clusterId?: NodeId
}

export interface GraphAddressTarget {
    nodeId?: NodeId
    mode?: GraphAddressTargetMode
}

export type GraphAddressCamera =
    | { x: number; y: number; z: number }
    | { rect: { x: number; y: number; width: number; height: number }; padding?: number }

export interface GraphAddressSelection {
    nodeIds?: NodeId[]
    edgeIds?: EdgeId[]
}

export interface GraphAddress {
    spaceId: string
    scope?: GraphAddressScope
    target?: GraphAddressTarget
    camera?: GraphAddressCamera
    selection?: GraphAddressSelection
}
