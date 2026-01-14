# TypeScript Migration Guide

This project completed incremental TypeScript migration with `allowJs: false`.

## Philosophy: Strict Contracts, Flexible Data

- **Branded IDs**: `NodeId`, `EdgeId` prevent accidental ID mixups
- **Flexible data**: Use `Record<string, unknown>` for dynamic node properties
- **No rigid schemas**: Avoid giant discriminated unions for component types

## Type Locations

| File | Contents |
|------|----------|
| `src/core/types.ts` | Branded IDs (`NodeId`, `EdgeId`), `Position`, `NodeBase`, `Edge` |
| `src/core/events/EventBus.ts` | Typed `EventMap` contracts for emit/on payloads |
| `src/store/*.ts` | Zustand store types |
| `src/vite-env.d.ts` | Vite client types |

## Migration Rules

### New Files
- Always use `.ts` or `.tsx` extensions
- Import types from `src/core/types.ts`

### Converting Existing Files
1. Rename `.js` → `.ts` or `.jsx` → `.tsx`
2. Add type annotations to function parameters
3. Keep `as unknown as Type` only at boundaries (tests, external inputs), avoid in core

### Typing Node Components

```typescript
// ✅ GOOD: Flexible
interface NodeComponent {
  kind: string;
  props: Record<string, unknown>;
}

// ❌ BAD: Rigid (don't do this yet)
type NodeComponent = TextComponent | ImageComponent | ...
```

## Scripts

```bash
npm run dev         # Development server
npm run build       # Production build
npm run lint        # ESLint (JS + TS)
npm run typecheck   # TypeScript checking
npm test            # Vitest unit tests
npm run test:e2e    # Playwright E2E tests
```

## TS Config (Current)

Strict mode is enabled with additional safety flags:
- `noImplicitOverride`
- `noFallthroughCasesInSwitch`
- `forceConsistentCasingInFileNames`
- `verbatimModuleSyntax`
- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes`

## Migration Status

- All files under `src/` are `.ts`/`.tsx`
- `allowJs` is off
- Core boundaries use branded IDs (`NodeId`, `EdgeId`)
- EventBus is fully typed with `EventMap`
- ESLint minimal TS rules are enabled (`consistent-type-imports`, `no-explicit-any` warn)

## Migrated Files

- `src/core/types.ts` - Core type definitions
- `src/core/events/EventBus.ts` - Typed event contracts
- `src/core/graph/GraphEngine.ts` - NodeId/EdgeId boundaries
- `src/core/interaction/GestureRouter.ts` - Boundary conversions for NodeId/EdgeId
- `src/core/state/*.ts` - Typed selection/state engines
- `src/core/undo/UndoManager.ts` - Typed undo event handling
- `src/core/time/TimeEngine.ts` - Typed time engine
- `src/core/audio/AudioBus.ts` - Typed audio events
- `src/store/*.ts` - All Zustand stores
- `src/main.tsx` - Entry point
- `src/App.tsx` - Root component
- `vite.config.ts` - Vite config
- `vitest.config.ts` - Vitest config
- `playwright.config.ts` - Playwright config
