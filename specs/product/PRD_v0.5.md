Status: SoT
Version: v0.5
Owner: SF
Last updated: 2026-01-05
Supersedes: symbolfield_prd_v_0.5.md

# SymbolField PRD v0.5 — Life Map OS (Field-First)

## 0) Summary (What are we shipping?)
**SymbolField v0.5** is a cross-platform **field-first** tool for a "visual life map": the user builds a **graph on a canvas** (Space/Hub/Node/Portal), sees **time as a navigational layer** (day/week/month), captures **state (mode+tone+glyph)**, and **logs rituals**, earning **XP**.
The main difference from "just another note-taking app": **portals + subgraph sharing + state/HUD + cyclical time + ritual→XP**.

---

## 0.1) North Star (1 paragraph)
**SymbolField** is a modular platform-field for life/projects/meaning, where one single **Core Graph** can be seen through different "lenses" (views/modes): from a working Canvas to a ritual NOW-view and dynamic analytics. Key principle: **One Core → Many Views** (otherwise we end up with a zoo of incompatible interfaces).

## 0.2) Views / Modes (Unified Map)
These are **not separate apps**, but different representations of a single Core.

| View / Mode | Role | Main UI Object | Status |
|---|---|---|---|
| 🏛 Home / Station (Temple) | entry/routes/quick actions | portals + director panel | **v0.5** |
| 🗺 Field (Work Map) | hands-on: nodes/links/hubs | canvas | **v0.5** |
| 📝 Note (Node View) | inspect/edit node content | note/page view | **v0.5** |
| ⏳ Time Panel | navigation by day/week/month | panel/overlay | **v0.5** |
| 🎮 HUD (State + XP + Rituals) | state/progress/quick logs | HUD layer | **v0.5** |
| 👁 NOW Mode (Ritual Hypermode) | sessions/ritual/jam | multi-layer disc | v0.6+ |
| 📡 Analytics (Meaning + Dynamics) | metrics + graph overlay | dashboard + highlights | v0.7+ |
| 🎮 Game / XP View | quests/skills/leveling | RPG screen | v0.8+ |
| 🗿 Sculpture (Global Graph Art) | global field form (2D→3D) | sculpture/mycelium | v0.5 (2D in Station) |
| 🛒 Market / Stream | publish/sell/live | showcase + live | v1.0+ |


---

## 1) Goals / Non-goals

### ✅ Goals (Success for v0.5)
1) **Graph/Canvas core**: Fast and stable graph-canvas (create node, link, group).
2) **Hub & clustering**: Grouping nodes into Hubs + local areas/layers (visual categorization).
3) **Time layer MVP**: day/week/month as navigation and graph filter (no "perfect spiral" yet).
4) **State layer**: state = mode+tone+glyph for day/session + snapshots on nodes.
5) **Ritual → XP loop**: Log practices + XP ledger + simple analytics.
6) **Subgraph sharing MVP**: "Share" Node/Hub/Space read-only link (minimum).
7) **Portability**: export/import JSON + **Obsidian bridge** (md + wikilinks + frontmatter).
8) **Cross-platform baseline**: web + desktop (must), mobile capture/review (should).
9) **Offline-first feeling**: Works without network (local store), sync can happen "later".

### ❌ Non-goals (Strict)
- ❌ **Not competing with Miro** in enterprise real-time collab (multi-cursor, org admin, workshop templates).
- ❌ No "full AI assistant/RAG" in v0.5 (max: search + future slot).
- ❌ No marketplace/social network/public profiles yet.
- ❌ No complex typing "for everything" — only minimal component typing.

---

## 2) Target users / JTBD

### Primary persona
**Builder/Researcher/Creator** (and "life architect") who wants to **see the structure of life**, not just lists/feeds.

### JTBD (Top)
- "Capture an event/idea and immediately plant it in context (links + cluster)."
- "Assemble a domain of meaning (Hub) and perceive it as a unit."
- "Orient in time: what happened this week/month, where is it in the graph."
- "Log practices and see progress not as a table, but as part of the map."

---

## 3) Product category definition (Positioning)
**SymbolField-like** = *field-first canvas graph* + *life-time navigation* + *stateful context* + *ritual→XP*, with the ability to **share subgraphs** and move through **portals**.

---

## 4) Competitive guardrails (constraints)
1) **Canvas is not a differentiator**: It is must-have, but not the reason to buy.
2) **AI chat — commodity**: We don't sell "chat with notes", we sell "patterns of life".
3) **Obsidian ecosystem**: Lower migration barrier via md/wikilinks/frontmatter.
4) **Miro war avoided**: Collab in v0.5 = sharing subgraphs (read / fork later).

