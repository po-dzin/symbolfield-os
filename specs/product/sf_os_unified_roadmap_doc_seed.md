# SymbolField OS — Unified Roadmap (Doc Seed)

## 0) North Star (1 paragraph)

**SymbolField** is a modular life / project / meaning platform where one **Core Graph** is viewed through multiple **lenses (views/modes)**: a sculptural global field view, a working canvas, a **Note view** (open any Node as a note/object), a ritual **NOW Hypermode** (multilayer “vinyl disk”), an analytics overlay (meaning + dynamics), a gamified XP/progression view, and later a stream + marketplace layer (create patterns/patches/artifacts and publish/sell).

---

## 1) Platform Views / Modes (full set)

Principle: **Not separate apps** — different renderings of the same Core.

| View / Mode                       | Role         | Shows                                              | Main UI object            | When user goes there          |
| --------------------------------- | ------------ | -------------------------------------------------- | ------------------------- | ----------------------------- |
| 🏛 Home / Station (Temple)        | portal       | entry, quick actions, latest states/routes         | portals/tiles             | “Where now?”                  |
| 🗿 Sculpture (Global Graph Art)   | field-form   | global graph as living installation (2D→3D later)  | mycelium sculpture        | “See the whole self/system”   |
| 🗺 Field (Work Map)               | hands-on     | nodes/edges/clusters, editing                      | canvas                    | “Build / connect / structure” |
| 📝 Note (Node View)               | inspect/edit | node content + backlinks + actions                 | note panel / page         | “Open object”                 |
| 👁 NOW (Ritual Hypermode)         | ritual/jam   | state-driven multilayer disk + session content     | vinyl/disk panel          | “Enter special state”         |
| 📡 Analytics (Meaning + Dynamics) | sensemaking  | signals, trends, cycles, flows, RAG insights later | dashboard + graph overlay | “What’s happening?”           |
| 🎮 Game / XP (Progress)           | progression  | XP/skills/quests/streaks                           | RPG HUD layer             | “Drive / structure / growth”  |
| 🛒 Market / Stream (Later)        | publish/sell | artifacts, patches, skins, auctions, live sessions | storefront + live         | “Create → release → monetize” |

### 1.1 Station / Temple as “Director Panel” (not a list)

Station should feel like you’re looking at an **infinite symbolic sky** — a navigational field, not a menu.

**Reference vibe (minimal):**

- *Star‑chart / Director* style: **central emblem** + **orbital clusters** + **destination nodes**
- Minimal utility widget: **timer + ambient sound** as a peripheral ritual tool

**What we steal (SF-ified):**

- **ArcheCore emblem in center** (home anchor) → click = enter **ArcheSpace** (root context)
- **Portal Constellations** (clusters) around it: each portal is a node‑glyph with size/weight derived from:
  - connectivity (degree)
  - activity frequency
  - “exp weight” / importance score
- **Signals layer** (tiny dots/badges): recent events, pending loops, fresh artifacts
- **Quick Mode chips**: Enter NOW / Field / Analytics (fast travel)
- **Node → Note**: selecting/entering any node opens **Note** (not NOW). NOW is always an explicit ritual entry.
- **TimeChip → Ritual Console drawer** (Timer / Sound) lives in shell; non-intrusive

**Station UI minimal scope (v0.5):**

- 1 screen, no scroll by default; pan/zoom optional (later)
- Portal nodes show: glyph + title (optional) + subtle status dot
- “Recents” is a **drawer**, not the main layout

**Acceptance criteria:**

- Station can be used with zero reading: user recognizes “where to go” by spatial grouping + glyphs
- One click on a portal = enter Space (no modals)
- Visual noise stays low: neutrals dominate, accents are sparse

---

## 2) Core invariants (single source of truth)

### 2.1 Minimal entities (v0.5 canonical)

**Canon entities (DB / Core Store):**

