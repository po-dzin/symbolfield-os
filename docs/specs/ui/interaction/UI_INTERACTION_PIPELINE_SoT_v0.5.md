Status: SoT
Version: v0.5
Owner: SF
Last updated: 2026-01-05
Supersedes: UI_INTERACTION_PIPELINE_SoT_v0.5_r1.md

# UI_GESTURE_INTENT_PIPELINE_SoT_v0.5
**Status:** Source of Truth (SoT)  
**Scope:** SF UI v0.5 — Interaction semantics for input interpretation  
**Canon:** `Field > Tool > Gesture > Intent > Action > Event`  
**Note:** We keep **Actions & Events** as primary terms (no Command terminology required).

---

## 0) Ontology note (SF v0.5)
- **Portal** = a *door* (jump) that can target any addressable subgraph: **Space / Hub / Node**.
- **Space** = a subgraph of the user’s **Global Graph**.
- **Hub** = a subgraph inside a Space (container hub).
- **Node** = a graph element that may include a *local subgraph* (nested).
- **NOW** = the focused *present view* of a Node (scale-shift). The action is **ENTER NOW**, the return is **BACK TO FIELD**.

## 1) Definitions

### 1.1 Gesture (raw input)
**Gesture** is the *physical input signal*, before meaning is assigned.

**Includes**
- Pointer: `down/move/up`, buttons, pressure (optional), pointerId
- Wheel/pinch: zoom deltas
- Keyboard: keydown/up + modifiers (Shift/Alt/Ctrl/Meta)
- Timing: double-click, long-press, hold duration
- Hit-test context: what is under the pointer (empty field / node / link / UI surface)
- Coordinate frames: `screen` and `world`

**Gesture does NOT contain**
- “I want to link nodes”
- “This is a selection”
- Any domain meaning

**Examples**
- `PointerDown(x,y,Left, Shift)`
- `PointerDrag(from→to, duration=320ms)`
- `Wheel(deltaY=-120, ctrlKey=true)`
- `DoubleClick(target=Node#42)`
- `KeyDown(Escape)`

---

### 1.2 Intent (semantic intention)
**Intent** is the interpreted *meaning* of the gesture under the current context.

Intent is derived from:
- active tool (or pointer-tool rules)
- hit-test results (empty vs object)
- selection state
- view context (Home vs Space vs Dive)
- modifiers (Shift/Alt/Ctrl/Space)
- UX rules (e.g., drag empty → pan)

**Intent is still not a persisted change**. It is a semantic decision that may or may not be allowed.

**Examples**
- `PanCameraIntent(delta)`
- `SelectIntent(target=nodeId)`
- `BoxSelectIntent(rect)`
- `MoveSelectionIntent(delta)`
- `StartLinkIntent(from=nodeId)`
- `NowIntent(nodeId)`
- `ExitNowIntent`

---

### 1.3 Action (user-level action)
**Action** is a named operation in the UX layer (“what the user is doing”).

Action is:
- stable vocabulary for UI (menus, hotkeys, palette)
- a bridge between Intent and Event emission
- subject to validation/policy

**Examples**
- `Action.PanCamera`
- `Action.Select`
- `Action.BoxSelect`
- `Action.MoveSelection`
- `Action.CreateLink`
- `Action.EnterNow`
- `Action.StartFocusSession`

---

### 1.4 Event (system fact)
**Event** is emitted when the system reacts to an Action.

We split events by persistence:
- **UIEvent**: UI state changes (open drawer, enter dive), usually persisted in app state but not domain history.
- **OverlayEvent**: transient visuals (ghosts, hints), not persisted.
- **DomainEvent** (commit): changes to graph/domain/session that must be saved and can be undone/redone.

**Examples**
- UIEvent: `LogDrawerOpened`, `NowEntered`
- OverlayEvent: `LinkPreviewUpdated`, `SelectionBoundsPreview`
- DomainEvent: `NodeCreated`, `NodeMoved`, `LinkCreated`, `HubCreated`, `SessionStateSet`

---

## 2) The Algorithm (pipeline)

### 2.1 High-level pipeline
1) **Capture Gesture**  
   Collect raw input + modifiers + timing + hit-test + coords.

2) **Interpret Gesture → Intent**  
   Gesture Router maps raw input into a semantic Intent using:
   - current view context
   - tool state (or pointer tool rules)
   - selection state
   - hit-test results

3) **Intent → Action**  
   Map semantic intent to a user-facing action label.

4) **Validate Action**  
   Permissions, constraints, read-only checks, guardrails.

5) **Emit Events**  
   Emit UI/Overlay events (optional) and DomainEvents (commit) when applicable.

