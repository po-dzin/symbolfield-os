# 🧩 SF OS – Dev & Agent Infrastructure v0.5

**Purpose:** a clean, implementation-ready infrastructure blueprint for building SymbolField OS (MVP v0.5) with **ChatGPT + Antigravity + CrewAI + Supabase**.

**Key rule:** **Product architecture ≠ Dev infrastructure.**\
This document is the *meta-layer* that produces and audits the product.

---

## 0) System Overview (Two Orthogonal Loops)

### A) DEV loop (creates reality)

- **ChatGPT 5.x (Plus)** → specs, decisions, acceptance criteria
- **Antigravity** + (Claude/Gemini) → implementation in repo
- **GitHub** → source of truth for code + docs

### B) AUDIT loop (checks reality)

- **CrewAI (lightweight)** orchestrates
- **Gemini Flash (CLI/API free tier)** for cheap batch work
- **Supabase** as context spine (docs + code embeddings + activity logs)

**Core principle:** the audit loop **does not** own product decisions; it flags risks, regressions, inconsistencies.

---

## 1) Minimal Architecture (MVP v0.5)

```
   Specs & Decisions            Implementation                 Audit & Knowledge
┌──────────────────┐      ┌─────────────────────┐        ┌─────────────────────────┐
│  ChatGPT 5.x      │──►──►│  Antigravity Agents  │──►──► │ CrewAI (Context+QA)      │
│  (PRD/ADR/API)    │      │  (Claude/Gemini)     │        │ + Gemini Flash           │
└────────┬─────────┘      └──────────┬──────────┘        └──────────┬──────────────┘
         │                             │                               │
         ▼                             ▼                               ▼
     GitHub /docs                 GitHub /src                      Supabase Spine
   (specs+ADR)                    (code+migrations)              (RAG + logs + indices)
```

---

## 2) Sources of Truth & Versioning

### Product SSoT

- `Product Architecture v0.5` (separate canvas) is immutable within v0.5 cycle.

### Dev SSoT

- GitHub repo: code + docs
- ADR log: decisions as durable record
- Supabase: searchable context mirror (not the primary code authority)

### Versioning discipline

- Specs: `/docs/specs/`
- Decisions: `/docs/decisions/ADR-XXX.md`
- Changes: `/docs/CHANGELOG.md`

---

## 3) Repo Structure (Recommended)

```
/docs
  /specs
    PRD.md
    ARCHITECTURE.md
    API.md
    USER_STORIES.md
  /decisions
    ADR-001.md
    ADR-002.md
  CHANGELOG.md
/src
  ...
/supabase
  /migrations
  seed.sql
/.antigravity
  rules.md
  /workflows
    generate-component.md
    update-docs.md
    deploy-feature.md
symbolfield-crew/
  main.py
  /agents
  /tasks
  /tools
  /config
GEMINI.md
```

---

## 4) Antigravity Setup (Implementation Agents)

### Why Antigravity here

- Direct, tool-driven work with repo + infra
- Fits "coding loop" better than chat-only

### MCP connectors (pattern)

- Supabase MCP
- GitHub MCP

**Note:** keep this minimal for v0.5; add more servers later.

### Antigravity rules (must-haves)

- Always consult Product SSoT + ADR before implementing
- Never introduce new UI entities without ADR
- Keep changes small; run tests before commit
- Record decisions: ADR entry when architecture shifts

---

## 5) CrewAI Suite (Audit-First, Lightweight)

### Why not 4+ agents now

Because v0.5 needs **stability**, not meta-complexity.

### MVP crew roles

1. **Context Manager**

   - Sync specs + ADR + selected code summaries into Supabase
   - Maintain embeddings and retrieval quality

2. **QA / Audit Guardian**

   - Runs architectural invariants checks
   - Generates test gaps list
   - Flags state duplication / layer hacks / render hot spots

**Optional later (DLC):** Doc Writer, Pattern Analyst, Refactor Coach.

---

## 6) Supabase as Context Spine (Occam Version)

### Keep in v0.5 (4 tables)

1. `project_specs`
2. `code_components`
3. `architecture_decisions`
4. `agent_activity`

### Defer to Phase 2

- `pattern_library`
- heavy `knowledge_graph`

**Reason:** avoid building a meta-OS instead of the OS.

---

