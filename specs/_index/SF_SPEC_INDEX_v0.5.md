# SF Spec Index v0.5

## 1) Product
- specs/product/PRD_v0.5.md
- specs/product/ROADMAP_v0.5_to_v1.0.md

## 2) Ontology
- specs/ontology/ONTOLOGY_DUAL_v0.5.md
- specs/ontology/GLOSSARY_v0.5.md

## 3) Data
- specs/data/sql/schema_v0.5.sql
- specs/data/sql/patches/patch_0001_eventlog.sql
- specs/data/sql/patches/patch_0002_access_funnel.sql
- specs/data/sql/patches/patch_0003_ritual_xp.sql
- specs/data/sql/patches/patch_0004_share_subgraph.sql
- specs/data/migrations/setup_dev_schema.sql

## 4) Architecture
### Core
- specs/architecture/core/SF_OS_PRODUCT_ARCH_v0.5.md
- specs/architecture/core/GRAPH_ADDRESSING_SoT_v0.5.md
- specs/architecture/core/EVENT_LOG_SoT_v0.5.md

### Tech / Contracts
- specs/architecture/tech/contracts/SF_OS_DEV_AGENT_INFRA_v0.5.md
- specs/architecture/tech/contracts/API.md
- specs/architecture/tech/contracts/CODEX.md
- specs/architecture/tech/contracts/TECH_CORE_CONTRACTS_SoT_v0.5.md
- specs/architecture/tech/contracts/TECH_DOCUMENT_BOUNDARIES_SoT_v0.5.md
- specs/architecture/tech/contracts/TECH_EDITOR_ADAPTER_SoT_v0.5.md
- specs/architecture/tech/contracts/TECH_MODULE_BOUNDARIES_SoT_v0.5.md
- specs/architecture/tech/contracts/TECH_TS_QUALITY_GATES_SoT_v0.5.md

### Tech / ADR
- specs/architecture/tech/adr/ (none)

## 5) UI
### Foundation
- specs/ui/foundation/UI_UX_BASELINE_METRICS_SoT_v0.5.md
- specs/ui/foundation/VISUAL_DESIGN_LAB_SoT_v0.5.md

### Shells
- specs/ui/shells/UI_HOME_PORTAL_SoT_v0.5.md
- specs/ui/shells/UI_SPACE_FIELD_SHELL_SoT_v0.5.md
- specs/ui/shells/UI_SPACE_FIELD_CORE_SoT_v0.5.md
- specs/ui/shells/UI_GLOBAL_GRAPH_OVERVIEW_SoT_v0.5.md
- specs/ui/shells/UI_NOW_MODE_SoT_v0.5.md

### Panels
- specs/ui/panels/UI_STATECORE_SoT_v0.5.md
- specs/ui/panels/UI_CONTEXT_UI_SoT_v0.5.md
- specs/ui/panels/UI_STATION_PANELS_SoT_v0.5.md
- specs/ui/panels/SETTINGS_PRESETS_CUSTOMIZATION_SoT_v0.5.md
- specs/ui/panels/UI_TIME_PANEL_SoT_v0.5.md
- specs/ui/panels/UI_LOG_TIMELINE_DRAWER_SoT_v0.5.md

### Interaction
- specs/ui/interaction/UI_INTERACTION_PIPELINE_SoT_v0.5.md
- specs/ui/interaction/UI_HOTKEYS_SELECTION_SoT_v0.5.md
- specs/ui/interaction/UI_GROUPING_HUB_REGIONS_SoT_v0.5.md

### Components
- specs/ui/components/UI_ICON_PICKER_SoT_v0.5.md
- specs/ui/components/UI_NODE_CONTEXT_MENU_SoT_v0.5.md

### Flows
- specs/ui/flows/UI_NAVIGATION_FLOW_STATION_FIELD_NOW_SoT_v0.5.md
- specs/ui/flows/UI_PORTAL_HIGHLIGHTING_SoT_v0.5.md
- specs/ui/flows/UI_PORTAL_TRANSITIONS_ANIMATION_SoT_v0.5.md
- specs/ui/flows/UI_RECENT_PORTALS_TEMPLATES_SoT_v0.5.md
- specs/ui/flows/UI_ONBOARDING_SANDBOX_SoT_v0.5.md

## 6) Growth
- specs/growth/BILLING_ENTITLEMENTS_SoT_v0.5.md
- specs/growth/SHARE_SUBGRAPH_SoT_v0.5.md
- specs/growth/RITUAL_XP_LOOP_SoT_v0.5.md
- specs/growth/AUTH_ACCESS_FUNNEL_SoT_v0.5.md

## 7) Optional
- specs/optional/HARMONY_ENGINE_SoT_v0.5.md

## 8) Archive
- specs/archive/ (legacy specs and superseded artifacts)

## 9) Missing (P0 backlog)
- UI_SEARCH_COMMAND_PALETTE_SoT_v0.5.md
- UI_NODE_EDGE_RENDERING_SoT_v0.5.md
- UI_SETTINGS_SCREEN_SoT_v0.5.md

## 10) What to implement for v0.5 (P0 checklist)
- Add missing SoT files listed in section 9.
- Add data patches if required and index them under `specs/data/sql/patches/`.
- Validate SoT ownership and update dates for each spec before feature work.
