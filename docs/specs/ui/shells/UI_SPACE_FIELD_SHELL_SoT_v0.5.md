Status: SoT
Version: v0.5
Owner: SF
Last updated: 2026-01-05
Supersedes: UI_SPACE_FIELD_SHELL_SoT_v0.5_r2.md

# UI_SPACE_FIELD_SHELL_SoT_v0.5_r2
**Status:** Source of Truth (SoT)  
**Scope:** SF UI v0.5 — Space Field Shell (Field-first)  
**Constraint:** No changes to Canvas substrate (Field is autonomous; UI is peripheral).

---

## 0) References
- UI_HOME_PORTAL_SoT_v0.5_r1
- UI_INTERACTION_PIPELINE_SoT_v0.5_r1
- UI_HOTKEYS_SELECTION_SoT_v0.5_r1
- GRAPH_ADDRESSING_SoT_v0.5_r1


---

## 1) Purpose
Space Field is the primary working environment:
- infinite **Field** (canvas) where the graph grows
- minimal shell UI that never dominates the field
- NOW is a **scale shift** overlay (present view), not a separate tab/page

---

## 2) Core rule (Field-first)
- Field (canvas) is the main product surface.
- UI overlays/panels must be hideable without losing core functionality.
- Field does not “know” UI; UI subscribes to state and hit-test.

---

## 3) View contexts inside a Space / Field
- **Space Field** (default): canvas + minimal shell
- **NOW**: fullscreen overlay on top of Field, with optional split layout

---

## 4) Shell zones (minimal, always-available)
### 4.1 StateCore (top-right)
- Session HUD/control
- Modes: hidden/micro/expanded (see UI_STATECORE_SoT_v0.5)

### 4.2 Tool Dock (left)
- Tool icons + toggles for drawers
- Minimal footprint (icons + tooltip)
- Must not behave as “tabs” (no app-level mode switching)

### 4.3 Time Chip (bottom-right)
- Current time lens (NOW/DAY/WEEK/MONTH/YEAR)
- Click opens Log drawer with time-filtered lens

---

## 5) Z-layers (render stack)
| Z | Layer | Contents |
|---|---|---|
| Z5 | Peripheral Shell | StateCore, Tool Dock, Time Chip |
| Z4 | Context UI | Context toolbar + optional context drawer |
| Z3 | Drawers/Panels | Log drawer, Settings modal/drawer, Agent split (optional) |
| Z2 | Tool Layer | gesture router + active tool cursor/handles |
| Z1 | Overlay Layer | hints/ghosts/previews/selection bounds |
| Z0 | Field | nodes/links renderables + camera |

---

## 6) Tools (v0.5 set)
### 6.1 Default tool: Pointer (unified navigate/select)
- Pan, select, multi-select, box select, move selection via hit-test + modifiers.
- No separate Navigate/Select mode in UI.

### 6.2 Explicit tools
- Link tool
- Region tool (overlay regions)
- NOW action *(usually triggered from Pointer via double-click / Enter; no separate tool needed)*

**Key:** Tool rules live in Gesture Router, not scattered in components.

---

## 7) Selection (first-class)
SelectionState is separate from graph objects:
- selectedIds[]
- primaryId
- bounds
- selectionMode (single/multi/box)

Selection drives **Context UI**.

---

## 8) Context UI (no permanent heavy Properties)
### 8.1 Context Toolbar (appears on selection)
- quick title edit (1-line)
- actions: Dive / Link / Group / Delete
- “More…” → opens context drawer/panel

### 8.2 Context Drawer (progressive disclosure)
Collapsed sections by default:
- Basic (title, short note)
- Links summary/list
- Components: “Add component…”
- Advanced (optional): dev fields, xp/time/style, etc.

---

## 9) Drawers & panels (definition)
**Drawer** = edge-attached panel (bottom/right), temporary, closable.  
**v0.5 minimal set:**
- **Log / Timeline Drawer** (primary): opened via Time Chip or dock toggle
- **Settings modal/drawer**: opened via dock toggle or palette
- **Agent split panel** (optional): opened via palette or dock toggle; default OFF

**Window dock is OUT in v0.5.**

---

## 10) NOW overlay rules
- **ENTER NOW**: double-click node / Enter / context action
- **EXIT NOW**: Esc / “Back to Field”
- NOW overlay can be:
  - fullscreen (default)
  - split (optional power mode): NOW | Field side-by-side
- StateCore remains available (micro/expanded), but stays session-level.

---

## 11) Events (Actions & Events model)
### 11.1 UIEvents
- `SpaceOpened(spaceId)`
- `ToolChanged(toolId)`
- `LogDrawerOpened/Closed`
- `SettingsOpened/Closed`
- `NowEntered(nodeId)` / `NowExited`

### 11.2 OverlayEvents
- `SelectionPreviewUpdated`
- `LinkPreviewUpdated`
- `HintShown/Hidden`

### 11.3 DomainEvents (commit)
- `NodeCreated/Updated/Moved/Deleted`
- `LinkCreated/Deleted`
- `HubCreated/Dissolved`
- `RegionOverlayCreated/Updated/Deleted` *(if persisted)*
- `SessionStateSet` (via StateCore)

---

## 11.5 Hotkeys canon
See **UI_HOTKEYS_SELECTION_SoT_v0.5_r1**. Key points:
- Shift+Click/Shift+Drag = selection
- Links via port-drag or `L` mode (no Shift)
- Shift+Enter = Group → Hub
- `Z` = Zone tool

## 12) DoD — Space Field Shell v0.5
- [ ] Field remains primary; UI never blocks core interactions
- [ ] Pointer tool works (pan/select/move/box/multi)
- [ ] Context toolbar appears on selection; heavy properties are not default
- [ ] Log drawer works via Time Chip (time lens filtering)
- [ ] Settings accessible via palette/dock
- [ ] Dive overlay enter/exit is stable (Esc)
- [ ] StateCore micro/expanded works without polluting node properties
