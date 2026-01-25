Status: SoT
Version: v0.5-0.9
Owner: SF
Last updated: 2026-01-11

# @sf_geo_iconic_navigation_spec_v0.5-0.9
**Status:** SoT
**Scope:** SF v0.5-0.9 -- base geometry and iconic navigation (graph language)

> Idea: SF reads as a geometric language. Node = sign. Sign = navigation. One glance at the field should deliver a "map of meaning".

---

## 0) Principles (short)
1) **One Visual Key (keySlot)** = one marker on the graph (glyph/emoji/icon/upload).
2) **Geometry first:** circles/rings = topology (core/portal/cluster), lines/arrows = flow.
3) **Meaning reveals with zoom:** closer = more layers (mandala).
4) **Customization without chaos:** base glyph matrix + grapheme constructor (later) + agent (later).

---

## 1) Graph geometry grammar

### 1.1 Zoom levels (LOD -- level of detail)
| LOD | Distance | Visible | Why |
|---|---|---|---|
| **L0 Field** | far | dots/small signs, no text | scan structure |
| **L1 Node** | mid | keySlot + basic halo/outline | identify node role |
| **L2 Mandala** | close | component rings (sectors) + statuses | "what is inside" without opening |
| **L3 Inside** | inside node | content/blocks/tables | detailed work |

**Rule:** at L0-L1, no visual noise. Meaning lives in signs and rhythm.

### 1.2 Node as object
A node is rendered as 3 layers:
- **Core (body):** center (dot/circle)
- **Rim:** outline that shows type (core/hub/portal/cluster)
- **Halo:** soft outer ring, only for "special" (archecore, active, selected)

### 1.3 Links as flow
- **Default:** thin line, no arrows.
- **Flow/direction** only in:
  - `Flow mode`, or on hover/selection.
- **Signals on links** (later): small moving dots on change/events.

---

## 2) Size system -- sizes, forms, ratios (for the meta-designer agent)

> Goal: provide **deterministic geometry**. Any implementation (web/canvas) must look identical.

### 2.1 Base tokens
Units:
- `px` -- final render.
- `u` -- base module: **1u = 2px** (grid-friendly).
- `IconBox` -- normalized 24x24 box (SVG icon base).

Color/opacity (coefficients only, no concrete colors):
- `alphaHalo = 0.18` (default halo)
- `alphaHaloStrong = 0.28` (selected)
- `alphaGhost = 0.10` (very soft rings)

Stroke widths:
- `strokeThin = 1.5px`
- `strokeBase = 2px`
- `strokeBold = 2.5px`
- caps/joins: `round`

Minimum readability:
- any key geometry must read at **16x16**.
- if a detail does not read at 16x16 -- it must **disappear** at L0.

---

### 2.2 KeySlot (visual key) -- size and position
KeySlot appears:
- on the graph (L0-L1): as a standalone symbol/icon.
- in the node header: as a badge left of title.

Sizes:
- `keySizeGraphL0 = 12px` (far zoom)
- `keySizeGraphL1 = 16px` (mid)
- `keySizeGraphL2 = 20px` (close, near mandala)
- `keySizeHeader = 18px` (inside node)

Header spacing:
- `keyPaddingX = 8px` from card left edge
- `keyGapToTitle = 8px` between key and text

Clip/mask:
- glyph/emoji: baseline aligned, center visually on height.
- icon/upload: fit in square, `contain`, 4px corner radius for upload.

---

### 2.3 Geometry of system symbols (normalized IconBox 24x24)
> Strict proportions in a 24x24 coordinate space.

Notation:
- `C = (12,12)` center.
- Radii are in IconBox px.

#### Core (icon:core)
- `rFill = 6.0`
- `rRing = 9.5`
- `stroke = strokeBase` (2px)
- Gap between fill and ring: **1.5px** minimum.

#### Portal (icon:portal)
- Ring only:
- `rRing = 9.5`
- `stroke = strokeBase`
- Empty inside.