- **Node** (object/idea/entity) — can contain rich content.
- **Edge (Link)** — relationship Node↔Node (incl. wikilinks/backlinks).
- **State (StateCore)** = `mode + tone + glyph` (+ optional intent/ritual tag).
- **Event (EventLogEntry)** — every action is an event (create/move/link/state/ritual/export/share).
- **Artifact** — result of a session/work (minimum: **Session Card**), derived from events.
- **XP Matrix — XP accrual records derived from EventLog.**
- **GraphAddress** — **the only navigation primitive** (routes to Station / Field / Focus / Share / Inside‑view).

**Not entities (views/roles on top of Node):**

- **ArcheSpace** — root context ("user universe"); it is just a Space‑view anchored on ArcheCore.
- **ArcheCore** — the anchor node for ArcheSpace (largest node).
- **Space** — *inside‑view* of a Node (a node as a container).
- **Cluster** — a Node that has children (enterable container).
- **Portal** — UI shortcut to a GraphAddress (Station routing or cross-space links).

### 2.2 Core rule

> **Views = render functions**; **Core = unified model**.

### 2.3 GraphAddress (single navigation primitive)

GraphAddress is the **one** routing object that encodes “where you are” and “what you’re looking at”.

**Suggested fields (conceptual):**

- `view`: `station | field | note | now | analytics | share`
- `containerNodeId`: which Node’s inside‑view is currently open (Space as view)
- `focusNodeId?`: focused object (node/cluster) — used by Note/Focus views
- `selectionNodeIds?`: selection set
- `timeAnchor?`: day/week/month filters (TimePanel)
- `camera?`: pan/zoom

**Examples (conceptual):**

- `Station`
- `Field(container=ArcheCore)`
- `Inside(container=ClusterNode)`
- `Note(node=X)`
- `NOW(container=ArcheCore, selection=[...])`
- `Analytics(container=ArcheCore, timeAnchor=week)`
- `Share(address=...)`

### 2.4 Cross-space links (v0.5 rendering)

Two modes (minimal + scalable):

1. **Local‑only + Counters (default)**

   - Render only links between visible nodes in current view.
   - Cross‑space links become `↗/↘` counters on the node + hover list + “Jump” action.

2. **Wormholes (toggle)**

   - Render dotted “tunnel stubs” to portal markers (no spaghetti).
   - Click = jump to target GraphAddress (and highlight target).

---

## 3) NOW Hypermode (ritual disk) — visualization + build plan

**NOW = Ritual Hypermode (“spectral vinyl”)**: a multilayer circular controller where each ring is a channel. **Important:** entering a regular node opens **Note**; NOW is only entered explicitly (Temple chip / hotkey / from selection).

### 3.1 Disk layers (recommended)

| Ring / Layer      | Modulates               | Source            | UI control               |
| ----------------- | ----------------------- | ----------------- | ------------------------ |
| 0 — core          | `mode/tone/glyph`       | StateCore         | central glyph + switches |
| 1 — breath/rhythm | tempo, duration, pulse  | ritual presets    | metronome + timer        |
| 2 — attention     | focus/intent (1 line)   | intent            | focus field              |
| 3 — content       | selected nodes/clusters | canvas selection  | highlight/snap           |
| 4 — output        | artifact/export         | artifact pipeline | “record session”         |

### 3.2 Must-have user flows

1. **Enter NOW** from Temple (or hotkey) → choose preset → disk reconfigures UI.
   1.1 **Enter Note** (default): click/enter any node → open Note view (content/backlinks/actions).
2. **Bind to Canvas**: select cluster → NOW pulls it as session content.
3. **Record session**: timeline of events + resulting Artifact (at least a “session card”).
4. **Exit**: return to Temple/Canvas with context preserved.

### 3.3 Acceptance criteria

- Disk opens **≤ 300ms** after Enter (lazy-load heavy parts).
- Session writes **EventLog** entry + links to selected nodes.
- Every session yields at least a **Session Card** (state + intent + selection + duration).

---

## 4) Analytics Mode — meaning + form (overlay)

Core idea: not only dashboards — analytics is **mapped onto the graph**.

### 4.1 v0.5–0.7 minimal metrics

