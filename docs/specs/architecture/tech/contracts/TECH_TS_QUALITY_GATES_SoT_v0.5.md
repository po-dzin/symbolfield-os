# TECH_TS_QUALITY_GATES_SoT_v0.5_r1
**Status:** SoT  
**Goal:** TS даёт стабильность, но не должен убить скорость.

---

## 1) TS policy
- `strict: true`
- payloads/props: `unknown` by default
- runtime validation at boundaries (load/save/network) via zod/val registry
- no `any` in core packages

---

## 2) CI gates for v0.5
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (smoke: reducers + routing)
- DB migrations apply cleanly

---

## 3) DoD add-ons (v0.5)
- every SoT spec that drives code must list:
  - Entities used
  - Actions used
  - Events emitted
  - Persistence boundary