#### Playground (icon:playground)
- Dotted ring:
- `rRing = 9.5`
- `dotCount = 12`
- `rDot = 1.1`
- `stroke = none`
- Dots evenly spaced; first dot at top.

#### Cluster (icon:cluster)
- Ring + 6 marker dots (minimal constellation):
- `rRing = 9.5` (strokeBase)
- `dotCount = 6`, `rDot = 1.0`, placed on `r = 6.8`
- Rotation: first marker at top (12 o'clock).

#### ArcheCore (icon:archecore)
- Center fill + double ring + halo:
- `rFill = 5.6`
- `rRingInner = 8.4` (strokeBase)
- `rRingOuter = 10.2` (strokeThin)
- `rHalo = 11.6` (strokeThin, alphaGhost)

LOD rule:
- At 16x16, `rHalo` may be hidden; **fill + 2 rings** must remain.

---

### 2.4 Node as meta-form on the graph (L0-L2)
> Beyond keySlot, a node can have **rim/halo** (state contours) -- strictly by LOD.

Define base visual node radius on graph:
- `Rv` -- half of visible node size (for dot modes use 10-14px).

#### L0 (Field scan)
- Show keySlot only.
- No rim/halo, no text.

#### L1 (Identify)
- `keySlot` + optional **rim** for Core/ArcheCore/Portal/Cluster:
  - `rimStroke = 1.25px`
  - `rimRadius = keySizeGraphL1/2 + 3px`
  - `rimAlpha = 0.14`

#### L2 (Sense / Mandala-ready)
- `keySlot` + rim + halo (only for ArcheCore/Selected/Active):
  - `haloStroke = 1.25px`
  - `haloRadius = rimRadius + 3px`
  - `haloAlpha = alphaHalo`

---

### 2.5 States -- thickness/radius changes
| State | What changes | Rule |
|---|---|---|
| hover | rimAlpha up | +0.08 to rimAlpha |
| selected | halo appears (if none) | haloAlpha = alphaHaloStrong |
| active/focus | rimStroke up | rimStroke = 1.75px |
| pinned | small marker on rim | dot 2px at 4 o'clock |
| locked | small marker on rim | square 2.5px at 8 o'clock |

Marker dots/icons must be **inside the rim** to avoid expanding the silhouette.

---

### 2.6 Mandala ring (L2) -- size and ratios
Mandala appears when:
- zoom >= L2, or
- hold `Alt`, or
- hover 600ms (optional).

Geometry:
- `mandalaInnerRadius = rimRadius + 4px`
- `mandalaThickness = 6px`
- `mandalaOuterRadius = mandalaInnerRadius + mandalaThickness`
- `sectorGap = 1px`
- Max sectors on MVP: `<= 8`.
- Sector icon size: `10px` (fit inside sector).

Layout:
- start sector always at top (12 o'clock).
- sector order fixed: Document -> Task -> Media -> Ritual -> Metrics -> Tags -> State -> Other.

LOD rule:
- if key geometry on screen is < 14px, mandala is forbidden.

---

## 3) Base iconic navigation vocabulary

### 3.1 System types (default keySlot)
| Type/subtype | Default key | Semantics |
|---|---:|---|
| **Core** | ◉ | "center / living source" |
| **ArcheCore** | AR◉ (SVG) / ⊚ fallback | "level core / meta-center" |
| **Portal** | ◎ | "gate / entrance / transition" |
| **Cluster** | ⊛ | "constellation / multiplicity" |
| **Playground** | ◌ | "sandbox / experiment / placeholder" |
| **Regular** | *(empty)* | no noise |

### 3.2 Iconic navigation (how user reads the field)
- **Circles = structure:** where centers, entrances, clusters are.
- **Empty regular nodes = content:** they do not compete for attention until marked.
- **Portals (◎) = routes:** navigation across levels/spaces.
- **Clusters (⊛) = semantic zones:** density areas worth zooming in.

### 3.3 Legend HUD
Mini legend panel (toggle):
- shows 5-7 system signs
- click sign = filter
- hover = tooltip + counter across field

---

## 4) Mandala form of node sense (L2 layer)

### 4.1 What is node mandala
At close zoom (or hold `Alt`), a **sector ring** appears around a node, showing composition and states without opening the node.

### 4.2 Mandala layers (minimum for MVP)
- **Ring 0 (center):** keySlot
- **Ring 1 (components):** Document / Task / Media / Ritual / Metrics / Tags / State
- **Ring 2 (statuses):** pinned/locked/has updates/has due dates (minimal)

### 4.3 Component display (sectors)
- Each component = 1 sector (icon marker, no text).
- Sector appears only if component exists.
- Click sector -> open node in that component panel.

**Important:** mandala is not decoration, it is a navigation map.

---

## 5) Customization: Icon Picker -> Glyph Matrix -> Grapheme Constructor

### 5.1 v0.5 (now): base glyph matrix + emoji + icons
Picker tabs: **Glyph / Emoji / Icons / Upload**
- **System glyphs:** ◉ ⊚ ◎ ⊛ ◌ (fast pick)
- Manual glyph input: 1-3 graphemes
- Emoji: for semantics (but visually unstable across OS)
- Icons: for unified style

### 5.2 Glyph Matrix (base set)
Matrix is a curated table of "simple signs" to avoid chaos.

Recommended groups:
- **Topology (circles):** ◉ ⊚ ◎ ◌ ⊙
- **Links:** ⟐ ⟡ ⧉ ⌁ (and/or SVG icons)
- **Signals (dots):** • · ⋯ ⁘
- **States:** ⊕ ⊖ ⊘ ⊗ (avoid "math for math's sake")

### 5.3 Grapheme Constructor (v0.6-0.7)
> Manual sigil constructor from primitives (no generation).

- Canvas 24x24 (or 32x32), snap-to-grid.
- Primitives: Dot / Line / Ring / Arc.
- Symmetry: mirrorX/mirrorY/radialN.
- Export: SVG -> saved as `icon` (library) in user/space scope.

**Goal:** allow people to craft their own sigils in a controlled, minimalist way.

---

## 6) Future: Emojis + Agent generator + Gen* (v0.7-0.9)

### 6.1 Emoji (how not to break style)
- Emoji remain available, but:
  - in pro mode can enable `prefer_icons_over_emoji`.
  - (later) option for **monochrome emoji pack**.

### 6.2 Agent generator of glyphs (v0.8-0.9)
Agent suggests keySlot "by meaning":
- input: title/tags/components/nodeType
- output: 6 variants (glyph/icon/emoji) + confidence
- modes: Suggest / Refine / Batch

### 6.3 Gen* (algorithmic generation, v0.8)
- Not MVP.
- Generate variations from primitives while keeping readability at 16x16.

---

## 7) Navigation scenarios (iconics as interface)

### 7.1 Filters by signs
- Click ◉ -> show only Core/ArcheCore
- Click ◎ -> show only Portals
- Click ⊛ -> show only Clusters
- Shift+click -> add to filter

### 7.2 Quick Jump
- `Ctrl/Cmd+K` -> search line
  - token support: `type:portal`, `key:◎`, `component:doc`

### 7.3 Portal transitions
- Portal (◎) visually "deeper" (ring + inner void) to read as passage.
- Double click -> open target space.

---

## 8) MVP checklist (for v0.5)
- keySlot (one slot) + defaults ◉/AR◉/◎/⊛/◌/empty.
- picker: Glyph/Emoji/Icons/Upload + system glyphs.
- legend (minimal): show signs and filters.
- L2 mandala can be v0.6 (if short on time), but keep component model.

---

## 9) Decisions for AR◉ ref (geometry lock)
- Center: filled circle.
- Two rims: same thickness or one thinner (but strict grid).
- Outer halo: thin ring with low opacity.
- At 16x16, halo may disappear, leaving "double rim".

---

## 10) Open questions (later)
- Should Hub vs Cluster be visually more distinct, or keep cluster as a semantic hub subtype?
- How to render mandala on weak machines (performance LOD)?
- Where to store custom sigils (personal vs space) and how to share?
