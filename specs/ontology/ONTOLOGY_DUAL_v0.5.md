Status: SoT
Version: v0.5
Owner: SF
Last updated: 2026-01-05
Supersedes: sf_ontology_dual_spec_v_0_5.md

# SymbolField OS — Dual Spec (Core + Kid) v0.5

> “You don’t have to simplify the system.
> You have to simplify the entry.
>
> Ontology can be deep.
> The first step must be child-simple.”

---

## A) Philosophical / Ontological Version (Core)

### A0. Axiom

SymbolField (SF) is not a storage app. SF is an **orientation system**: it helps a mind locate itself inside a living field of meaning **through time**.

### A1. Four fundamental entities (only)

1. **Node (N)** — a stable *meaning focus* capable of relations.

- Not “a note” or “a task”.
- Minimal: `id`, `title`,`metadata`.

2. **Link (L)** — an intentional *difference / relation* between two nodes.

- More important than nodes.
- Minimal: `from`, `to`, `relation`, `weight`, `metadata`.

3. **State (S)** — the *perspective* from which the graph is perceived now.

- Belongs to the subject/session, not to a node.
- Minimal: `mode`, `tone`, `focus_scope`, `timestamp`.
- Example modes: Focus / Flow / Deep; tone = color/vibe; glyph = identity marker.

4. **Event (E)** — a record of *becoming*: any change in graph or state.

- Enables replay/undo, liveness, “temperature”.
- Examples: `NodeCreated`, `LinkAdded`, `StateShift`, `FocusEntered`, `RitualCompleted`.

### A2. What is NOT fundamental

Folders, tags, rigid types, projects, dailies, todos, documents are **projections** of (Node + Link + State + Event), not primitives.

### A3. Typing without hard types

“Type” is an **emergent pattern**:

- a node becomes “Daily/Project/Task” by its **relations**, **events**, and **state coupling**.
- you may store `node.type` as UX hint, but logic should rely on patterns.

### A4. One graph, many lenses

Knowledge base / mind map / planner / focus mode are **lenses** (views) on the same graph.

### A5. Canonical formula

**SF = (N, L, S, E)**

- N = nodes of meaning
- L = relations/differences
- S = state/perspective
- E = events/becoming

---

## B) Kid-Simple Version (Entry)

### B0. One sentence

**SF is a living map of important things and how they connect — and it remembers what changed.**

### B1. Four things (only)

1. **Circle (Nodes)** A circle is **something important**: idea, day, task, feeling, person, question.

2. **Lines (Links)** A line is **how two circles are connected**: “helps”, “part of”, “blocks”, “similar”.

3. **Glasses (State)**
   Your glasses are **how you look at the map right now**: planning, exploring, focusing, tired, in flow.

4. **Moments (Events)**
   A moment is **when something changes**: new circle, new line, finished thing, mood shift.

### B2. No scary words

There are no “projects” or “tasks” as special things. They’re just circles you can connect differently.\*\*

### B3. The rule

**You don’t have to simplify the system.
You have to simplify the entry.**

Deep rules can exist underneath, but the first action must be child-simple:

- “Is it important?” → make a circle
- “Is it connected?” → draw a line
- “How do I feel now?” → choose glasses
- “What changed?” → save a moment

---

## C) Bridge Principle (Core ↔ Entry)

### C1. Why this works

- Core stays powerful: graph + state + events.
- Entry stays effortless: circle + line + glasses + moment.

### C2. Product mantra

**Keep the ontology deep. Keep the first step obvious.**



---

## D) Spaces, Portals, Permissions, Metadata (MVP v0.5)

### D1. Space (fractal rooms)

A **Space** is a *bounded sub-graph* with its own access rules.

- In UI: a Space behaves like a **hub node** you can enter.
- In ontology: it’s a projection of Nodes+Links+State+Events.
- In DB: we may store a thin `spaces` table for ACL + nesting, but conceptually it is still “a node you can enter”.

**Boundary rule (default):**

- You *see* the Space as a single hub object inside its parent.
- You see the Space’s *inside* only after you “enter” it.

**Fractal nesting:**

- A Space can contain child Spaces (rooms inside rooms).
- Depth can be limited (e.g. ≤ 5) for UX + performance.

### D2. Portal (doors across boundaries)

A **Portal** is a link that points from your current room to another room (or a subgraph hub).

- If you have access: portal behaves like a door → you can enter.
- If you don’t: portal is visible as a “locked door” stub (optional), showing *no internal details*.

Portal is the clean way to have:

- public → private references (without leaking contents)
- cross-space navigation
- “subgraph sharing” (share a hub = share the room behind that hub)

### D3. Permissions (keys)

Minimal action set:

- **view** → can read nodes/links/docs in this Space
- **comment** → can add annotations / comments (no structural edits)
- **edit** → can create/update nodes, links, docs
- **manage** → can invite, change roles, change visibility

Minimal role ladder:

- viewer → view
- commenter → view + comment
- editor → view + comment + edit
- owner/admin → everything (manage)

**Inheritance default (recommended):**

- child Spaces inherit permissions from parent unless explicitly “sealed”.

### D4. Kid map (one-liners)

- **Spaces** — rooms.
- **Nodes** — things in rooms.
- **Links** — threads between things.
- **Portals** — doors.
- **Permissions** — keys.
- **Metadata** — pockets (don’t put a fridge in your pocket).
