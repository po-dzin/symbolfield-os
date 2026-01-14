Status: Tracking
Version: v0.5
Owner: SF
Last updated: 2026-01-05
Source: Derived from v0.5 SoT checklists + code scan in src/

# DEV_PROGRESS_v0.5
**Scope:** v0.5 progress tracking by SoT checklist items  
**Source:** SoT checklists (items marked `[ ]`) mapped to current `src/`  
**Legend:** реализовано | частично | нет

---

## UI_UX_BASELINE_METRICS (specs/ui/foundation/UI_UX_BASELINE_METRICS_SoT_v0.5.md)
| Item | Реализовано | Частично | Нет | Доказательство |
|---|---|---|---|---|
| Tokens exist as CSS variables (or Tailwind theme mapping) |  | ✓ |  | `src/index.css` |
| Dark theme usable by default | ✓ |  |  | `src/index.css` |
| Accessibility: focus rings + contrast |  | ✓ |  | `src/index.css`, `src/components/Layout/ToolDock.tsx`, `src/components/Station/StartGates.tsx` |
| Field interactions remain smooth with panels open/closed |  | ✓ |  | `src/components/Layout/Shell.tsx`, `src/components/Canvas/CanvasView.tsx` |
| Presets can override tokens without breaking essentials |  |  | ✓ | — |

## UI_INTERACTION_PIPELINE (specs/ui/interaction/UI_INTERACTION_PIPELINE_SoT_v0.5.md)
| Item | Реализовано | Частично | Нет | Доказательство |
|---|---|---|---|---|
| Pointer tool supports pan/select/move/box-select via hit-test + modifiers | ✓ |  |  | `src/core/interaction/GestureRouter.ts`, `src/components/Canvas/CanvasView.tsx`, `src/components/Canvas/InteractionLayer.tsx` |
| Explicit tools exist for Link and Region overlays |  | ✓ |  | `src/core/state/StateEngine.ts`, `src/core/interaction/GestureRouter.ts`, `src/components/Layout/ToolDock.tsx` |
| Gesture Router is single source of truth for mappings | ✓ |  |  | `src/core/interaction/GestureRouter.ts`, `src/components/Canvas/CanvasView.tsx` |
| Event categories exist (UI/Overlay/Domain) and are consistently used |  | ✓ |  | `src/core/events/EventBus.ts`, `src/core/events/EventLog.ts` |
| Undo/redo covers DomainEvents for graph editing operations |  | ✓ |  | `src/core/undo/UndoManager.ts` |
| “No magic click” rule holds (all state changes traceable) |  | ✓ |  | `src/core/interaction/GestureRouter.ts`, `src/core/events/EventBus.ts` |

## UI_HOTKEYS_SELECTION (specs/ui/interaction/UI_HOTKEYS_SELECTION_SoT_v0.5.md)
| Item | Реализовано | Частично | Нет | Доказательство |
|---|---|---|---|---|
| Shift is selection-only (no link behaviors) |  | ✓ |  | `src/core/interaction/GestureRouter.ts` |
| Port-drag linking works at 60fps |  | ✓ |  | `src/core/interaction/GestureRouter.ts`, `src/components/Canvas/InteractionLayer.tsx` |
| `L` mode exists as an alternative | ✓ |  |  | `src/core/interaction/GestureRouter.ts` |
| Hub grouping via `Shift+Enter` | ✓ |  |  | `src/core/interaction/GestureRouter.ts` |
| Zones via `Z` tool; no conflicts with linking/selection |  | ✓ |  | `src/core/interaction/GestureRouter.ts`, `src/components/Layout/ToolDock.tsx` |
| SelectionState is separate from GraphState (no per-node selection flags) | ✓ |  |  | `src/core/state/SelectionState.ts`, `src/store/useSelectionStore.ts` |

## UI_GROUPING_HUB_REGIONS (specs/ui/interaction/UI_GROUPING_HUB_REGIONS_SoT_v0.5.md)
| Item | Реализовано | Частично | Нет | Доказательство |
|---|---|---|---|---|
| Group to Hub works on multi-select | ✓ |  |  | `src/core/interaction/GestureRouter.ts`, `src/components/Context/ContextToolbar.tsx` |
| Hub behaves like a container (selecting shows context UI) |  | ✓ |  | `src/utils/hubFold.ts`, `src/components/Context/ContextToolbar.tsx` |
| Regions can be created/edited/deleted and don’t block node interaction |  |  | ✓ | — |