## 7) Embeddings Strategy (Practical)

### When to embed

- Specs (PRD/API/User stories)
- ADRs
- *Summaries* of key code modules (not full repo every time)

### Chunking

- 600–1200 tokens chunks
- attach metadata: `doc_type`, `path`, `version`, `module`

### Retrieval policy

- Prefer **precise filters** (doc\_type/module) before similarity
- Keep a "golden" small set of top docs pinned

---

## 8) Budget Reality (Free-Tier-Friendly)

### Works near-free

- ChatGPT Plus (already)
- Gemini Flash via CLI/API free quota (for batch + audits)
- Supabase free tier (early)
- GitHub Actions free minutes

### Avoid early

- Paid embeddings everywhere
- Continuous full-repo embedding
- 4–8 autonomous agents loops

---

## 9) Integration Workflow (Context Circulation)

### Event chain (minimum viable)

1. Spec/ADR updated → commit to GitHub
2. CrewAI Context Manager job → sync & embed to Supabase
3. Antigravity agent pulls context from Supabase (RAG) + reads repo
4. Code change → tests run
5. QA Guardian runs audit checks → writes `audit_report.md` + logs to Supabase

---

## 10) Codebase Stabilization Guardrails (Codex Review → Action)

### 10.1 Single Source of Truth (state)

**Problem:** duplicated `mode/activeNode/tab` across stores.

**Action:** create one **AppShell store** with events:

- `enterNOW(nodeId)`
- `exitNOW()`
- `openWindow(tab, payload)`
- `setLayout(window|split|fullscreen)`
- `goBack()`

All other stores read via selectors.

---

### 10.2 Layers & Focus (no more z-index hacks)

**Problem:** scattered z-index and pointer-events.

**Action:** Layer Registry + Focus Manager

- layers: `base, graph, now, windows, dock, overlay`
- focus: `activeWindowId`, `bringToFront()`

---

### 10.3 Render performance

**Problem:** extra renders from `getState()` in JSX and unstable arrays.

**Action:**

- selectors + `shallow`
- memo lists
- guard `setState` only when changed
- debounce history writes

---

### 10.4 NOW context boundary

**Problem:** NOW components reach directly into stores.

**Action:** `NodeContextProvider(nodeId)` + `useNode()` API for blocks.

---

### 10.5 Data model & serialization

**Problem:** no unified schema for node/components; no reliable restore.

**Action:** define `Node + Block` schema + functions:

- `serializeGraph()`
- `loadGraph()`
- snapshot-based `undo/redo`

---

### 10.6 Graph engine

**Problem:** local camera + O(n²) position checks.

**Action:**

- camera & hit-test in a module/hook
- spatial hashing grid for collisions / neighbor queries

---

### 10.7 Tests (behavior-first)

**Minimum tests to stop regressions:**

- Graph → NOW enter
- back stack behavior
- window z-order + dock restore
- edge creation
- undo/redo snapshot

---

## 11) Operational Runbook (Phased)

### Week 1 — Spine

- Supabase project + 4 tables
- One CrewAI job: context sync
- Antigravity rules + minimal workflows

### Week 2 — Safety

- QA Guardian job: state/layers/render audits
- Minimal behavior tests
- ADR discipline enforced

### Week 3 — Scale cautiously

- Add pattern library OR knowledge graph (pick one)
- Add doc sync automation

---

## 12) Suggested Tools / Frameworks for UX & System QA

### What actually helps now (v0.5)

- **Playwright** (e2e UI behavior)
- **Vitest** (unit)
- **Storybook** (component isolation) — optional
- **Lighthouse** (performance) — optional

### AI-assisted (use carefully)

- Gemini Flash for batch audit summaries
- Claude for deep refactor reasoning
- (Later) specialized "UI diff" workflows via screenshots + assertions

**Important:** AI should verify **invariants**, not judge aesthetics.

---

## 13) Non-Goals (v0.5)

- autonomous self-modifying agents
- full knowledge-graph automation
- continuous full-repo embedding
- heavy multi-agent orchestration beyond 2 core roles

---

## Final: What This Infra Enables

- A stable loop: **spec → code → audit → regressions prevented**
- Cheap iteration using free-tier models where possible
- A context spine that can later become part of the product graph

This is the infra layer. Product architecture remains separate and clean.

