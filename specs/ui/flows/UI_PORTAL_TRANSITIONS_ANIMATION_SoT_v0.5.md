Status: SoT
Version: v0.5
Owner: SF
Language: EN
Last updated: 2026-01-05
Supersedes: UI_PORTAL_TRANSITIONS_ANIMATION_SoT_v0.5_r1.md

# UI_PORTAL_TRANSITIONS_ANIMATION_SoT_v0.5
**Scope:** SF v0.5 — spatial transitions across **Portal (Home/Station skin)** ↔ **Space Field** ↔ **Note / NOW (node interior)**  
**Intent:** Make navigation feel like *moving in a place* (not switching tabs).  
**Canon:** `Enter` = Portal→Field · `Note` = Portal/Field→Node interior (default) · `NOW` = explicit ritual entry · `Esc/Back` = NOW→Field

---

## 0) TL;DR
- **Portal is a door**. It can lead to any **Space / Hub / Node** via `GraphAddress`.
- **Field is primary** (infinite canvas + camera). UI is peripheral.
- **Note is the default node interior** (content view), presented over Field.
- **NOW is a lens** (ritual deep view/editor for a node), presented as an overlay over Field.
- Transitions must communicate **scale shift + continuity** (you never “leave the world”).
- Respect **Reduced Motion**.

---

## 1) Terms & primitives (v0.5)
### 1.1 Addressing
A portal target is always a `GraphAddress`:
- `space:<id>`
- `hub:<id>` (hub is a node whose interior contains a subgraph)
- `node:<id>`
Optional params: `focus`, `camera`, `now=true`, `highlight=<id>`

### 1.2 Navigation keys & verbs
- **SPACE (key)**: onboarding / Home Station shortcut — **unfold the Field preview** and activate **Portal focus** (a “door selection” state).  
  - In **Field mode**, SPACE is reserved for **pan** (Space+Drag), so this “press SPACE to unfold” ritual is **Home/First-run only**.
- **ENTER (key / verb)**: **confirm + enter** the currently focused target.  
  - Portal focused → enter its **Space Field**  
  - Node focused → enter **Note** (node interior)
- **NOTE (mode)**: the **Node interior / content view** (default). Triggered by Enter / Double‑click on a node.
- **NOW (mode)**: the **ritual deep view** (explicit). Triggered by NOW action / context menu / dedicated shortcut.
- **BACK / ESC**: step back one level (NOW → Field → Station), stack-aware.
### 1.3 Mental model
**Digital mycelium:** Space ⟂ Hub ⟂ Node are *nested subgraphs*. You are navigating *depth*, not a menu.

---

## 2) Transition matrix (what happens)
| From | To | Trigger | What user should feel | Notes |
|---|---|---|---|---|
| Portal | Field (Space) | Click portal · `Enter` | “I step into this space” | camera lands on space core / last focus |
| Portal | Note (Node) | Click portal · `Enter` | “I open this node” | opens Field behind + Note overlay |
| Portal | NOW (Node) | Click portal · `NOW` | “I dive into this node” | opens Field behind + NOW overlay |
| Field | Note (Node) | Double click node / Enter | “Open the node interior” | keeps spatial continuity |
| Field | NOW (Node) | Context → Open NOW | “Zoom into the node” | keeps spatial continuity |
| NOW | Field | `Esc` / Back | “Return to the field where I was” | restore camera + selection |
| Field (Space) | Field (Hub scoped) | Enter Hub Field | “Focus inside hub’s subgraph” | same Field, different scope |
| Any | Portal | Click logo / Home | “Back to station” | preserves recents |

---

## 3) Portal page interactions (pre-transition feedback)
### 3.1 Hover highlight (portal → target preview)
When hovering a portal card (or when a search result is focused):
- Show a **Global Graph Preview** (abstract, LOD’ed).
- Highlight the target zone:
  - Space: soft halo around space root region.
  - Hub: halo around hub node within its space context.
  - Node: pinpoint glow + faint connection threads (1-hop).

**Rules**
- Preview is **non-interactive** in v0.5 (no editing).
- The preview must be fast (no heavy layout recompute).
- If preview data is missing, fallback to: title + icon + last opened snapshot thumbnail (optional).