6) **Apply Events → Update Stores**  
   Update GraphState/SelectionState/CameraState/UIState/OverlayState/SessionState.

7) **Render**  
   Canvas + overlays + context UI re-render from state.

---

## 3) Gesture Router responsibilities

### 3.1 Inputs
- Gesture stream
- Hit-test service (field objects + UI surfaces)
- View context: `Home | SpaceField | Dive`
- Tool state: `Pointer | Link | Region | Dive` (v0.5)
- SelectionState
- Policies (permissions, readonly, constraints)

### 3.2 Outputs
- Intent stream (internal)
- Action stream (optional debug/telemetry)
- Event stream (UI/Overlay/Domain)

### 3.3 “No magic clicks” principle
Every change must be explainable by:
- hit-test target
- tool rules
- modifiers
- selection state
- explicit action trigger (menu/palette/hotkey)

---

## 4) v0.5 Default Pointer rules (navigate+select unified)

**Pointer tool** is the default “smart cursor”.
It supports pan/select/box-select/move without manual mode switching.

### 4.1 Core mappings (SpaceField)
- Drag on **empty field** → `Intent.PanCamera`
- Click on **node** → `Intent.Select(node)`
- Shift+Click on **node** → `Intent.ToggleSelect(node)` (multi)
- Drag on **selected node(s)** → `Intent.MoveSelection(delta)`
- Shift+Drag on **empty field** → `Intent.BoxSelect(rect)`
- DoubleClick on node → `Intent.EnterNow(node)`
- Esc in Dive → `Intent.ExitNow`
- Wheel/pinch → `Intent.ZoomCamera`

*(Optional)* Space+Drag → `Intent.PanCamera` (if you want “hold space to pan” muscle memory)

### 4.2 Link/Region as explicit tools
- When **Link tool** active:
  - PointerDown on node → `Intent.StartLink(node)`
  - Drag → `Intent.UpdateLinkPreview(to=hitTarget)`
  - PointerUp on node → `Intent.CommitLink(from,to)` else cancel

- When **Region tool** active:
  - Drag on empty → `Intent.CreateRegion(rect)`
  - Drag handles → `Intent.ResizeRegion`
  - Move region → `Intent.MoveRegion`

---

## 5) Event taxonomy & undo policy (v0.5)

### 5.1 Which events go to undo/redo?
Only **DomainEvents** (commit) that change persisted domain state.

**Undoable examples**
- `NodeCreated / NodeDeleted`
- `NodeMoved`
- `NodeUpdatedBasic`
- `LinkCreated / LinkDeleted`
- `HubCreated / HubDissolved`
- `RegionOverlayCreated / Updated / Deleted` *(if persisted; if purely overlay-only, it’s not domain)*

**Not undoable (default)**
- Overlay events (ghost/hints)
- UI drawer toggles, palette opens, hover, previews

### 5.2 MVP undo implementation options
- Inverse events (compensating)
- Patch/diff history
- Snapshot + rollback

Event sourcing replay is optional post-v0.5.

---

## 6) Examples (end-to-end)

### 6.1 Pan camera
Gesture: Drag empty →  
Intent: `PanCameraIntent` →  
Action: `Action.PanCamera` →  
Events: `CameraMoved` (UIEvent) →  
Apply: CameraState updated → render.

### 6.2 Create node (hotkey N)
Gesture: KeyDown(N) + click position →  
Intent: `CreateNodeAt(worldPos)` →  
Action: `Action.CreateNode` →  
DomainEvent: `NodeCreated(id,pos)` →  
Apply: GraphState updated → render.

### 6.3 Group selection into Hub
Gesture: selection + hotkey (e.g., Shift+Enter) →  
Intent: `GroupSelectionIntent` →  
Action: `Action.GroupToHub` →  
DomainEvents: `HubCreated(hubId, childIds)` (+ optional `LinksRewired`) →  
Apply → render.

### 6.4 ENTER NOW
Gesture: double-click node →  
Intent: `NowIntent(nodeId)` →  
Action: `Action.EnterNow` →  
UIEvent: `NowEntered(nodeId)` →  
Apply: ViewState updated → render NOW overlay.

---

## 7) DoD (Definition of Done) — Gesture/Intent system v0.5
- [ ] Pointer tool supports pan/select/move/box-select via hit-test + modifiers
- [ ] Explicit tools exist for Link and Region overlays
- [ ] Gesture Router is single source of truth for mappings
- [ ] Event categories exist (UI/Overlay/Domain) and are consistently used
- [ ] Undo/redo covers DomainEvents for graph editing operations
- [ ] “No magic click” rule holds (all state changes traceable)
