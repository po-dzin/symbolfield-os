# SymbolField HUD — Unified Roadmap (Doc Seed)

## 0) North Star (1 paragraph)
**SymbolField** is a modular life / project / meaning platform where one **Core Graph** is viewed through multiple **lenses (views/modes)**: a sculptural global field view, a working canvas, a ritual **NOW Lens** (multilayer “vinyl disk”), an analytics overlay (meaning + dynamics), a gamified XP/progression view, and later a stream + marketplace layer (create patterns/patches/artifacts and publish/sell).

---

## 1) Platform Views / Modes (full set)
Principle: **Not separate apps** — different renderings of the same Core.

| View / Mode | Role | Shows | Main UI object | When user goes there |
|---|---|---|---|---|
| 🏛 Temple / Station (Home) | portal | entry, quick actions, latest states/routes | portals + director panel | “Where now?” |
| 🗿 Sculpture (Global Graph Art) | field-form | global graph as living installation (2D→3D later) | mycelium sculpture | “See the whole self/system” |
| 🗺 Canvas (Work Map) | hands-on | nodes/edges/hubs/clusters, editing | canvas | “Build / connect / structure” |
| 📝 Note (Node View) | inspect/edit | node content + backlinks + actions | note panel / page | “Open object” |
| 👁 NOW Lens (Ritual Hyperlens) | ritual/jam | state-driven multilayer disk + session content | vinyl/disk panel | “Enter special state” |
| 📡 Analytics (Meaning + Dynamics) | sensemaking | signals, trends, cycles, flows, RAG insights later | dashboard + graph overlay | “What’s happening?” |
| 🎮 Game / XP (Progress) | progression | XP/skills/quests/streaks | RPG HUD layer | “Drive / structure / growth” |
| 🛒 Market / Stream (Later) | publish/sell | artifacts, patches, skins, auctions, live sessions | storefront + live | “Create → release → monetize” |

---

## 2) Core invariants (single source of truth)

### 2.1 Minimal entities
- **Node** (object/idea/entity)
- **Edge** (relationship)
- **StateCore** = `mode + tone + glyph` (+ optional intent/ritual tag)
- **EventLog** (everything that happens)
- **Artifact** (result: patch/script/visual/audio/scheme/text)
- **XP / Skills / Quests** (game layer derived from EventLog)
- **GraphAddress** (navigation primitive)

### 2.1a Views / roles (not core entities)
- **ArcheCore** (root anchor)
- **ArcheSpace** (root context view)
- **Space** (inside-view of a Node)
- **Hub / Cluster** (Node with children)
- **Portal** (UI shortcut to GraphAddress)

### 2.2 Core rule
> **Views = render functions**; **Core = unified model**.

---

## 3) NOW Lens (ritual disk) — visualization + build plan
**NOW Lens = “spectral vinyl”**: multilayer circular controller where each ring is a channel.

### 3.1 Disk layers (recommended)
| Ring / Layer | Modulates | Source | UI control |
|---|---|---|---|
| 0 — core | `mode/tone/glyph` | StateCore | central glyph + switches |
| 1 — breath/rhythm | tempo, duration, pulse | ritual presets | metronome + timer |
| 2 — attention | focus/intent (1 line) | intent | focus field |
| 3 — content | selected nodes/clusters | canvas selection | highlight/snap |
| 4 — output | artifact/export | artifact pipeline | “record session” |

### 3.2 Must-have user flows
1) **Enter NOW** from Temple → choose preset → disk reconfigures UI.
2) **Bind to Canvas**: select cluster → NOW pulls it as session content.
3) **Record session**: timeline of events + resulting Artifact (at least a “session card”).
4) **Exit**: return to Temple/Canvas with context preserved.

### 3.3 Acceptance criteria
- Disk opens **≤ 300ms** after Enter (lazy-load heavy parts).
- Session writes **EventLog** entry + links to selected nodes.
- Every session yields at least a **Session Card** (state + intent + selection + duration).

---

## 4) Analytics Mode — meaning + form (overlay)
Core idea: not only dashboards — analytics is **mapped onto the graph**.

### 4.1 v0.5–0.7 minimal metrics
| Category | Metric | From |
|---|---|---|
| Dynamics | active nodes/day, new edges/day | EventLog |
| Focus | top clusters by attention time | selection + events |
| Cycles | weekly/lunar rhythms | timestamps |
| Tension | “pending loops”: started not closed | SEM7 markers |
| Quality | shipped_artifacts_per_week (primary) | Artifact |

