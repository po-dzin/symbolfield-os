Status: SoT
Version: v0.5
Owner: SymbolField
Last updated: 2026-01-05
Supersedes: none

# UI_ONBOARDING_SANDBOX_SoT_v0.5

---

## 0) Purpose
Define the **first-run onboarding** and the **Playground Space** experience for SymbolField v0.5.

Goals:
- Give new users a **safe playground** to learn SF’s core mechanics (Field ↔ Note ↔ NOW) with real examples.
- Ship a **default internal Space** ("Playground") that lives inside the user’s **ArcheCore Space** (root graph).
- Keep onboarding **lightweight**: minimal screens, progressive disclosure, no “mystic UI requirements”.

Non-goal:
- Playground is **not** a “keyboard ritual room”. The SPACE/ENTER metaphor belongs to **first-run on Station/Home** only. Inside Playground: **normal SF interaction**.

---

## 1) Definitions (canonical)
- **Portal**: a door that can jump to any address (Space / Hub / Node).
- **ArcheCore**: the user’s root anchor node in the global graph.
- **Space**: a subgraph in the user’s global graph.
- **Hub**: a node that contains a local subgraph (children) inside a Space.
- **Node**: an element that may have an internal local subgraph and content.
- **Field**: the canvas view of a Space (spatial graph substrate).
- **NOW**: the deep view / editor of a node (node interior).

---

## 2) Scope (v0.5)
### 2.1 In scope
- First-run flow (post-auth) that lands on **Station/Home Portal** with a clear next action.
- Automatic creation of:
  - ArcheCore (global graph root anchor)
  - Playground Space (child Space of ArcheCore)
  - Playground Hub (a hub node inside Playground Space)
- Playground content: a curated set of “real” mini-cases that teach (minimal guides in linked nodes):
  - create node
  - select/multi-select + box select
  - link via port drag + optional L-mode
  - group into Hub
  - regions/clusters (if enabled)
  - enter NOW, return to Field
  - icon picker + context menu
- Playground reset: re-create Playground Space + Hub to default state.

### 2.2 Out of scope (v0.5)
- Full onboarding personalization / questionnaires
- Gamified XP reward loops (may exist as optional module)
- CRDT/collab onboarding, team invites
- Advanced view builder tutorials (tables/kanban)

---

## 3) Placement in UI hierarchy
**Station/Home Portal** is the entry shell.  
Playground is a **normal Space** in the graph and appears in Station recents.

Recommended portal ordering (first-run):
1) **Playground** (Recommended)
2) **My First Space** (Empty Space template)
3) Templates (optional)

---

## 4) First-run flow (post-auth)
### 4.1 Steps
1) **Auth complete** → user lands on **Station/Home**.
2) System silently ensures:
   - ArcheCore exists (global root anchor)
   - Playground Space exists (child of ArcheCore)
   - Playground Hub exists
3) Station shows a lightweight onboarding surface:
   - Primary CTA: **“Start in Playground”**
   - Secondary CTA: “Create My First Space”
4) User enters Playground Space (Field).
5) Optional: Playground opens with a **Welcome Note card** (node) that explains “Field ↔ Note ↔ NOW” and lists tasks.

### 4.2 Keyboard metaphor (first-run only)
- On Station/Home:
  - **SPACE**: reveal/activate “field preview / portal focus” (optional delight)
  - **ENTER**: enter the focused portal
- Inside Playground:
  - SPACE returns to normal usage (e.g., Space+Drag pan). No ritual requirement.

---

## 5) Playground Space composition (default content)
Playground contains a **Playground Hub** in the center. The Hub hosts a mini-curriculum as nodes (subgraph).

### 5.1 Required nodes (minimum set)
1) **Welcome / How SF works** (Note-first content)
   - one screen: “Field is space, Note is interior, NOW is ritual”
   - keys: Enter (open Note), NOW action (open NOW), Esc (back), Cmd/Ctrl+K (search)
2) **Make a Node**
   - instruction + one empty area
3) **Link Two Nodes**
   - shows ports; teaches drag-to-connect; optional L-mode
4) **Select & Group**
   - multi-select + Shift+Enter → create Hub
5) **Regions / Clusters** (if regions module enabled)
   - demonstrates drawing a region and labeling it
6) **Icon Picker + Context Menu**
   - explains KeySlot + right click actions

These nodes should be **linked** into a small cluster around the Playground Hub to keep the flow minimal and readable.

### 5.2 Optional nodes (nice-to-have)
- “Search & Command Palette”
- “Logs & Timeline drawer”
- “Share a Hub (future)”
- “Reset Playground”

---

## 6) Interaction rules inside Playground (v0.5 canon)
- **Link**: drag from node port to another node (no Shift). Optional `L` link mode.
- **Selection**:
  - Click select
  - Shift+Click add/remove from selection
  - Shift+Drag box select
- **Group**:
  - Shift+Enter creates a Hub from selection
- **Enter NOW**:
  - Enter on selected node OR Double-click node
  - Esc returns to Field (back stack aware)
- **Context UI**:
  - Minimal persistent UI
  - Context toolbar appears on selection
  - Right panel is progressive (not always open)

---

## 7) Reset Playground
### 7.1 Entry points
- Station/Home: “⋯” menu on Playground portal → **Reset Playground**
- Inside Playground: command palette action “Reset Playground”

### 7.2 Behavior
- Soft-delete existing Playground Space graph (or archive it, 30d trash retention)
- Re-create the default Playground Space + Playground Hub + default nodes
- Emit audit event `playground_reset`
- Keep user’s other spaces untouched

---

## 8) Actions & Events (contracts)
### 8.1 Actions (undoable)
- `create_space`, `create_hub`, `create_node`
- `move_node`, `connect_nodes`, `delete_edge`
- `group_to_hub`, `create_region`, `set_icon`
- `open_now`, `close_now` (UI action; typically not undoable at data level)

### 8.2 Events (auditable, not undone)
- `onboarding_started`, `onboarding_completed`
- `playground_entered`, `playground_reset`
- `tutorial_step_completed` (optional)
- `portal_entered` (target address)

---

## 9) Persistence boundaries
- Playground Space is a normal Space:
  - Graph data stored as Space subgraph (Space doc / snapshot)
  - Hub subgraph stored as hub-local doc if using doc boundaries
- Tutorial completion state:
  - minimal boolean flags (optional)
  - store in user profile or station preferences

---

## 10) DoD (Definition of Done) for v0.5
A new user can, within 5–10 minutes:
- Enter Playground from Station
- Create a node
- Link two nodes
- Group nodes into a Hub
- Enter NOW and return to Field
- Use icon picker and context menu at least once

System requirements:
- Playground exists by default for every new user
- Reset Playground works reliably
- No UI ritual required inside Playground; normal interaction model applies
- Reduced motion is respected for transitions

---

## 11) Open questions (track, don’t block)
- Should Playground be visible to power users as a normal space, or hidden after onboarding?
- Should tutorial steps persist across devices (later)?
- Do we archive old Playground resets or hard-delete?
