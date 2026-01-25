Status: SoT
Version: v0.5
Owner: SF
Last updated: 2026-01-05
Supersedes: UI_PORTAL_HIGHLIGHTING_SoT_v0.5_r1.md

# UI_PORTAL_HIGHLIGHTING_SoT_v0.5_r1
**Status:** Source of Truth (SoT)  
**Scope:** SF v0.5 — Highlighting zones/addresses on Station (hover + typed search)

---

## 0) TL;DR
Highlighting = navigation "GPS".
Portal hover / selection in search bar → highlight target (Space/Hub/Node) on global overview.

Overlay-only: does not modify Graph.

---

## 1) Trigger sources
- Hover portal card
- Hover / keyboard preview in command palette results
- Active candidate in typed query (first/selected result)

---

## 2) 3 Layers of Highlighting (Canon)
1) Soft spotlight
2) Thin outline
3) Label tag (name + type)

Opt: Path hint (thin thread of direction).

---

## 3) By GraphAddress type
| Target | Highlight | Extra |
|---|---|---|
| Space | entire cluster + label | micro-zoom 2–4% without jump |
| Hub | cluster + bright hub | highlight core |
| Node | cluster + node point + label | preview card |
| Shared | like Space/Node + read-only badge | lock badge |

Preview card minimum: title, type badge, 1–2 lines snippet, primary action Enter/NOW.

---

## 4) Stability
- throttling updates
- "missing portal" badge if address is stale

---

## 5) Reduced motion
- spotlight + outline without shimmer/particles
- label fade-in

---

## 6) DoD v0.5
- [ ] Hover and keyboard preview highlight target without lag.
- [ ] Preview card appears only when useful.
