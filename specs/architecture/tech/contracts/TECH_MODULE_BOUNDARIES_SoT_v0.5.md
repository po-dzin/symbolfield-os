# TECH_MODULE_BOUNDARIES_SoT_v0.5_r1
**Status:** SoT  
**Goal:** границы модулей (TS/monorepo-friendly), чтобы не смешивать UI/Graph/Editor/Storage.

---

## 1) Packages (suggested)
1) `@sf/core-contracts` — IDs, entities, actions, events, snapshots (см. TECH_CORE_CONTRACTS)
2) `@sf/graph-engine` — GraphState reducers, layout helpers, selection state, hub/regions
3) `@sf/canvas-runtime` — camera service + gesture router + tool state machine
4) `@sf/content-adapters` — EditorAdapter implementations (blocksuite)
5) `@sf/ui-shell` — Station/Field/NOW shells, panels, drawers, context UI
6) `@sf/persistence` — Supabase repos, migrations, storage interfaces
7) `@sf/eventlog` — запись/чтение событий, аналитика
8) (future) `@sf/sync` — CRDT sync, presence, sharing

---

## 2) Dependency rule
- UI depends on contracts + engines
- engines depend on contracts only
- persistence depends on contracts only
- content adapters depend on contracts only
- no circular deps

