# Codex Workflow Playbook (Windsurf + Cursor)

> **Goal:** one calm, low-friction flow for shipping SF / CenterWay code using **Codex plugin** inside **Windsurf/Cursor**, with **parallel tasks** that don’t conflict.

---

## 0) Operating Laws 🧠⚖️

**Prime directive:** *reduce chaos → ship artifacts → avoid regressions.*

### Non‑negotiables

- **One reality** for all agents: repo + `ops/` docs.
- **One job = one branch = one PR = one zone.**
- **Small surface area** changes. No “while I’m here…” expansions.
- **Stop conditions:** unclear scope, conflicts, tests failing unexpectedly → stop + report in JOB.

### Parallelism constraints (the “3×3” rule)

- **≤ 3 active JOBs** at once.
- **≤ 1 zone per JOB** (UI/Core/DB/Ops).
- **≤ 3 high-conflict files** per JOB.

---

## 1) Architecture: Codex-only Multi-Task System 🎛️

### Alignment with your existing docs

You already have:

- `agents/workflows/AGENT_STRATEGY.md` — the 3-role loop (Architect → Developer → QA → You) + artifacts + hybrid QA/TDD idea&#x20;
- `agents/workflows/development-principles.md` — strict git branching + incremental dev + mandatory browser checks + recovery protocol&#x20;

This playbook **extends** that design from:

- **Architect → Coder → QA** into:
- **Architect → 3× Coders (parallel) → QA → You**

Key change: **multiple coders run in parallel on separate JOB branches**, but QA stays a single gate (plus automated tests).



### Planes

- **○ Control Plane** (truth): `AGENTS.md` + `ops/` (tasks, jobs, decisions, runbook)
- **∣ Execution Plane** (work): branches, PRs, CI/tests
- **• Worker Plane** (hands): Codex plugin inside Windsurf/Cursor

### Flow

1. You create 1–3 JOB specs (small, independent)
2. Codex implements each JOB in its own branch
3. PRs reviewed/merged **one by one**
4. `ops/` stays current (progress + decisions)

---

## 2) Repo Structure (Control Plane) 📁

> Ты уже держишь агентную инфраструктуру в `/agents/`. Значит делаем **control plane тоже там**, без лишней миграции.

```text
/ (repo root)
  agents/
    AGENTS.md                   (canonical rules for Codex)
    ops/
      NORTH_STAR.md
      TASKS.md
      DECISIONS.md
      RUNBOOK.md
      jobs/
        JOB-TEMPLATE.md
        JOB-YYYY-MM-DD-001-....md
    workflows/
      AGENT_STRATEGY.md         (your existing high-level strategy)
      development-principles.md (your existing principles)
    symbolfield-crew/            (your existing agent runtime/code)
```

---

## 3) Core Templates (copy‑paste) 🧩

### 3.1 `AGENTS.md`

```markdown
# AGENTS.md — Single Source of Truth for all agents

## 0) Prime Directive
- Reduce chaos. Ship artifacts. Do not break core flows.
- If unsure → stop and write a note in the JOB.

## 1) Repo map (quick)
- Core zones:
  - /src/   — UI + app logic (React/Vite)
  - /tests/ — tests (vitest/playwright as configured)
  - /agents/ops/ — tasks, jobs, decisions, runbooks (always safe)
  - /agents/workflows/ — high-level strategy + principles

## 2) Universal Work Protocol
1) Read this file.
2) Read the JOB spec: `agents/ops/jobs/JOB-....md`
3) Only touch the JOB zone.
4) Implement smallest viable change.
5) Mandatory verification loop:
   - run dev server / wait HMR
   - open browser and check UI + console
   - run tests if applicable
6) Commit meaningful chunk(s).
7) Push branch.
8) Open PR referencing JOB-ID and DoD.
9) Update JOB progress log.

## 3) Definition of Done (DoD)
- [ ] Works locally (document how)
- [ ] No new console errors
- [ ] Manual browser verification done (per dev principles)
- [ ] Tests/lint/build pass OR failure is explained + scoped
- [ ] Minimal surface area change
- [ ] JOB progress updated

## 4) Commit style (compatible)
Use Conventional Commits **plus** JOB id.
Examples:
- `fix(ui): node drag bounds (JOB-001)`
- `feat(core): link animation source→target (JOB-002)`
- `docs(ops): outage protocol checklist (JOB-003)`

## 5) PR rules
- PR title: `JOB-XXX: <short outcome>`
- PR description includes:
  - What changed + why
  - Files/areas touched
  - Risks + rollback plan
  - DoD checklist

## 6) Anti-collision rules
- One JOB = one zone.
- No parallel edits in the same file unless explicitly stated in the JOB.
- No repo-wide formatting.
- No dependency changes unless JOB says so.

## 7) Stop conditions (DO NOT proceed)
- unclear scope
- conflicts you cannot resolve cleanly
- tests failing unexpectedly
- changes expanding beyond JOB

## 8) Real-world constraints
- Outages possible → keep progress in small safe increments.
- Prefer checkpoints (commit/push) at session end.
```

