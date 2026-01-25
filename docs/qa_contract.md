# QA Contract: Core Invariants

This document defines the invariants that MUST hold for SymbolField OS to be considered stable.
Violations should be caught by automated tests or QA scripts.

## 1. App State SSoT
> **Rule**: `StateEngine` is the ONLY authority for app-level UI state.

- **Invariant 1.1 (Mode Integrity)**:
  - URL path is NOT the source of truth for mode.
  - `stateEngine.getState()` owns `appMode`, `viewContext`, `activeTool`.
  - `paletteOpen`, `settingsOpen`, `contextMenuMode` come from StateEngine.

## 2. Graph State SSoT
> **Rule**: `GraphEngine` owns nodes and edges.

- **Invariant 2.1 (Mutation Discipline)**:
  - All graph mutations go through `graphEngine` (or `useGraphStore` actions).
  - No direct mutation of node/edge objects from UI components.

## 3. Selection State
> **Rule**: Selection is separate from graph data.

- **Invariant 3.1 (Selection Separation)**:
  - Use `SelectionState` for node selection.
  - Do NOT store selection flags inside node data or meta.
  - Edge selection uses `useEdgeSelectionStore` only.

## 4. Event Discipline
> **Rule**: Domain changes must emit events and be undoable.

- **Invariant 4.1 (Domain Events)**:
  - Graph mutations emit `NODE_*`, `LINK_*`, `HUB_*`, `GRAPH_CLEARED` events.
  - Undo/redo only uses domain events (no hidden state mutations).

- **Invariant 4.2 (UI Events)**:
  - UI overlays and hotkeys emit `UI_*` events.
  - UI events should not mutate graph state directly without going through the engine.

## 5. Render + Input Sanity
> **Rule**: Rendering is pure; input mapping is centralized.

- **Invariant 5.1 (No Side Effects in Render)**:
  - No `getState().action()` inside render bodies.
  - Window/document access must live in `useEffect`.

- **Invariant 5.2 (Gesture Router)**:
  - `GestureRouter` is the source of truth for pointer + hotkey mappings.
  - Avoid ad-hoc DOM event handlers for core graph behavior.

## 6. Graph Integrity
> **Rule**: The graph must remain consistent.

- **Invariant 6.1 (Edges)**:
  - Every edge connects existing source and target nodes.

- **Invariant 6.2 (Cascade Delete)**:
  - Deleting a node removes its connected edges.

## 7. Areas / Regions
> **Rule**: Area state is separate from graph nodes.

- **Invariant 7.1 (Area SSoT)**:
  - Areas live in `useAreaStore`.
  - Moving/resizing areas should not mutate nodes unless anchored.

