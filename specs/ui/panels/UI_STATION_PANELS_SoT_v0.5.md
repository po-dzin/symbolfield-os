Status: SoT
Version: v0.5
Owner: SF
Last updated: 2026-01-05
Supersedes: UI_STATION_PANELS_SoT_v0.5_r1.md

# UI_STATION_PANELS_SoT_v0.5_r1
**Status:** Source of Truth (SoT)  
**Scope:** SF v0.5 — Station (Portal Page): basic UI panels/zones without extra tabs

---

## 0) TL;DR
**Station** — the starting "station/portal room" which:
- shows **global graph** in general view (read-only sculpture, 2D),
- provides **portals** to any GraphAddress (Space / Hub / Node),
- stores **recent portals** and **templates** (recents as drawer, not the main layout),
- allows quick "Enter" into Space Field or "NOW" into Node view.

---

## 1) Ontology Canon (UI)
- **Portal = door** → GraphAddress (Space/Hub/Node + view)
- **Enter = Space/Field**
- **NOW = deep view of a node**
- Station = entry point / scale switching point, not a working plane.

---

## 2) Layout (Station Zones)
### 2.1 Top Bar (always)
Components:
- Logo (click → Station)
- Global Search / Command Palette (`Cmd/Ctrl+K`)
- Create (“+”): New Space / New Node / Import (minimum)
- Profile pill → Profile/Settings

Rule: no "modes" here. Modes belong to Field/NOW context.

### 2.2 Left Rail (compact)
Sections (v0.5):
1) Pinned Spaces
2) Recent Spaces
3) Templates
4) Playground

Important: this is not a tab bar. It is a list of portals.

### 2.3 Main Hero: Global Graph Overview (read-only)
Purpose: feeling of "my digital mycelium" + portal highlights.
Allowed: hover highlight, light pan/zoom, click portal → transition.
Forbidden: editing/drag of objects.
Visual anchor: **ArcheCore emblem** at center; clusters orbit/arrange around it.

### 2.4 Right Widget Stack
Minimum:
- Start row: Continue / Open Playground / Create Space
- Recent Portals (addresses)
- Templates
- (opt.) Onboarding progress (dismissable)
- (opt.) Activity highlights (light)

### 2.5 Bottom / Status Strip (opt.)
sync status, reduced motion shortcut, build/version (dev-only).

---

## 3) Portals on Station
Types:
- Portal → Space Field (Enter)
- Portal → Hub in Space (Enter)
- Portal → Node Note (Enter)
- Portal → Node NOW (NOW)
- Portal → Shared view (read-only)

Hover:
- highlight target on Global Graph
- label + mini-preview card
- no opening

Context actions (v0.5):
- **Rename Space** and **Delete Space** from a Station portal context menu.
- Delete = **soft delete** with **trash retention 30 days**.

---

## 4) Visibility (not to disturb)
- Station by default does not show StateCore/thin system UI
- User prefs → Station Widgets: off/min/full

---

## 5) Events/Actions (v0.5)
- StationOpened
- PortalHovered {target_address}
- PortalActivated {target_address, action: enter|now}
- TemplateSelected {template_key}
- SpaceCreated (if create from station)
 - SpaceRenamed
 - SpaceDeleted (soft delete)

---

## 6) DoD v0.5
- [ ] Logo/command always returns to Station.
- [ ] Top/Left/Main/Right (and opt. Bottom) exist.
- [ ] Global Graph read-only and reacts to portal hover.
- [ ] Recent Portals = addresses (Space/Hub/Node), not just spaces.

Visual reference: `specs/product/sf_os_unified_roadmap_doc_seed.md` (Station / Director Panel).
