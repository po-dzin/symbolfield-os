Status: SoT
Version: v0.5
Owner: SF
Last updated: 2026-01-05
Supersedes: UI_HOTKEYS_SELECTION_SoT_v0.5_r1.md

# UI_HOTKEYS_SELECTION_SoT_v0.5_r1
**Status:** Source of Truth (SoT)  
**Scope:** SF v0.5 — selection model + hotkeys + modifier canon  
**Canon:** Break muscle memory early. **Shift ≠ link.** Links are explicit (port-drag or `L` mode).

---

## 0) Goals
- Predictable, industry-aligned modifiers (Figma/Miro/Obsidian Canvas vibes).
- No “accidental linking” during selection.
- Selection is first-class state (not owned by nodes).
- Works with Hub grouping + Regions without conflicts.

---

## 1) Modifiers canon
| Key | Meaning | Notes |
|---|---|---|
| **Shift** | **selection / precision** | multi-select, box-select, constrain |
| **Ctrl/Cmd** | **commands / system** | undo/redo/copy/paste, etc. |
| **Alt/Opt** | **alternate gesture** | duplicate on drag, variants (optional) |
| **Space** | **pan** | standard for canvas apps |

**Anti-rule:** `Shift+Click` must never create links.

---

## 2) Selection model (state)
Selection is UI state:
- `selectedIds: uuid[]`
- `primaryId: uuid | null`
- `bounds: {x,y,w,h} | null`
- `mode: "single" | "multi" | "box"`

Selection drives context UI:
- context toolbar near selection
- context drawer on demand (progressive disclosure)

---

## 3) Core gestures (Field)
### 3.1 Select & move
| Action | Gesture |
|---|---|
| Select node | Click node |
| Add/remove from selection | **Shift+Click** |
| Box-select | **Shift+Drag** on empty field |
| Move selection | Drag selection |
| Pan camera | **Space+Drag** / MMB / Right-drag *(choose one primary; Space+Drag recommended)* |
| Zoom | Wheel / trackpad |

### 3.2 Link creation
**Default (recommended):** port-drag connector
- Hover node → show **port** (small circle).
- Drag from port → hover target → release → create link.

**Alternate:** `L` mode (link tool)
- Press `L` → click source node → click target node → create link.
- `Esc` exits `L` mode.

| Action | Gesture |
|---|---|
| Create link | Drag from port → node |
| Link mode | `L` → click A → click B |
| Delete link | Click edge → `Delete` |

---

## 4) Hub grouping
| Action | Gesture |
|---|---|
| Group selection into Hub | **Shift + Enter** |

Semantic:  
**Shift** = “I have a set” → **Enter** = “commit the set into an object”.

---

## 5) Regions / Zones
Regions are overlays (optionally persisted) and must not fight with selection/linking.

| Action | Gesture |
|---|---|
| Toggle zone tool | `Z` |
| Draw zone | Drag (while Z active) |
| Exit | `Z` or `Esc` |
| Focus zone | Double-click zone |
| Edit zone | Select zone → context toolbar/drawer |

---

## 6) Global hotkeys (minimum)
| Hotkey | Action |
|---|---|
| `Cmd/Ctrl+K` | Command palette / search |
| `N` | Create node (at cursor/camera center) |
| `\` | Toggle right drawer (if present) |
| `Cmd/Ctrl+Z` | Undo |
| `Cmd/Ctrl+Shift+Z` / `Ctrl+Y` | Redo |
| `Esc` | Cancel tool / exit mode / close NOW |

Optional (post-v0.5):
- `Alt+Drag` = duplicate node(s)
- `.` = open context drawer

---

## 7) Conflicts & priority rules
1) If **Link tool** is active (`L` mode) → clicks are interpreted for linking, not selection.
2) If **Zone tool** is active (`Z`) → drags draw zones; selection still possible via click.
3) **Shift+Drag on empty** always means box-select (never link).
4) Ports only appear on hover and require explicit drag.

---

## 8) DoD — v0.5
- [ ] Shift is selection-only (no link behaviors).
- [ ] Port-drag linking works at 60fps.
- [ ] `L` mode exists as an alternative.
- [ ] Hub grouping via `Shift+Enter`.
- [ ] Zones via `Z` tool; no conflicts with linking/selection.
- [ ] SelectionState is separate from GraphState (no per-node selection flags).
