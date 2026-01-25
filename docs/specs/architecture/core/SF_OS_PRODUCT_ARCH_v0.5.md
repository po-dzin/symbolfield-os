# 🧠 SymbolField OS — Product Tech Architecture v0.5

**Status:** Source of Truth for MVP v0.5\
**Scope:** UI/UX layout, system architecture, agent architecture, runtime principles\
**Goal:** One clean, non‑duplicated, implementation‑ready snapshot

---

## 0. Core Principle (Fixed)

**SymbolField OS = two‑scale system**

- **System Scale** → `Graph` (external meaning map)
- **Node Scale** → `NOW` (interior of a single node)

No file system. No folders. No pages. Only **nodes, relations, states, scales**.

---

## 1. OS Shell (L0 — Infrastructure Layer)

**Purpose:** Frame, not content.

### Components

- Nav Rail (left) — module tabs
- Central Workspace — window / split / fullscreen
- Windows Dock — window lifecycle
- Temporal Dock — global time filter
- OS State Machine — layout & focus control

### Responsibilities

- Manages *where* things appear
- Does **not** contain node logic
- Does **not** know about content

---

## 2. Module Tabs (L1)

```
• NOW        — node interior
◎ Graph      — system map
𓂀 Agent     — AI interface
≡ Log        — time history
∴ Settings   — configuration
```

**Rule:** Any tab can be `window`, `split`, or `fullscreen`.

---

## 3. View / Layout States (L2)

These are **states**, not entities.

- **Window** — floating, resizable
- **Split** — snapped 2–3 pane layout
- **Fullscreen** — occupies central workspace

❌ No embedded‑mode\
❌ No dive‑mode entity\
Dive = animation Graph → NOW

---

## 4. NOW — Node Interior View (Core)

**NOW = camera inside the active node**

Not a HUD. Not time mode. Not overlay.

### Activation

- App entry (root node)
- Double‑click node in Graph
- Click tab `• NOW`
- Restore from Dock

---

### 4.1 NOW Layout

```
NOW HEADER
 ├ Glyph
 ├ Title
 ├ XP Summary (numeric)
 ├ Back ← (previous node)
 ├ Window □
 └ Fullscreen ⤢

Time Context Bar (activity preview)
Pulse Strip (focus / ritual)

Content Blocks
 ├ Text
 ├ Tables
 ├ Audio / Gen Flow
 ├ Iso / Animation Flow
 ├ Mixed blocks

Local Subgraph
 ├ Nearest relations
 └ Relation types
```

---

### 4.2 ChronoCore (Mini‑HUD)

**Only HUD in the system.**

- Visible **only in NOW**
- Top‑right anchor
- Size: **10–12U (80–96px)**

#### Layers

- State (mode / tone / glyph)
- Node XP
- Time / SEM7 stage
- Luna markers
- Pulse halo
- Timer arc

No duplicated panels.

---

## 5. Graph — System Scale View

Shows nodes, relations, types, temporal signals.

### Interactions

- Double‑click → NOW
- Pan / Zoom

### States

- window
- split
- fullscreen

---

## 6. Agent — Intelligence Module

Contextual AI interface.

### Context Sources

- Active NOW node
- Graph selection
- System state

### States

- window
- split (NOW + Agent is primary use)
- fullscreen

---

## 7. Log — Temporal History

- Events
- Rituals
- XP changes

**Listens to Temporal Dock.**

States:

- window
- split
- fullscreen

---

## 8. Temporal Dock

**Global time filter.**

Components:

- Time Chip (scale)
- Temporal Window (grid / spiral)
- Calendar popup

Affects:

- Graph ✔
- Log ✔
- NOW ✖ (NOW only reflects context)

---

## 9. Windows Dock

OS‑level window manager.

- Minimize / restore
- Layout memory
- Works with split & fullscreen

NOW can live as window.

---

## 10. Split View (OS‑Level)

**Layout state, not module.**

- 2–3 panes
- Any tab in any pane

Examples:

- NOW + Agent
- NOW + Graph
- Graph + Log
- NOW + Graph + Agent

---

## 11. Agent Architecture (MVP v0.5)

### Two Cycles (Separated)

#### DEV CREW (crewAI)

- Architect
- Developer / MetaCoder
- QA Guardian
- Human

Purpose: produce artifacts.

---

#### AUDIT (embedded in QA Guardian)

Modes:

- Test Mode
- Audit Mode:
  - UX consistency (SUTA‑lite)
  - Ontology sanity (FOA‑lite)
  - Flow simulation (ISA‑lite)

LLM: **Gemini Flash (free tier)**

---

## 12. LLM Stack (Current)

- **ChatGPT 5.x** — architecture & decisions (human loop)
- **Gemini Flash (CLI)** — audits, simulation, spec reading
- **Claude (optional)** — second opinion

---

## 13. Explicitly Out of Scope (v0.5)

- File system
- Dedicated dive mode
- HyperLens
- Autonomous agents
- Audio‑visual streaming
- Self‑modifying UI

---

## Appendix A: Core / Store / View Separation (implementation guardrail)

**Principle:** keep logic out of UI and make state changes flow in one direction.

```
[ Data Layer ] <-> [ Core Engine ] <-> [ Store/Adapters ] <-> [ View Layer ]
(JSON/DB)         (pure modules)        (reactive state)      (React UI)
```

**Core engine lives in** `src/core`:
- GraphEngine (nodes/edges, hit testing)
- StateEngine (app/tool mode)
- TimeEngine (anchors/scales)
- EventBus (domain events + log)

**Stores/adapters** wrap core for reactivity (e.g. Zustand in `src/store`).

**View layer** renders and forwards intents (e.g. `src/components`).

**Unidirectional flow (example):**
1) User action in view.
2) View calls a store/core action.
3) Core validates + mutates state.
4) Store broadcasts reactive updates.
5) View re-renders from selectors.

Reference: `docs/specs/architecture/tech/contracts/API.md`.

---

## Final Note

This document is the **single architectural truth** for SymbolField OS v0.5.

No duplicated concepts. No hidden modes. Ready for implementation, audit, and evolution.