---

## 5) Core ontology & data model (v0.5)

### 5.1 Entities (Core)
- **Node** — element (can have a local subgraph).
- **Edge** — connection Node↔Node (simple type for now).
- **OverlayRegion** — colored area/layer on canvas (categorization).
- **State** — `mode + tone + glyph` (AppShellState) + `NodeStateSnapshot` (optional).
- **EventLogEntry** — unified event log (node creation, link, move, state change, ritual log, export, sharing, etc.).
- **Ritual** — ritual as a type of event (subset EventLog) + preset.
- **Artifact** — result of a session/work (minimum: "session card"; later: patches/presets/visual/audio).
- **XPLedgerEntry** — XP accrual record (aggregated from EventLog).
- **DayAnchor** — "today/day node" (day entry point).
- **GraphAddress** — single navigation primitive (routes to Station/Field/Note/NOW/Share).

### 5.2 Views / Roles (not core entities)
- **ArcheCore** — root anchor node (global graph).
- **ArcheSpace** — root context (view anchored on ArcheCore).
- **Space** — inside-view of a Node (subgraph).
- **Hub / Cluster** — Node with children (enterable container).
- **Portal** — UI shortcut to a GraphAddress.

### 5.2 Ownership rules (to resolve "doesn't state belong to nodes?")
- **AppShellState** = global context of day/session.
- **NodeStateSnapshot** = *copy* of state attached to Node (for history/context).

---

## 6) Views (UI model) — simplification like "Page ↔ Field"

### v0.5 Views (Actual scope)
- **Temple/Station (Home)**: Director panel + portals, quick actions, recents drawer.
- **FieldView**: Main canvas/graph (Space/Hub).
- **NoteView**: Node content view (open node as note/object).
- **TimePanel**: Side/bottom time panel (day/week/month).
- **HUDPanel**: State + XP + quick rituals.
- **ShareView**: Read-only view of shared subgraph.

### v0.6+ (Contours ahead, out of v0.5 scope)
- **NOW Lens**: Session/ritual mode (dist), pulls selection from Canvas and writes session-events.
- **Analytics Overlay**: Metrics → highlights on graph.
- **Game/XP View**: Leveling/quests as separate render over the same events.
- **Sculpture**: 2D→3D art view of global graph (experiment).
- **Market/Stream**: Publishing artifacts/patches/skins.

---

## 7) Functional requirements (v0.5)

### 7.1 Canvas/Graph (Must)
- Create Node (dblclick / hotkey).
- Move, zoom, pan (smooth).
- Create Edge (linking tool) — **no conflict with multi-select**.
- Rename/delete + **undo 1 step**.
- Multi-select + actions (group, delete, move).
- **Hub creation**:
  - Select area/nodes → `Create Hub`
  - Hub gets color/label
  - Hub opens as FocusView + subcanvas (optional)
- **OverlayRegion**:
  - Create colored region (frame/fill)
  - Regions do not break graph (UI layer)

### 7.1a Space lifecycle (Station, Must)
- Create Space from Station (template or blank).
- Rename Space from Station context menu.
- Delete Space = **soft delete** with **30d trash** retention.

### 7.2 Hotkeys & interaction model (Must)
- Conflict resolution: **shift+click currently = link**.
- In v0.5 fix new rule:
  - `L` (or separate "link mode") = link tool
  - `Shift` = multi-select / box select
  - `Ctrl/Cmd` = additive selection / drag clone (optional)
  - `Enter` = create node; `Shift+Enter` = quick create inside hub (optional)

### 7.3 Time layer (Must)
- **DayAnchor**: "Today" button creates/opens day node.
- Node can have `date/time` (explicit meta).
- **Week & Month views**:
  - List of nodes/rituals by date
  - Click → highlight/filter graph
- Time — **as panel/overlay**, not a block on main canvas.

### 7.4 State/HUD (Must)
- Set day/session state (mode/tone/glyph).
- HUD shows current state.
- Attach NodeStateSnapshot:
  - "attach current state to node" (button/command)
- State history by day (list).

### 7.5 Ritual → XP (Must)
- Quick ritual logging:
  - `type` (preset)
  - `duration`
  - `xp_axis` (HP/EP/MP/SP)
  - `timestamp` (auto)
  - `linked_node` (optional)
- XP accrual (simple formula):
  - `xp = duration_minutes * coefficient_by_axis`
- HUD: totals by axes + last 7 days (mini-stat).

