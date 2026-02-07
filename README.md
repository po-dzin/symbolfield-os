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

## UI state backend (local vs remote)

By default, UI state is stored in localStorage.
You can enable remote sync for Settings + Station layout:

```bash
VITE_UI_STATE_BACKEND=remote
VITE_UI_STATE_API_BASE_URL=https://your-api.example.com
VITE_UI_STATE_API_TOKEN=your-token
VITE_UI_STATE_SCOPE=your-user-or-workspace-id
```

Expected API contract:
- `GET /ui-state/settings?scope=<scope>`
- `PUT /ui-state/settings?scope=<scope>`
- `DELETE /ui-state/settings?scope=<scope>`
- `GET /ui-state/station-layout?scope=<scope>`
- `PUT /ui-state/station-layout?scope=<scope>`
- `DELETE /ui-state/station-layout?scope=<scope>`
- `GET /ui-state/glyph-builder?scope=<scope>` (optional; used by Glyph Adapter sync)
- `PUT /ui-state/glyph-builder?scope=<scope>` (optional)
- `DELETE /ui-state/glyph-builder?scope=<scope>` (optional)

If remote is unavailable, app continues using local storage.

For document persistence around the BlockSuite editor, use project-owned endpoints:
- `GET/PUT /sf/docs`
- `GET/POST /sf/doc-versions`
- `GET/PUT/DELETE /sf/links`
These are SF backend routes; BlockSuite remains editor/engine only.

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
