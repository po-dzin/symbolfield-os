Status: SoT
Version: v0.5
Owner: SymbolField
Last updated: 2026-01-05
Supersedes: UI_NOW_MODE_SoT_v0.5_r1

# UI_NOW_MODE_SoT_v0.5

---


## 0) Canon
**NOW = a node from the inside.**  
NOW is a deep view/editor layered over Field — **not a tab**.

Core keys:
- Enter: open NOW for selected node (or double-click)
- Esc: back (stepwise in back stack)
- Cmd/Ctrl+K: search / command palette

---

## 1) NOW responsibilities (v0.5 core)
For any Node:
- **Blocks editor** (content)
- **Local context panel** (1-hop links + quick jumps)
- **Quick actions**: “Show in Field”, “Copy address”, “Set icon”, “Open context menu”
- Progressive disclosure (no always-visible advanced settings)

For Hub nodes:
- **Children list** (internal nodes)
- Optional: “Open Hub Field” (switch to Field scoped to hub-local subgraph)

---

## 2) Layout (recommended)
Full-screen overlay over Field:
- Top bar: node title + icon + breadcrumbs (Space / Hub / Node)
- Main: content editor
- Right: collapsible local context panel (links, neighbors)
- Bottom: optional session indicator (if enabled)

Return:
- Esc returns to Field preserving camera/selection where possible.

---

## 3) Subgraph inside NOW (hubs)
In v0.5, Hub subgraph is primarily accessed via:
- “Open Hub Field” (preferred for spatial edits)
- In NOW: children list + quick jump
Optional (later): embedded mini-field panel

---

## 4) Actions & Events
Actions (data-changing, usually undoable):
- `update_node_content`, `set_icon`, `add_component`, `remove_component`

Events (audit):
- `now_opened`, `now_closed`, `address_copied`

---

## 5) DoD (v0.5)
- Any node can open in NOW
- NOW shows content + local context + quick actions
- Hub nodes expose children and allow jumping to Hub Field