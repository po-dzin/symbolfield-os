Status: SoT
Version: v0.5
Owner: SF
Last updated: 2026-01-05
Supersedes: UI_GROUPING_HUB_REGIONS_SoT_v0.5_r2.md

# UI_GROUPING_HUB_REGIONS_SoT_v0.5_r2
**Status:** SoT (draft)  
**Scope:** SF UI v0.5 — grouping nodes into Hub + region overlays  
**Canon:** Hub = Node capability (“hub”). Region overlays are visual layers.

---

## 1) Purpose
- allow users to **cluster** selected nodes into a Hub (subgraph container)
- allow users to mark **regions** on the Field (color overlays) for categorization

---

## 2) Hub grouping
### 2.1 Action
- Select N nodes → `Group to Hub`
- Default hotkey: `Shift+Enter`

### 2.2 Result
- Create new node with component `"hub"`
- Re-parent selected nodes into hub local subgraph (implementation detail)
- Keep external links intact (or re-route via portal nodes — post-v0.5)

---

## 3) Region overlays
### 3.1 Action
- Create region: `Z` then drag rectangle
- Region is an overlay object with:
  - name, color, bounds, note
- v0.5: decide whether regions persist (recommended: persist in space metadata)

---

## 4) DoD — v0.5
- [ ] Group to Hub works on multi-select.
- [ ] Hub behaves like a container (selecting shows context UI).
- [ ] Regions can be created/edited/deleted and don’t block node interaction.


---

**See also:** UI_HOTKEYS_SELECTION_SoT_v0.5_r1