### 7.6 Sharing subgraphs (Must)
- "Share" for Node/Hub/Space:
  - Generates link
  - Scope = selected subgraph
  - Access: **read-only**
- ShareView shows:
  - Canvas/graph of subgraph (view only)
  - Base meta (title, description)
- Without accounts/roles in v0.5, "unlisted link" is acceptable (minimum).

### 7.7 Portals (Must)
- Portal created from context:
  - "Create portal to …"
- Portal visually distinct from Node.
- Click Portal → navigation (inside app).
- Portal can live in graph as link between levels (Space↔Hub↔Node).

### 7.8 Portability / Obsidian bridge (Must/Should)
**Must**
- Export: JSON (graph + logs + state history) + schema_version.
- Import: JSON of own format.

**Should (Strongly Desired)**
- Import `.md`:
  - Folder → Space/Hub mapping
  - `[[wikilinks]]` → edges/relations
  - YAML frontmatter: `date`, `tags`, `type`
- Export `.md`:
  - For Node type "Note" → markdown with frontmatter

---

## 8) Platform requirements

### Must (v0.5)
- **Web**: Full functionality (FieldView + TimePanel + HUD + ShareView).
- **Desktop**: Full functionality (performance/offline).
- **Offline-first**: Local store (indexedDB/sqlite), app works without network.

### Should (v0.5)
- **Mobile**:
  - Capture: node/ritual/state
  - Review: time-panel + opening nodes
  - Canvas editing reduced

---

## 9) Metrics & acceptance criteria (DoD)

### Primary metric (Product Proxy)
- **Activated user** in 7 days:
  - ≥ 20 nodes
  - ≥ 10 edges
  - ≥ 2 hubs
  - ≥ 5 ritual logs
  - ≥ 3 days with state set

### Guardrails
- Time-to-log ritual ≤ 15 sec
- Time-to-create node ≤ 5 sec
- Canvas interactions (zoom/pan/drag) without "freezes"
- Export works without errors (critical_regressions=0)

### v0.5 Definition of Done (Minimum)
- End-to-end works:
  - Temple → create space → nodes → links → hub/overlay → time view → state → ritual → XP → export → share link → portal navigation.
- **Every action writes EventLogEntry** (this is the "blood of the system").

---

## 10) Risks / mitigations

### Main risks
1) **Over-complication** (SF syndrome: too many semantic layers).
2) **UX hotkey conflict** (link vs select) breaks basic mechanics.
3) **Share/permissions** might require more infra than expecting.
4) **Cross-platform** eats development speed.

### Mitigations
- Rigid non-goals.
- Minimal component typing (3-4 types).
- Share v0.5 = read-only unlisted links.
- Mobile only capture/review.

---

## 11) Spec alignment checklist (What to update in documentation system)
Need 5 specific spec-files:
1) `spec/hotkeys_selection_model.md` — final hotkeys and selection/link rules.
2) `spec/hub_and_overlay_regions.md` — hub grouping + colored regions.
3) `spec/time_panel_v0.5.md` — DayAnchor + week/month + filtering.
4) `spec/share_subgraph_v0.5.md` — link, scope, read-only, ShareView.
5) `spec/import_export_obsidian_bridge.md` — md/wikilinks/frontmatter mapping + JSON schema_version.

---

## 12) Milestones (In correct order)
1) Canvas core (nodes/edges)
2) Selection model + hotkeys
3) Hubs + overlay regions
4) Temple/Station (Home) + FocusView + DayAnchor
5) TimePanel (week/month)
6) State/HUD
7) Ritual→XP (via EventLog)
8) Portals
9) Share subgraph (read-only)
10) Export/Import + Obsidian bridge

---

## 13) Roadmap beyond v0.5 (Outline)

### v0.6 (NOW Lens MVP)
**Focus:** Session/Ritual as separate view.
- Enter NOW from Temple and Canvas (with selection).
- Session → writes EventLog + creates **Artifact: session card**.
- 3–5 ritual presets.

### v0.7 (Analytics Overlay)
**Focus:** Metrics that are clickable and highlight the graph.
- Base metrics from EventLog (dynamics/focus/cycles/tension/shipping).
- Click metric → highlight related nodes/sessions.
- "Explain" text (skeleton without complex AI).

### v0.8 (Game/XP View + Sculpture beta)
**Focus:** Progress as separate view + experimental art-view.
- XP/Skill Tree UI, quests-templates (events-expected).
- Sculpture 2D→3D does not break performance of the rest.

### v1.0 (Publish/Market + Stream hooks)
**Focus:** Path "create → record → publish".
- Publish Artifact + license + preview.
- Minimal privacy/moderation contours.