## UI_SPACE_FIELD_SHELL (specs/ui/shells/UI_SPACE_FIELD_SHELL_SoT_v0.5.md)
| Item | Реализовано | Частично | Нет | Доказательство |
|---|---|---|---|---|
| Field remains primary; UI never blocks core interactions |  | ✓ |  | `src/components/Layout/Shell.tsx`, `src/components/Canvas/CanvasView.tsx` |
| Pointer tool works (pan/select/move/box/multi) | ✓ |  |  | `src/core/interaction/GestureRouter.ts` |
| Context toolbar appears on selection; heavy properties are not default | ✓ |  |  | `src/components/Context/ContextToolbar.tsx` |
| Log drawer works via Time Chip (time lens filtering) |  | ✓ |  | `src/components/Layout/TimeChip.tsx`, `src/components/Drawers/LogDrawer.tsx` |
| Settings accessible via palette/dock | ✓ |  |  | `src/components/Layout/ToolDock.tsx`, `src/core/interaction/GestureRouter.ts`, `src/components/Overlays/CommandPalette.tsx` |
| Dive overlay enter/exit is stable (Esc) | ✓ |  |  | `src/core/interaction/GestureRouter.ts`, `src/components/NOW/NowOverlay.tsx` |
| StateCore micro/expanded works without polluting node properties |  | ✓ |  | `src/components/HUD/StateCore.tsx` |

## UI_HOME_PORTAL (specs/ui/shells/UI_HOME_PORTAL_SoT_v0.5.md)
| Item | Реализовано | Частично | Нет | Доказательство |
|---|---|---|---|---|
| Logo returns Home Portal from Space/NOW | ✓ |  |  | `src/components/Layout/SpaceHeader.tsx` |
| Search/Dive opens any Space/Hub/Node quickly via portals |  |  | ✓ | — |
| Recents work and restore context | ✓ |  |  | `src/components/Station/RecentsRail.tsx`, `src/core/state/SpaceManager.ts` |
| Templates can spawn a new Space | ✓ |  |  | `src/components/Station/TemplatesRow.tsx`, `src/core/state/SpaceManager.ts` |
| Widget Surface exists with slot limits and is optional |  |  | ✓ | — |
| Profile entry exists from Home |  |  | ✓ | — |

## UI_GLOBAL_GRAPH_OVERVIEW (specs/ui/shells/UI_GLOBAL_GRAPH_OVERVIEW_SoT_v0.5.md)
| Item | Реализовано | Частично | Нет | Доказательство |
|---|---|---|---|---|
| Space/Hub/Node различимы на overview |  | ✓ |  | `src/components/Station/Station.tsx` |
| LOD работает и не перегружает |  |  | ✓ | — |
| Подсветка target стабильна и быстра |  |  | ✓ | — |

## UI_CONTEXT_UI (specs/ui/panels/UI_CONTEXT_UI_SoT_v0.5.md)
| Item | Реализовано | Частично | Нет | Доказательство |
|---|---|---|---|---|
| Toolbar appears only on selection | ✓ |  |  | `src/components/Context/ContextToolbar.tsx` |
| No permanent properties pane in default preset | ✓ |  |  | `src/components/Context/ContextToolbar.tsx` |
| ENTER NOW works from toolbar | ✓ |  |  | `src/components/Context/ContextToolbar.tsx` |
| Context Drawer exists and respects presets |  |  | ✓ | — |

## UI_STATECORE (specs/ui/panels/UI_STATECORE_SoT_v0.5.md)
| Item | Реализовано | Частично | Нет | Доказательство |
|---|---|---|---|---|
| Micro mode exists and is visually minimal | ✓ |  |  | `src/components/HUD/StateCore.tsx` |
| Expanded StateBar exists with Set State + Focus Session |  | ✓ |  | `src/components/HUD/StateCore.tsx` |
| BreathPulse ring animation exists (ambient or focus-tied) |  | ✓ |  | `src/components/HUD/StateCore.tsx`, `src/index.css` |
| StateCore is session-level (does not write to node properties) | ✓ |  |  | `src/components/HUD/StateCore.tsx`, `src/core/state/StateEngine.ts` |
| Visibility is controllable via presets/settings |  |  | ✓ | — |
| Emits consistent events (UIEvents + DomainEvents) |  | ✓ |  | `src/core/state/StateEngine.ts` |

## UI_STATION_PANELS (specs/ui/panels/UI_STATION_PANELS_SoT_v0.5.md)
| Item | Реализовано | Частично | Нет | Доказательство |
|---|---|---|---|---|
| Logo/command always returns to Station | ✓ |  |  | `src/components/Layout/SpaceHeader.tsx`, `src/core/interaction/GestureRouter.ts` |
| Top/Left/Main/Right (and opt. Bottom) exist |  | ✓ |  | `src/components/Station/Station.tsx` |
| Global Graph read-only and reacts to portal hover |  |  | ✓ | — |
| Recent Portals = addresses (Space/Hub/Node), not just spaces |  |  | ✓ | — |

