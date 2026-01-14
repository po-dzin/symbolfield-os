Status: SoT
Version: v0.5
Owner: SF
Last updated: 2026-01-05
Supersedes: UI_CONTEXT_UI_SoT_v0.5_r1.md

# UI_CONTEXT_UI_SoT_v0.5
**Status:** Source of Truth (SoT)  
**Scope:** SF UI v0.5 — Selection-driven context UI (toolbar + context drawer)  
**Canon:** No permanent heavy “properties window” for normal users. **Context > static.**

---

## 1) Purpose
When user selects something on Field, the UI should:
- show **minimal, high-frequency actions**
- allow deeper edits via **progressive disclosure**
- never overwhelm the screen for everyday users

---

## 2) Inputs
- `SelectionState`: selectedIds[], primaryId, bounds, mode(single/multi/box)
- `ActiveToolState`
- `CurrentSpaceId`
- `UserPreset` (Minimal / Creator / Dev etc.)

---

## 3) Output surfaces
### 3.1 Context Toolbar (inline / near selection)
**Always minimal**
- Title quick edit (single line) when 1 node selected
- Actions:
  - **ENTER NOW** (primary)
  - Link (L)
  - Group → Hub (Shift+Enter)
  - Delete (⌫ with confirm on multi)

### 3.2 Context Drawer (optional)
Opened via:
- “More…” on toolbar
- Hotkey (e.g., `.`) or palette

**Sections (collapsible)**
1) Basic: label, tags
2) Links summary: in/out list
3) Components (capabilities): view + add/remove component
4) Metadata (advanced): raw JSON viewer (Dev only)

---

## 4) Guardrails
- Everyday preset: only Basic + Links visible by default.
- Dev preset: shows Components + Metadata.
- No action in Context UI may break Core invariants (space_id integrity, etc.)

---

## 5) DoD — v0.5
- [ ] Toolbar appears only on selection.
- [ ] No permanent properties pane in default preset.
- [ ] ENTER NOW works from toolbar.
- [ ] Context Drawer exists and respects presets.