### 4.2 Acceptance criteria
- Any metric is clickable → highlights relevant nodes/sessions on graph.
- “Explain” mode exists (text) — **why** the field looks like this.

---

## 5) Game/XP Mode — derived, not baked into Core
Rule: **don’t weld game mechanics into base entities**.

Must-have:
- XP is computed from **EventLog** (rituals, artifacts, closed SEM7 cycles).
- Skill Tree reads XP aggregates.
- Quests = templates producing expected events.

---

## 6) Market/Stream — later layer (design contour now)

### 6.1 What can be sold
- **Patches** (scripts/presets/lens configs)
- **Skins** (visual packs for views)
- **Sessions** (recorded jams: meaning+light+sound)
- **Artifacts** (visual/audio/generative objects)

### 6.2 Arch principle
Market = publish **Artifact** + license + preview.
Stream = real-time capture → Artifact → publish.

---

## 7) Roadmap (versions → steps → criteria)
Relative sprints (weeks) so it stays scheduling-agnostic.

### v0.5 (4–6w): Core Graph + Temple + Canvas
**Goal:** usable base.

Features:
- Temple/Station (Home): **director panel** + portals + recents drawer + quick actions
- Global Graph Art (2D) embedded in Station
- Canvas: nodes/edges/hubs/clustering (minimum)
- Note view (open any node as note/object)
- StateCore attached to sessions/events
- EventLog for every action

Criteria:
- Create hub/subgraph and open it as **local canvas**.
- Any action writes EventLog.

### v0.6 (2–4w): NOW Lens MVP
Features:
- NOW Lens view
- Sessions + recording + session card
- 3–5 ritual presets

Criteria:
- Enter NOW from Temple and from Canvas (with selection).
- Session card always created.

### v0.7 (2–4w): Analytics Overlay
Features:
- Metrics dashboard
- Graph overlay highlights
- Simple textual interpretation (no heavy AI)

Criteria:
- Click metric → highlight nodes/sessions.
- Export report (json/md).

### v0.8 (3–6w): Game/XP View + 3D Sculpture beta
Features:
- XP/Skill Tree UI
- Quests templates
- Sculpture 2D→3D experiment

Criteria:
- XP auto-computed from EventLog.
- Sculpture doesn’t degrade base performance.

### v1.0 (6–10w): Publish/Market + Stream hooks
Features:
- Artifact publishing (catalog)
- Author profiles, licensing
- Live session capture → artifact → publish

Criteria:
- Full path works: create → record → publish.
- Minimal privacy/moderation.

---

## 8) Tech stack (practical)

### Frontend
- Next.js + React (or Remix)
- Canvas/Graph: PixiJS / Konva / Cytoscape.js / Sigma.js
- 3D Sculpture: Three.js
- Analytics: lightweight D3 when needed

### Backend
- Supabase (Postgres + Auth + Storage + Realtime)
- pgvector (optional for semantic search)
- Events table + aggregators (cron / edge functions)

### Realtime / Stream
- WebRTC (if live)
- WebAudio API (browser audio jam)
- Later bridges: TouchDesigner/OBS via external connectors

---

## 9) Minimal team + what to hand to agents

| Role | Responsibility | Agent output |
|---|---|---|
| Product/Spec (G + agent) | PRD, use cases, criteria | “Spec Writer” |
| UX/UI | flows, disk, overlays | “UX Mapper” |
| Frontend | Canvas + Lens + Sculpture | “FE Builder” |
| Backend | Core entities + EventLog + storage | “BE Builder” |
| Data/Analytics | metrics, aggregation | “Data Agent” |
| Creative Tech (opt) | audio/visual jam | “AV R&D” |

Agent ticket pack (deliverables):
- PRD v0.5: 10–15 use cases + acceptance criteria
- UX flows: Temple→Canvas→NOW→Analytics→Back
- Data model: Node/Edge/Space/Hub/State/Event/Artifact
- Performance budget: node/render/latency limits
- Export formats: JSON + MD

---

## 10) Hard truth (guardrail)
✅ **One Core → many Views**
✅ **EventLog is the blood of the system**
✅ Lens/Analytics/Game/Market are built **on top** of events + artifacts
❌ Don’t bake game/market into Core entities (kills v0.5 with complexity)
