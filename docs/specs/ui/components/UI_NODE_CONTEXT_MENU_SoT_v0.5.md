Status: SoT
Version: v0.5
Owner: SymbolField
Last updated: 2026-01-05
Supersedes: UI_NODE_CONTEXT_MENU_SoT_v0.5_r1

# UI_NODE_CONTEXT_MENU_SoT_v0.5

---


## 0) Canon
Context UI > static panels.
Node context menu is the primary place for “advanced” actions so the default UI stays clean.

Supports:
- single selection
- multi-selection (menu adapts)

---

## 1) Entry points
- Right click on node
- Keyboard (optional): `.` or `Shift+F10`
- Context toolbar overflow (“⋯”)

---

## 2) Menu sections (single node)
**Core**
- Open NOW
- Show in Field (center camera)
- Copy address
- Rename
- Set icon (opens Icon Picker)

**Graph**
- Start link (optional shortcut)
- Select neighbors (1-hop)

**Organization**
- Move to Hub (if applicable)
- Create Hub from selection (disabled if single)

**Safety**
- Soft delete (if allowed by role)
- Duplicate (optional)

---

## 3) Menu sections (multi-select)
- Group into Hub (Shift+Enter equivalent)
- Link all selected (optional — if you keep this feature)
- Align / distribute (future)
- Set icon (disabled or “batch set” only if you support it)

---

## 4) Guardrails
- Avoid destructive actions without confirmation.
- Hide dev-only actions unless Dev Mode is enabled.
- Respect permissions (owner space soft delete rules).

---

## 5) DoD (v0.5)
- Menu appears fast and is context-aware
- Covers essential advanced actions without adding permanent UI clutter