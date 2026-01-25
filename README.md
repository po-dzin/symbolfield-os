# SymbolField OS

SymbolField OS is a spatial graph canvas for building and navigating clustered knowledge spaces.

## Quick start

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Tests

```bash
npm run test        # Vitest (watch)
npm run test:run    # Vitest (single run)
npm run test:e2e    # Playwright suite
npm run test:smoke  # Playwright smoke subset
npm run test:hotkeys
npm run typecheck
```

## Repo layout

- `src/` app code (React + TS)
- `tests/` Playwright regression/interaction/smoke tests
- `docs/specs/` product and system specifications
- `docs/refs/` reference assets
- `docs/` project docs (migration, QA contract, test templates)
- `agents/` agent prototypes and workflows
- `archive/` deprecated tooling (legacy scripts)
- `dist/` build output (local)

Test artifacts (`test-results*`, `playwright-report/`) are local and ignored by git.
