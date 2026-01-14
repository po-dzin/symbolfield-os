Status: SoT
Version: v0.5
Owner: SymbolField
Last updated: 2026-01-05
Supersedes: UI_ICON_PICKER_SoT_v0.5_r1

# UI_ICON_PICKER_SoT_v0.5

---


## 0) Canon
Each node has a single visual **KeySlot** (one token):
- glyph OR emoji OR icon (not multiple layers)

In v0.5:
- No “meaning generation” or glyph AI.
- Default for core/new nodes can be `◉` (or your chosen default).

---

## 1) Entry points
- Node header (NOW) → click KeySlot
- Context menu → “Set icon”
- Optional quick action in selection context toolbar

---

## 2) Picker layout (v0.5)
Tabs (minimal):
1) **Recent**
2) **Emoji**
3) **Icons** (a small curated set)
4) **Custom** (paste character / upload later)

Search:
- search emojis by name
- search icons by label

---

## 3) Data model
Store:
- `icon_kind`: `"emoji" | "icon" | "glyph"`
- `icon_value`: string (emoji char or icon id)
- optional `icon_meta`: json for future

---

## 4) UX rules
- Picker is a popover, not a full page.
- Apply on select (no extra “Save”).
- Escape closes without changes.

---

## 5) DoD (v0.5)
- Works from NOW and from context menu
- Persists on node
- Has “Recent”
- No performance regressions on open/search