## 3.2 `agents/ops/TASKS.md`

```markdown
# TASKS — single queue

## NOW (max 3)
- [ ] JOB-___ — <title> (Owner: Codex-Builder) (Zone: UI/Core/DB/Ops)
- [ ] JOB-___ — <title>
- [ ] JOB-___ — <title>

## NEXT (max 7)
- [ ] JOB-___ — <title>

## LATER (parking)
- [ ] <idea> (trigger to start)

## DONE (last 10)
- [x] JOB-___ — <title> (date)

---

## Rules
- NOW > 3 = you’re lying to yourself.
- Every item in NOW must have a JOB spec in `agents/ops/jobs/`.
```

### 3.3 `agents/ops/DECISIONS.md`

```markdown
# DECISIONS (ADR-lite)

## DEC-YYYY-MM-DD-001 — <title>
- Context: <what forced this decision?>
- Decision: <what we chose>
- Alternatives: <1–3 rejected options>
- Consequences: <tradeoffs + risks>
- Owner: <you/Codex>
- Links: JOB-XXX, PR-YYY
```

### 3.4 `agents/ops/RUNBOOK.md`

```markdown
# RUNBOOK — operate calmly

## Start of session (2 min)
1) `git pull`
2) Open `ops/TASKS.md` → pick 1 NOW
3) Open JOB spec
4) Create/enter branch/worktree

## End of session (3 min)
1) Quick checks (choose what exists):
   - `npm test` / `pnpm test`
   - `npm run lint`
   - `npm run build`
2) Commit meaningful chunk(s)
3) Push branch
4) Update JOB progress: “done / next step”

## Outage protocol (panic-less)
- Prefer checkpoint commits at end of each session.
- If outage hits mid-change:
  - write 3 lines in JOB progress: “what/where/next”
  - commit if safe; otherwise leave clear note

## Recovery checklist
- `git status`
- Re-open JOB → resume from last progress note
- Re-run relevant checks
```

### 3.5 `ops/jobs/JOB-TEMPLATE.md`

```markdown
# JOB-YYYY-MM-DD-XXX — <title>

## Goal (1–2 lines)
<what outcome must exist?>

## Zone + Ownership
- Zone: UI / Core / DB / Ops
- Owner: Codex-Builder / Codex-Fixer / You
- Files likely touched: <paths>

## Scope
### Must
- <bullet>
### Nice
- <bullet>
### Not in scope
- <bullet>

## Plan (rough)
1) ...
2) ...
3) ...

## Definition of Done (DoD)
- [ ] ...
- [ ] ...

## Risks + Rollback
- Risks: ...
- Rollback: <how to revert safely>

## Progress log (append-only)
- [YYYY-MM-DD] Started: ...
- [ ] Next: ...
```

### 3.6 Optional: `CODEOWNERS`

```text
/ui/    @ui-owner
/core/  @core-owner
/db/    @db-owner
/ops/   @ops-owner
```

(If solo: these can be placeholders — the value is in **explicit boundaries**.)

---

## 4) Parallel Tasks: the Safe Pattern 🧱

### Roles (current target)

- **Architect (you + ChatGPT):** turns a fuzzy goal into 1–3 crisp JOB specs.
- **Coder-UI (Codex):** works only in `/src` UI components/styling.
- **Coder-Core (Codex):** works in core logic/engine modules.
- **Coder-Infra/Ops (Codex):** config, tooling, CI, scripts, docs, non-product code.
- **QA (tests + Codex-Reviewer):** adds/updates tests where appropriate + does PR risk scan, while your dev-principles require manual browser verification after each change.&#x20;

### Pattern

- Create **up to 3 JOBs** across **different zones**.
- Run Codex on each JOB independently.
- Merge PRs **one by one**.

### Example NOW block

```markdown
## NOW (max 3)
- [ ] JOB-001 — UI: Node drag bounds fix (Owner: Codex-Coder-UI)
- [ ] JOB-002 — Core: Link animation source→target (Owner: Codex-Coder-Core)
- [ ] JOB-003 — Ops: Runbook / tooling polish (Owner: Codex-Coder-Ops)
```

### QA strategy (hybrid)

- For risky/logic-heavy changes: QA-first (write failing test → implement until pass), matching your earlier strategy.&#x20;
- For UI micro-changes: mandatory manual browser check loop + minimal tests when sensible.&#x20;

