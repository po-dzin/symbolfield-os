Status: SoT
Version: v0.5
Owner: SF
Last updated: 2026-01-05
Supersedes: UI_RECENT_PORTALS_TEMPLATES_SoT_v0.5_r1.md

# UI_RECENT_PORTALS_TEMPLATES_SoT_v0.5_r1
**Status:** Source of Truth (SoT)  
**Scope:** SF v0.5 — Recent Portals + Templates on Station

---

## 0) TL;DR
Station shows:
- **Recent Portals** = history behavior of GraphAddress (Space/Hub/Node + view)
- **Templates** = starter Space-templates (and system Playground)
Recents are surfaced via a **drawer** (not the main Station layout).

---

## 1) Recent Portals
Record:
- target_address
- default_view: field|note|now
- action: enter|note|now
- last_used_at

Types: Space, Hub, Node Note, Node NOW, Shared(read-only).

UI item: title, type badge, last used, primary action Enter/NOW.
Hover item → highlight target on global graph.

---

## 2) Templates (v0.5)
Template types:
- Space template (primary)
- Playground (system)

Minimum set:
- Blank Space
- Project Space
- Ritual Space
- Research Space
- Playground

UI tile: name, 1-line description, mini preview icon, Create.

---

## 3) Storage (v0.5 minimal)
Recent portals:
- user_prefs.metadata.recent_portals[] or table recent_portals(user_id,...)

Templates:
- hardcoded in v0.5 allowed, better table later.

---

## 4) DoD v0.5
- [ ] Recent Portals support Space/Hub/Node.
- [ ] Hover highlights target.
- [ ] Create template creates Space and leads to Enter (Field).