### 3.2 “Action row” / quick jump
Portal cards expose:
- **Enter** (default)
- **NOW** (secondary)
- `…` (context: rename, remove from recents)

---

## 4) Core animations (v0.5)
All animations use baseline motion tokens (durations/easing) and must support reduced-motion.

### 4.1 Portal → Field (ENTER / Click)
**Sequence**
1) **Door activation**: portal card compress + subtle glow.
2) **World alignment**: global preview expands and morphs into the Field background.
3) **Camera settle**: Field camera lands (ease-out), grid/field points fade in.
4) **Source node spawn (optional)**: space root node emits a soft pulse (breath-like) indicating “you arrived”.

**Constraints**
- Total perceived time: ~250–450ms (snappy, not cinematic).
- Avoid full-screen wipes. Prefer *morph + zoom*.

### 4.2 Portal → NOW (NOW)
**Sequence**
1) Portal activates (same as above).
2) Field appears **behind** (briefly) to preserve continuity.
3) NOW overlay slides/fades in (content focuses title field).
4) The target node “anchors” the transition (pinpoint glow aligns with NOW header).

**Why:** Even if you start from Portal, you still feel there is a Field behind it.

### 4.3 Field → NOW
**Sequence**
1) Node receives **focus glow** (120ms).
2) Background Field subtly dims (5–10%).
3) NOW overlay fades/raises in (or scales from the node anchor).
4) Cursor focus goes to title or last active block.

**Do not**
- Teleport the camera unless explicitly requested.
- Replace Field with a “page”; keep the Field behind.

### 4.4 NOW → Field (ESC / Back)
**Sequence**
1) NOW overlay fades out.
2) Field returns to full opacity.
3) Restore camera + selection + hover state.

**Back stack**
- If NOW navigation opened NodeB from NodeA inside NOW, `Esc` returns to NodeA (NOW), then next `Esc` returns to Field.

---

## 5) Source node animation (arrival cue)
When entering a Space (or Hub scoped field):
- The **space root** (or hub root) emits a **breath-pulse ring** once.
- If StateCore is enabled, its breath pulse synchronizes (optional; do not require it).

**Purpose**
- Confirms “you are here”.
- Establishes “field is alive” without visual noise.

---

## 6) Reduced Motion & accessibility
If `prefers-reduced-motion`:
- Replace morph/zoom with **simple fade** (150–220ms).
- Remove camera inertia animation; snap camera but keep a small fade.
- Keep focus management intact (keyboard-first).

---

## 7) Actions & Events (system contract)
### 7.1 Actions (undoable? usually NO for navigation)
Navigation is typically **not undoable**, but it is stack-tracked.
- `NavigateToAddress({ address, mode: "enter" | "note" | "now" })`
- `SetCamera({ cameraState })` (internal; may be persisted as view state)
- `SetSelection({ selectionState })` (restore)

### 7.2 Events (auditable)
- `portal_activated { target_address, nav: "enter" | "note" | "now" }`
- `space_opened { space_id }`
- `hub_field_entered { hub_id }`
- `note_opened { node_id, from: "portal" | "field" }`
- `now_entered { node_id, from: "portal" | "field" | "now" }`
- `now_exited { node_id }`
- `portal_opened` (return to portal)

---

## 8) Edge cases (v0.5)
- Missing target (deleted / permission): show toast + stay in current view.
- Permission denied: show access gate UI (future: auth funnel).
- Deep link to Node in a Space that is not loaded:
  1) load Space graph doc
  2) open Field
  3) open Note (overlay) or NOW if explicitly requested
- Hub scoped entry:
  - If hub has many children, open Field first, then hub scope after data is ready (avoid blank overlay).

---

## 9) Definition of Done (v0.5)
- [ ] Portal supports **Enter** and **NOW** for any GraphAddress (Space/Hub/Node).
- [ ] Hover preview highlights the target zone in a global graph preview (LOD, fast).
- [ ] Portal→Field transition feels spatial (morph/zoom), not tab switching.
- [ ] Field→NOW feels like zoom/lens; Field remains behind.
- [ ] `Esc` always exits NOW to Field, stack-aware.
- [ ] Reduced-motion works and is validated.
