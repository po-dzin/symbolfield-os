Status: SoT
Version: v0.5
Owner: SF
Last updated: 2026-01-05
Supersedes: SF_VISUAL_DESIGN_LAB_SoT_v0.5_r1.md

# SF_VISUAL_DESIGN_LAB_SoT_v0.5_r1
**Status:** SoT (Design Lab)  
**Scope:** SF v0.5 — visual language *extensions* (palette recipes, glyph/texture style)  
**Authority:** `UI_UX_BASELINE_METRICS_SoT_v0.5` defines **core tokens**. This doc defines **skin-ready recipes** that must not break baseline guardrails.

> Plain mode: keep SF looking clean and calm.  
> Mythic mode (optional skin): you can go full “symbolic/harmonic”, but it stays an overlay layer.

---

## 0) v0.5 Context Alignment (what changed)
SF v0.5 UI canon is:
- **Home Portal** → ENTER Space → **Field-first Shell** → **NOW** overlay.
- Panels are **contextual drawers**, not permanent heavy windows.
- **State/Tone/Glyph** are *optional visibility* (micro → expandable → hidden).

Therefore:
- Default theme stays **neutral**.
- Tone/mode colors appear only as **small accents** (StateCore ring, pills, selection outlines) unless a skin explicitly enables “atmosphere”.

---

## 1) Core palette (baseline-aligned)
These are the *reference* neutrals used by the baseline token doc.
Use them as the default theme foundation.

| Token | Hex | Usage |
|---|---|---|
| `N0` | #050507 | deepest background / vignette (optional) |
| `N1` | #0B0D10 | app background |
| `N2` | #111318 | surfaces (panels) |
| `N3` | #2A2C32 | borders / dividers / subtle UI |
| `T0` | #000000 | pure black (rare) |

**Rule:** neutrals do 90% of the work. Accents do 10%.

---

## 2) Accent palette (max 3 accents)
### 2.1 Default accents (safe set)
| Accent | Hex | Notes |
|---|---|---|
| `A_cyan` | #6FE4FF | cool, clean, “tech/field” |
| `A_lilac` | #CDBEFF | soft symbolic highlight |
| `A_peach` | #FFB89C | warm, human, attention |

### 2.2 Accent usage limits
- Only 1 accent is “primary” at a time (`accentPrimary`).
- `accentSecondary` and `accentTertiary` are optional and must not create visual noise.
- Accents should **not** recolor the entire UI unless the user enables a “skin”.

---

## 3) Tone colors (optional layer)
Tone is an **overlay** concept — it is not required for everyday users.

### 3.1 Where tone appears in v0.5
- StateCore ring (breath pulse + thin stroke)
- Session pill
- Selection outline (optional)
- Tiny HUD badges / dots

### 3.2 Tone → Accent mapping (default suggestion)
This mapping is intentionally conservative and uses the safe accent set.

| Tone | Default accent | UI surface |
|---|---|---|
| 🔵 calm | `A_cyan` | ring stroke / subtle glow |
| 🟣 imaginal | `A_lilac` | ring stroke / glyph highlight |
| 🟠 drive | `A_peach` | ring stroke / call-to-action |
| ⚫ void | neutral only | no glow; reduced motion |

> Skins can define a richer palette, but must still obey “max 3 accents”.

---

## 4) Mode (global atmosphere) — **skin-only**
Modes (🕳/🌀/🔆) are **not a default background switch** in v0.5.
If enabled as a skin feature, modes may adjust only:
- vignette intensity
- subtle gradient direction
- selection glow strength

### 4.1 Suggested mode atmospheres (subtle)
- 🕳 Descent: deeper vignette, lower bloom
- 🌀 Flow: softer edges, slightly increased blur/softness
- 🔆 Expansion: higher clarity, slightly higher contrast

---

## 5) Glyph system (iconography rules)
v0.5 glyphs should read as **UI icons first**, symbolism second.

**Rules**
- Line weight: 1.5px–2px at 1x scale (align to baseline tokens)
- Rounded caps/joins for calmness
- Avoid “occult” density by default; keep it *hint-like*.

**Where glyphs appear**
- StateCore (mode/tone/glyph)
- Node type badges (capabilities)
- Portal cards (home)

---

## 6) Texture language (subtle)
Textures are optional. If used:
- noise/grain must be **< 6% opacity**
- avoid busy procedural patterns behind text
- prefer *micro-grain* over visible noise

**Allowed textures**
- micro-grain on backgrounds
- soft glass blur on panels (low radius)
- very subtle scanline/glitch only for dev/creative skins

---

## 7) Component styling recipes (Field-first)
### 7.1 Nodes (cards)
- default: neutral surface, thin border
- hover: border brighten
- selected: accent outline + small glow (optional)

### 7.2 Links
- default: neutral line
- selected/hover: accent brighten + thickness + arrow (optional)

### 7.3 Regions (zones)
- fill: accent @ 6–10% alpha
- border: accent @ 35–50% alpha
- label: neutral text

---

## 8) Guardrails (must not break)
- Do not reduce text contrast below accessibility norms.
- Do not allow more than 3 accents simultaneously.
- Skins must not change interaction affordances (ports, selection, focus rings).

---

## 9) Legacy notes (v0.1 snapshot)
This doc is an adaptation of earlier SymbolField “Visual Design Lab” explorations.  
The older symbolic density and extended palette ideas remain valid as **skins**, not as the default v0.5 UI.

(If needed, the original v0.1 content can be kept in version control as `sf_visual_design_lab_v0.1_legacy.md`.)