### Pattern

- Create **3 JOBs** across **different zones**.
- Run Codex on each JOB independently.
- Merge PRs **one by one**.

### Example NOW block

```markdown
## NOW (max 3)
- [ ] JOB-001 — UI: Node drag bounds fix (Owner: Codex-Builder)
- [ ] JOB-002 — Core: Link animation source→target (Owner: Codex-Builder)
- [ ] JOB-003 — Ops: Runbook outage protocol polish (Owner: Codex-Fixer)
```

---

## 5) Two Execution Options (choose your vibe) 🍏

### Option A — Branches + (rare) stash 🪶

**Best when:** tasks are short, you can reach clean commit points fast.

**Create branches**

```bash
git checkout main
git pull

git checkout -b job/JOB-001-ui-...
git checkout main
git checkout -b job/JOB-002-core-...
git checkout main
git checkout -b job/JOB-003-ops-...
```

**Switching safely**

- Prefer **WIP commit** over stash (more outage-proof):

```bash
git add -A
git commit -m "WIP JOB-001: checkpoint"
```

- If you must stash:

```bash
git stash push -u -m "WIP JOB-001"
```

### Option B — `git worktree` (recommended) 🌳

**Best when:** you truly run 2–3 parallel JOBs and want isolation.

**Setup**

```bash
cd ~/dev/<repo>
git checkout main
git pull

mkdir -p ~/dev/<repo>-wt

# create new worktrees with new branches from main
git worktree add -b job/JOB-001-ui ~/dev/<repo>-wt/JOB-001-ui main
git worktree add -b job/JOB-002-core ~/dev/<repo>-wt/JOB-002-core main
git worktree add -b job/JOB-003-ops ~/dev/<repo>-wt/JOB-003-ops main
```

**Work**

```bash
cd ~/dev/<repo>-wt/JOB-002-core
# edit in IDE

git add -A
git commit -m "JOB-002: add core — ..."
git push -u origin job/JOB-002-core
```

**List / remove**

```bash
git worktree list
# after merge:
git worktree remove ~/dev/<repo>-wt/JOB-003-ops
```

**Notes**

- If you run multiple dev servers, set different ports.
- Package managers with good caching (e.g., pnpm) reduce disk pain.

---

## 6) How to Run This Inside Windsurf/Cursor (Codex plugin) 🧑‍💻

### 6.0 Root pointer (compat)

Codex/IDE tools often scan the repo root. To make discovery painless, keep a tiny root file:

- `/AGENTS.md` (pointer)
  - contains: `See agents/AGENTS.md`

Canonical rules live in: `agents/AGENTS.md`.



### 6.1 The “Context Pack” to paste into every Codex request

Paste this at the top:

```text
Read AGENTS.md.
Read the JOB spec: agents/ops/jobs/<JOB>.md.
Only touch the JOB Zone.
Implement the smallest viable change.
Output: PR-ready change + update JOB Progress log.
Stop if: scope unclear / conflicts / tests fail unexpectedly.
```

Then the command:

- “Implement Plan step 1–3. Keep changes minimal. Show what to test.”

### 6.2 Codex “masks” (use as labels in your prompts)

- **Codex‑Builder**: implements feature increment
- **Codex‑Fixer**: bugfix with reproduction steps
- **Codex‑Refactorer**: strictly scoped cleanup
- **Codex‑Reviewer**: risk scan + checklist before merge

### 6.3 Suggested workflow in IDE

- Open repo (or each worktree folder) in Windsurf/Cursor.
- For each JOB:
  1. open `ops/jobs/JOB-...md`
  2. open target files
  3. run Codex with Context Pack
  4. commit + push
  5. PR

---

## 7) Session Ritual (optimized for outages) ⚡

### Start (2 min)

- Pull latest
- Pick 1 NOW
- Open JOB + AGENTS
- Ensure correct branch/worktree

### End (3 min)

- Run quick checks (whatever exists)
- Commit(s)
- Push
- Update JOB progress (3 lines)

### The 3-line progress format

- ✅ Done: …
- 🧩 State: …
- ▶️ Next: …

---

## 8) Quickstart Checklist ✅

1. Add `AGENTS.md` + `ops/` structure
2. Put **3 items max** into `NOW`
3. Create JOB specs for each NOW
4. Choose Execution option:
   - quick & simple → branches
   - clean parallelism → worktrees
5. For each JOB → Codex → branch → PR
6. Merge PRs one by one

---

## 9) Minimal “Parallel JOB Set” Template (fill each week) 🗓️

- **JOB-A (UI)**: …
- **JOB-B (Core)**: …
- **JOB-C (Ops/Docs)**: …

That’s your calm throughput engine.

