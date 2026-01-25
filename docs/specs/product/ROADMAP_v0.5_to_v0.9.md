# SymbolField OS — Unified Roadmap (v0.5 → v0.9)

## 0) North Star
**SymbolField** is a modular life / project / meaning platform where one **Core Graph** is viewed through multiple **lenses (views/modes)**: Station, Field/Canvas, Note, NOW (ritual disk), Analytics overlay, Game/XP, and later Stream/Market.

---

## 1) Platform Views / Modes
Principle: **one Core, many renderings**.

| View / Mode | Role | Shows | Main UI object | When user goes there |
|---|---|---|---|---|
| Station (Home) | portal | entry, quick actions, recents | portals + director panel | “Where now?” |
| Global Graph (Station embed) | overview | world map of spaces | 2D field | “See the whole system” |
| Field / Canvas | hands-on | nodes/edges/clusters/areas | canvas | “Build / connect / structure” |
| Note (Node view) | inspect/edit | node content + backlinks | note panel / page | “Open object” |
| NOW Lens | ritual / jam | multilayer disk + session | vinyl disk | “Enter special state” |
| Analytics | sensemaking | signals + trends | overlay + graph | “What’s happening?” |
| Game / XP | progression | skills / quests | skill tree / wheel | “Grow / train / level” |

---

## 2) Core invariants
- **Node** (object), **Edge** (link), **EventLogEntry** (every action).
- **StateCore** = `mode + tone + glyph` (session-level).
- **GraphAddress** is the only navigation primitive.
- Views are render functions over the same Core model.

---

## 3) Roadmap (v0.5 → v0.9)

### v0.5 — Core Graph + Station + Context UI
**Goal:** usable base system with predictable interactions.

**Field/Canvas**
- Node/edge creation, selection, multi-select, link.
- Cluster creation + fold/unfold.
- Areas/Regions v0.5 (create/edit/resize/select/multi).
- Context bar for all object types + multi-select combos.
- Action menu (2nd level) foundation.
- Edge types library + wire design spec alignment.

**Station**
- Director panel + portal nodes + recents drawer.
- Embedded Global Graph (2D) with basic LOD.

**StateCore**
- Presets: focus / ritual / jam / dance / zen / planning / vibe-coding / practice.
- StateCore applies to sessions/events.

**Command / Console / Settings**
- Command line v0 (core commands).
- Settings v0 (grid/snap/input/hud/debug).
- Console basics (system feedback + debug).

**Timeline / History**
- Event log entries for all field actions.
- Basic history view (read-only).

**Platform Systems**
- Auth v0 (magic link + basic session).
- Waitlist flow.
- Billing scaffolding (entitlements model only).

**Data / Migration**
- Obsidian → Supabase import v0 (nodes + links).
- Basic sync loop with UI.

**Docs / Marketing (minimal)**
- On-platform docs seed (using the platform).
- Early landing + waitlist.

**Acceptance**
- Any action emits EventLogEntry.
- Context bar is stable across object types.
- Station → Field → Note flows are stable.

---

### v0.6 — NOW Lens MVP
**Goal:** ritual mode works end-to-end.

- NOW Lens (vinyl disk) with session capture.
- Session card generation.
- 3–5 ritual presets.
- Enter NOW from Station + Field (selection-aware).

---

### v0.7 — Analytics + Timeline Cycles
**Goal:** sensemaking layer.

- Analytics overlay with clickable metrics.
- Timeline / history cycles view (read + filter).
- Console / command line expansion.
- R:Agent (alpha): essence/object/state floating between layers.

---

### v0.8 — Game/XP + Knowledge System
**Goal:** progression layer.

- Skill tree / mycelium / wheel of life UI.
- XP derived from EventLog.
- Quest templates (minimal).
- Documentation inside platform expanded.
- Course outline + first module recorded.

---

### v0.9 — Stabilization + Growth
**Goal:** polish + distribution.

- UX polish across Station/Field/NOW.
- R:Agent refinement.
- Auth/Billing flow completion (basic entitlements).
- Obsidian migration + sync hardened.
- Course v0.1 published.
- Marketing push (incl. Kickstarter prep).

---

## 4) Notes
- v0.5 should ship with minimal yet consistent UI + event trail.
- Higher layers (NOW/Analytics/Game) build on EventLog, not on core entities.
