Status: SoT
Version: v0.5
Owner: SymbolField
Last updated: 2026-01-05
Supersedes: UI_SPACE_FIELD_CORE_SoT_v0.5_r1

# UI_SPACE_FIELD_CORE_SoT_v0.5

---


## 0) Canon
**Space Field** is the infinite canvas substrate where a Space graph grows.

Canonical pipeline:
**Field → Tool → Gesture → Intent → Action → Event**

---

## 1) State layering (do not mix)
- **GraphState**: nodes/edges/positions/hub-children/areas (persisted)
- **SelectionState**: current selection (first-class, separate from objects)
- **ToolState**: active tool + options (ephemeral)
- **UIState**: drawers/modals/palette (ephemeral)
- **OverlayState**: preview/ghost/hints (**overlay ≠ graph**, not persisted)
- **CameraState**: pan/zoom/inertia (ephemeral but restorable)

---

## 2) Camera-first
Camera is a service:
- pan / zoom / inertia
- `centerOn(nodeId | rect)`
- `zoomTo(rect, padding)`
- world coordinates are primary; UI uses projection

Performance guardrails:
- cull off-viewport nodes/edges
- LOD for labels/edges
- avoid layout recomputation on every frame

---

## 3) Tools (v0.5 minimal set)
- **Navigate** (default): pan/zoom + selection (hold `Space` + drag)
- **Link** (optional toggle): link mode via `L` (click A → click B)
- **Area** (optional toggle): create colored area (if module enabled)

Rule: user is always “in the field”; tools only shape gesture interpretation.

---

## 4) Selection rules (canon)
- Click: select node
- Shift+Click: add/remove from selection
- Shift+Drag on empty: box select
- Selection drives **Context UI** (not a permanent properties window)

---

## 5) Linking rules (canon)
- Primary: drag from node **port** to another node
- Optional: `L` link mode (two clicks)
- Shift is not used for linking.

---

## 6) Grouping / Hub
- With multi-selection:
  - `Shift+Enter` → create Hub from selection
  - Hub is a node with local subgraph (children)

---

## 7) Areas / Clusters (optional in v0.5)
- Toggle Area tool (e.g., `A`)
- Drag to draw area rect
- Area has: name, color, note
- Area is a visual metadata layer anchored to world coords

---

## 8) DoD (v0.5)
- 60fps pan/zoom on medium graphs
- Core interactions: select, multi-select, link, group-to-hub
- Context UI appears based on selection and stays minimal by default