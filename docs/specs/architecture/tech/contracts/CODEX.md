# SymbolField Codex v0.5 (Foundation)

## 1) Purpose
SymbolField is a field-first life map OS: one core graph, many views. The product exists to help a person see structure, time, and state in the same place.

## 2) Core Axioms
- One Core Graph, multiple Views. No duplicate sources of truth.
- State belongs to the subject (session/day), not to objects.
- Time is a navigation layer, not a separate app.
- Portals connect contexts; sharing is subgraph-level and read-only by default.
- Events are the system memory; history enables learning and analytics.

## 3) Minimum for stability (v0.5 baseline)
- Stable Graph + Canvas: create, move, link, group (hub) without crashes.
- Time layer: day/week/month navigation with filtering, not just labels.
- State + Ritual -> XP loop: log is real data, not mock UI.
- Persistence: local store + import/export JSON; Obsidian bridge is a must-have.
- SSOT docs: PRD + Ontology + Architecture + API + Docs index.

## 4) Non-Goals (v0.5)
- No enterprise real-time collab.
- No full AI assistant or RAG.
- No marketplace or social graph (for now).
- No heavy type system for everything.

## 5) SSOT Rules
- Source of truth lives in docs/ and core/ for behavior.
- UI mocks do not define product logic.
- Any new feature must update PRD + Ontology + Architecture (if it changes the model).

## 6) Release Readiness
- Core loops function end-to-end.
- No broken navigation between views.
- Data survives restart and export/import.

