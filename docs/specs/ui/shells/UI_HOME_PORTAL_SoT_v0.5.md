Status: SoT
Version: v0.5
Owner: SF
Last updated: 2026-01-05
Supersedes: UI_HOME_PORTAL_SoT_v0.5_r1.md

# UI_HOME_PORTAL_SoT_v0.5
*(a.k.a. “Temple” as a UI skin/preset label)*
**Status:** Source of Truth (SoT)  
**Scope:** SF UI v0.5 — Home Portal Page (Portal Station + Widget Surface)  
**Canon:** Home is a “station” for diving into Portals and can host optional widgets.

---

## 1) Purpose
## 1.1 Ontology (v0.5)
SF is a nested “digital mycelium”:

- **ArcheCore (Global Graph)** is the root context anchored on the **ArcheCore** node.
- **Space** is an inside-view of a Node (subgraph) in the ArcheCore.
- **Hub** is a Node that contains a local subgraph (enterable container).
- **Node** is an element (with its own inner structure/notes).
- Any node can become a Space or Hub via its local subgraph.
- **Portal** is a **door** that can point to any Space/Hub/Node (deep dive).

Station is the place users return to:
- to **dive** into any Space / Hub / Node
- to **resume** recent work quickly
- to **create** a new Space from templates
- to optionally see **widgets** (game/progress/analytics) without overwhelming navigation

---

## 2) Top-level structure (IA)
Station is organized as two layers:

1) **Portal Station (always)**
- Search / Dive (“Where to begin?”)
- Portals (to any Space/Hub/Node)
- Templates
- Recents live in a **drawer** (not the main layout)

2) **Widget Surface (optional)**
- Configurable widget slots (analytics/game/progress)
- Each widget is a module view; can be hidden

---

## 3) Layout zones (suggested)
### 3.1 Top Bar
- Logo (always returns **Home/Temple** from anywhere)
- Global Search / Dive input (primary)
- Profile entry (avatar/name) → Profile page
- Settings entry (optional shortcut)

### 3.2 Start Gates (“Where to begin?”)
- Input supports: portal search + quick actions
- Quick actions: `New Space`, `New Portal`, `Import` *(optional)*

### 3.2a Global Graph Overview (Hero)
- 2D overview of the **entire graph** (Space/Hub/Node) with LOD
- Read-only: hover highlight + click portal → transition
- Central **ArcheCore** emblem as anchor

### 3.3 Templates Row
- Template cards
- Create from template

### 3.4 Recents (Drawer)
- Recent Spaces / Hubs / Nodes
- “Continue” (resume last context)

### 3.5 Portals
Portals list supports:
- list / grid toggle
- nested display via saved portals (optional)
- minimal metadata: last opened, owner/shared badge

### 3.6 Widget Surface (slot grid)
- Fixed number of slots (recommended 4–8)
- Widgets can be rearranged or hidden
- Widgets must not block portal navigation

---

## 4) Entities shown on Station
Station can list and dive to **any addressable subgraph** in the user’s global mycelium:

- **Portal** (a *door* / dive shortcut) → can target **Space / Hub / Node**
- **Space** — inside-view of a Node (subgraph) in the ArcheCore
- **Hub** — a Node that contains a local subgraph (enterable container)
- **Node** — element of a Space.

- **Template** — seed to create a new Space (optional)

### 4.1 Portal item minimal fields
- title
- targetAddress: `{ids...}`
- parent space (optional)
- last opened

## 5) Core actions (v0.5)
**Navigation**
- Open Space
- Open Node Note (default)
- Open Node NOW (explicit)
- Go to Profile

**Creation**
- Create Space
- Create from Template

**Organization**
- Rename (via Station context menu)
- Soft delete (30d trash)
- Remove from recents (optional)

**Widgets**
- Add widget (from catalog)
- Hide widget
- Rearrange widgets

---

## 6) Profile page (Home-linked)
Home provides a direct entry to Profile (top bar), where user can see:
- account settings
- personal preferences (presets)
- optional stats overview

*(Profile itself can be a separate SoT doc later; Home just links to it.)*

---

## 7) Events (Actions & Events model)
### 7.1 UIEvents
- `StationOpened`
- `StationSectionToggled(section)`
- `WidgetAdded(widgetId)`
- `WidgetHidden(widgetId)`
- `WidgetReordered(widgetId, slot)`

### 7.2 DomainEvents (commit)
- `SpaceCreated(spaceId, fromTemplate?)`
- `SpaceRenamed(spaceId, title)`
- `SpaceDeleted(spaceId)` (soft delete, 30d trash)
- `RecentCleared(targetId)` *(optional)*

### 7.3 Navigation events
- `SpaceOpened(spaceId)`
- `NowOpened(spaceId, nodeId)`
- `ProfileOpened`

---

## 8) DoD — Home Portal v0.5
- [ ] Logo returns Home Portal from Space/NOW
- [ ] Search/Dive opens any Space/Hub/Node quickly via portals
- [ ] Recents work and restore context
- [ ] Templates can spawn a new Space
- [ ] Widget Surface exists with slot limits and is optional
- [ ] Profile entry exists from Home

Visual reference: `docs/specs/product/sf_os_unified_roadmap_doc_seed.md` (Station / Director Panel).
