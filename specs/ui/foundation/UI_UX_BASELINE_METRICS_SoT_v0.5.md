Status: SoT
Version: v0.5
Owner: SF
Last updated: 2026-01-05
Supersedes: UI_UX_BASELINE_TOKENS_SoT_v0.5_r2.md

# UI_UX_BASELINE_METRICS_SoT_v0.5
**Status:** Source of Truth (SoT)  
**Scope:** SF v0.5 — baseline UI/UX metrics (sizes, ratios, colors, typography, motion)  
**Goal:** Provide a consistent, dev-ready foundation that can be **skinned** (custom presets) without breaking the Essential UI.

---

## 0) Principles (baseline)
1) **Field-first**: Canvas stays primary; UI is peripheral and hideable.
2) **Progressive disclosure**: default UI is minimal; detail appears by context.
3) **Fast & calm**: low visual noise, consistent spacing, predictable motion.
4) **Accessible by default**: keyboard-first, clear focus, readable contrast.
5) **Skinnable**: Essentials use tokens; skins/presets can override within guardrails.

---

## 1) Layout metrics (App Shell)
### 1.1 Global
- **Density scale**: `compact | normal | cozy` (affects spacing & font sizes)
- **Base unit**: `8px` (all spacing is multiples of 4/8)
- **Safe min viewport**: 1280×720 (desktop baseline)

### 1.2 Core regions (Space / Field Shell)
| Region | Token | Default |
|---|---|---:|
| Top bar height | `--sf-topbar-h` | 44px |
| Left tool dock width | `--sf-dock-w` | 48px (icons-only) |
| Context toolbar height | `--sf-ctx-h` | 36px |
| Right drawer width (TimePanel / Log) | `--sf-drawer-w` | 360px (min 320 / max 480) |
| NOW overlay header | `--sf-now-h` | 44px |
| Panel corner radius | `--sf-radius` | 12px |
| Card corner radius | `--sf-radius-card` | 14px |

### 1.3 Panel behavior
- Drawers are **edge-attached** and **dismissible**.
- Default: **no permanent Properties pane** for everyday preset.
- Panels must support `hidden → peek → open` states.

---

## 2) Typography (readability-first)
### 2.1 Font stack (default)
- UI: `Inter` (or system-ui fallback)
- Mono (dev/ids): `ui-monospace` (SF Mono / JetBrains Mono fallback)
- Optional “skin”: custom font allowed if it keeps readability.

### 2.2 Type scale (normal density)
| Role | Token | Size / Line |
|---|---|---|
| Body | `--sf-text` | 14px / 20px |
| Small | `--sf-text-sm` | 12px / 16px |
| Label | `--sf-label` | 11px / 14px |
| H6 | `--sf-h6` | 16px / 22px |
| H5 | `--sf-h5` | 18px / 24px |

### 2.3 Rules
- Max line length in panels: **72 chars** (soft)
- Minimum clickable text size: **12px**
- Avoid ALL CAPS except micro-labels.

---

## 3) Color system (minimal + skinnable)
### 3.1 Theme
- Default: **dark** (Field feels “deep space”), with optional light theme.
- Contrast target: WCAG AA (≥ 4.5:1 for normal text).

### 3.2 Neutral palette (tokens)
- `--sf-bg` (app background)
- `--sf-surface-1` (panels)
- `--sf-surface-2` (hover/raised)
- `--sf-border` (hairline)
- `--sf-text-1` (primary text)
- `--sf-text-2` (secondary)
- `--sf-muted` (disabled)

Suggested default values (dark):
- `--sf-bg`: #0B0D10  
- `--sf-surface-1`: #11151B  
- `--sf-surface-2`: #161C24  
- `--sf-border`: #243041  
- `--sf-text-1`: #E9EEF5  
- `--sf-text-2`: #A7B3C4  
- `--sf-muted`: #6B7686

### 3.3 Accent palette (max 3)
- `--sf-accent-1` (primary action)
- `--sf-accent-2` (secondary)
- `--sf-accent-3` (warning/special)

Default accents (can be skinned):
- `--sf-accent-1`: #7C5CFF (violet)
- `--sf-accent-2`: #20C997 (teal)
- `--sf-accent-3`: #FFB020 (amber)

### 3.4 State / Tone colors (optional layer)
State colors (Mode):
- Descent 🕳: `--sf-mode-descent`
- Flow 🌀: `--sf-mode-flow`
- Expansion 🔆: `--sf-mode-expansion`

Tone colors (optional): keep as a limited set; do not force into UI for everyday preset.
Rule: tone colors may appear only in **StateCore** and subtle indicators (ring, dot, pill).

---

## 4) Spacing & touch targets
- Standard gap: **8px**
- Dense gap: **4px**
- Section padding: **12–16px**
- Min hit target: **36×36px** (icons), **40×40px** for primary actions
- List row height: **32–40px** depending on density

---

## 5) Components (baseline visuals)
### 5.1 Buttons
- Heights: 32 (sm), 36 (md), 40 (lg)
- Radius: `--sf-radius`
- Primary uses `--sf-accent-1`; secondary uses surface + border.

### 5.2 Inputs
- Height: 36px
- Border: 1px hairline
- Focus ring: 2px (accent), visible on keyboard focus

### 5.3 Pills (StateCore / Session)
- Height: 24–28px
- Contains: label + tiny glyph + optional pulse ring
- Must support `micro` mode (icon-only).

### 5.4 Node cards (Field)
- Sizes: S/M/L
- Default M: 220×120 (soft; auto by content)
- Border: 1px hairline
- Selected: accent outline + subtle glow (avoid heavy neon)

---

## 6) Motion & interaction feedback
### 6.1 Motion tokens
- Fast: 120ms
- Normal: 180ms
- Slow: 240ms
- Easing: standard `cubic-bezier(0.2, 0.8, 0.2, 1)`

### 6.2 Field interaction
- Pan/zoom must hold **60fps** on medium graph
- Selection box uses dashed outline + translucent fill
- Link preview uses ghost line + snap highlight on valid target
- Regions (Z-mode) show preview overlay while dragging

### 6.3 Pulse (breath)
- Pulse ring in StateCore is **breath rhythm animation**, not heart-rate.
- Default: subtle scale/opacity breathing at ~4–6s cycle (skinnable).

---

## 7) Z-index (render stack tokens)
- Z0 Field
- Z1 Overlay (selection box, previews, hints)
- Z2 Tool layer (cursor handles, link ghost)
- Z3 Drawers / Panels
- Z4 Context UI (toolbar near selection)
- Z5 Peripheral shell (StateCore, Dock, TimeChip)

---

## 8) Skins & presets (what can change)
### 8.1 Allowed overrides (skins)
- accent colors, fonts, radius, shadow softness, background texture
- icon/glyph style (outline vs solid)
- density scale defaults

### 8.2 Not allowed to break (essentials)
- minimum contrast
- hit target sizes
- Field-first layout (canvas always reachable)
- context-first properties (no forced permanent pane in default preset)

---

## 9) DoD — baseline tokens
- [ ] Tokens exist as CSS variables (or Tailwind theme mapping)
- [ ] Dark theme usable by default
- [ ] Accessibility: focus rings + contrast
- [ ] Field interactions remain smooth with panels open/closed
- [ ] Presets can override tokens without breaking essentials

---

## 10) Related design specs (v0.5)
- `SF_VISUAL_DESIGN_LAB_SoT_v0.5_r1` — palette/texture/glyph recipes for skins (safe extensions)
- `HARMONY_ENGINE_SoT_v0.5_r1` — optional theme compiler (presets/skins), not required for MVP