| Category | Metric                                  | From               |
| -------- | --------------------------------------- | ------------------ |
| Dynamics | active nodes/day, new edges/day         | EventLog           |
| Focus    | top clusters by attention time          | selection + events |
| Cycles   | weekly/lunar rhythms                    | timestamps         |
| Tension  | “pending loops”: started not closed     | SEM7 markers       |
| Quality  | shipped\_artifacts\_per\_week (primary) | Artifact           |

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

### v0.5 (4–6w): Core Graph + Temple + Field + Note + Time + HUD

**Goal:** activated baseline: Temple (Director Panel) + FieldView + **NoteView** + TimePanel + HUD; EventLog is complete.

Features:

- Temple/Station (**Director Panel**): portal constellations (field, not list) + quick actions + recents drawer
- FieldView (canvas): create/move/select nodes, create edges (link tool), multi-select, undo (1), soft delete
- **NoteView (Node → Note)**: open any node as a note/object (content, backlinks, actions), without entering NOW
- **Clusters (containers)**: create cluster from selection + enter/exit (inside‑view)
- TimePanel: DayAnchor + week/month lists → highlight/filter
- StateCore: set day/session state + optional snapshots to nodes
- Ritual → XP: quick logging presets → XP ledger
- Portals: shortcuts to **GraphAddress** (routing)
- Share subgraph (read‑only link) + ShareView (minimum)
- Export/Import JSON (+ Obsidian bridge as “should”)

Criteria:

- End‑to‑end works: Station → Field → Cluster → Time → State → Ritual → XP → Export → Share → Portal jump.
- **Every action writes EventLogEntry**.

### v0.6 (2–4w): NOW Hypermode MVP

Features:

- NOW Hypermode view (ritual disk)
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
- **📱 Separate native mobile app “NOW” (iOS/Android)** — *not the full graph editor*, but a **moment-capture / ritual client** designed for one-hand use and “catch the moment”.
  - **Instant Enter NOW** (lockscreen/widget/quick action) → start session in **1–2 taps**
  - **StateCore control** (mode/tone/glyph) + **1-line intent** (text/voice)
  - **Timer + metronome** presets (ritual/jam/reset)
  - **Micro-graph view (2–3 hops)**: quick peek around the current node/cluster (read-only), because the full graph is неудобен на моб
  - **Quick Record → Session Card** (always) + attach photo/audio/note via share sheet
  - **Offline-first**: sessions записываются локально → позже **sync** в Core Graph + EventLog

Criteria:

- Full path works: create → record → publish.
- Mobile NOW can: start session → produce Session Card → sync to core.
- Minimal privacy/moderation.

### Post v1.0 (v1.1+): Desktop + Local-Cloud Sync

Direction:

- Desktop app (power user): heavier Canvas + Sculpture + local performance
- **Local–cloud sync for file vaults**: watch folders, bidirectional sync, import/export attachments into Artifacts, offline mode + conflict resolution

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

| Role                     | Responsibility                     | Agent output  |
| ------------------------ | ---------------------------------- | ------------- |
| Product/Spec (G + agent) | PRD, use cases, criteria           | “Spec Writer” |
| UX/UI                    | flows, disk, overlays              | “UX Mapper”   |
| Frontend                 | Canvas + Lens + Sculpture          | “FE Builder”  |
| Backend                  | Core entities + EventLog + storage | “BE Builder”  |
| Data/Analytics           | metrics, aggregation               | “Data Agent”  |
| Creative Tech (opt)      | audio/visual jam                   | “AV R&D”      |

Agent ticket pack (deliverables):

- PRD v0.5: 10–15 use cases + acceptance criteria
- UX flows: Temple→Canvas→NOW→Analytics→Back
- Data model: Node/Edge/StateCore/EventLogEntry/Artifact/XP Ledger/GraphAddress
- Performance budget: node/render/latency limits
- Export formats: JSON + MD

---

## 10) Hard truth (guardrail)

✅ **One Core → many Views**
✅ **EventLog is the blood of the system**
✅ Lens/Analytics/Game/Market are built **on top** of events + artifacts
❌ Don’t bake game/market into Core entities (kills v0.5 with complexity)