## SETTINGS_PRESETS_CUSTOMIZATION (specs/ui/panels/SETTINGS_PRESETS_CUSTOMIZATION_SoT_v0.5.md)
| Item | Реализовано | Частично | Нет | Доказательство |
|---|---|---|---|---|
| Presets work and are reversible |  |  | ✓ | — |
| Hide/show affects views only (not data) |  |  | ✓ | — |
| Default preset is clean and minimal |  | ✓ |  | `src/components/Drawers/SettingsDrawer.tsx` |

## UI_NAVIGATION_FLOW_STATION_FIELD_NOW (specs/ui/flows/UI_NAVIGATION_FLOW_STATION_FIELD_NOW_SoT_v0.5.md)
| Item | Реализовано | Частично | Нет | Доказательство |
|---|---|---|---|---|
| ESC from NOW always returns to correct Field | ✓ |  |  | `src/core/interaction/GestureRouter.ts`, `src/core/state/StateEngine.ts` |
| Logo always leads to Station | ✓ |  |  | `src/components/Layout/SpaceHeader.tsx` |
| Transitions and highlights do not break 60fps feel |  |  | ✓ | — |

## UI_PORTAL_HIGHLIGHTING (specs/ui/flows/UI_PORTAL_HIGHLIGHTING_SoT_v0.5.md)
| Item | Реализовано | Частично | Нет | Доказательство |
|---|---|---|---|---|
| Hover and keyboard preview highlight target without lag |  |  | ✓ | — |
| Preview card appears only when useful |  |  | ✓ | — |

## UI_PORTAL_TRANSITIONS_ANIMATION (specs/ui/flows/UI_PORTAL_TRANSITIONS_ANIMATION_SoT_v0.5.md)
| Item | Реализовано | Частично | Нет | Доказательство |
|---|---|---|---|---|
| Portal supports Enter and NOW for any GraphAddress (Space/Hub/Node) |  |  | ✓ | — |
| Hover preview highlights target zone in global graph preview |  |  | ✓ | — |
| Portal→Field transition feels spatial |  |  | ✓ | — |
| Field→NOW feels like zoom/lens; Field remains behind |  |  | ✓ | — |
| Esc always exits NOW to Field, stack-aware | ✓ |  |  | `src/core/interaction/GestureRouter.ts` |
| Reduced-motion works and is validated |  |  | ✓ | — |

## UI_RECENT_PORTALS_TEMPLATES (specs/ui/flows/UI_RECENT_PORTALS_TEMPLATES_SoT_v0.5.md)
| Item | Реализовано | Частично | Нет | Доказательство |
|---|---|---|---|---|
| Recent Portals support Space/Hub/Node |  | ✓ |  | `src/components/Station/RecentsRail.tsx`, `src/core/state/SpaceManager.ts` |
| Hover highlights target |  |  | ✓ | — |
| Create template creates Space and leads to Enter (Field) | ✓ |  |  | `src/components/Station/TemplatesRow.tsx`, `src/core/state/SpaceManager.ts` |

## SHARE_SUBGRAPH (specs/growth/SHARE_SUBGRAPH_SoT_v0.5.md)
| Item | Реализовано | Частично | Нет | Доказательство |
|---|---|---|---|---|
| Create share link for Space/Hub/Node |  |  | ✓ | — |
| Token is generated once; only hash stored |  |  | ✓ | — |
| ShareView loads subgraph read-only with deterministic scope |  |  | ✓ | — |
| Owner can revoke/expire a link |  |  | ✓ | — |

## RITUAL_XP_LOOP (specs/growth/RITUAL_XP_LOOP_SoT_v0.5.md)
| Item | Реализовано | Частично | Нет | Доказательство |
|---|---|---|---|---|
| Log ritual in ≤10 seconds |  |  | ✓ | — |
| XP ledger deltas created on ritual insert (or by server action) |  |  | ✓ | — |
| Daily XP totals can be queried fast |  |  | ✓ | — |
| Rituals can link to nodes (at least array of uuids) |  |  | ✓ | — |
| All changes auditable (EventLogEntry) |  |  | ✓ | — |

## BILLING_ENTITLEMENTS (specs/growth/BILLING_ENTITLEMENTS_SoT_v0.5.md)
| Item | Реализовано | Частично | Нет | Доказательство |
|---|---|---|---|---|
| Feature gates read from `user_entitlements` |  |  | ✓ | — |
| Claim codes grant entitlements |  |  | ✓ | — |
| Free tier limits enforced (at least `spaces.max`) |  |  | ✓ | — |
| All entitlement changes recorded in EventLogEntry |  |  | ✓ | — |

## HARMONY_ENGINE (specs/optional/HARMONY_ENGINE_SoT_v0.5.md)
| Item | Реализовано | Частично | Нет | Доказательство |
|---|---|---|---|---|
| ThemeProfile generation is deterministic |  |  | ✓ | — |
| Enforces max 3 accents |  |  | ✓ | — |
| Validates contrast and auto-adjusts (or warns) |  |  | ✓ | — |
| Can be applied without changing interaction affordances |  |  | ✓ | — |

---
