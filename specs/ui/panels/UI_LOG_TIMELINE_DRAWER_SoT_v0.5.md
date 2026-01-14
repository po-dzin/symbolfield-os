Status: SoT
Version: v0.5
Owner: SymbolField
Last updated: 2026-01-05
Supersedes: UI_LOG_TIMELINE_DRAWER_SoT_v0.5_r1

# UI_LOG_TIMELINE_DRAWER_SoT_v0.5

---


## 0) Canon
Logs are a **secondary lens** over the graph:
- use them to review activity
- jump back into Field/NOW via addresses
- never replace the Field as the primary workspace

---

## 1) Drawer behavior
- Opens as a drawer (right or bottom) with a scrollable list
- Context-aware:
  - if a node is selected → show logs relevant to that node
  - else → show recent logs for the current Space
- Supports quick filtering

---

## 2) Minimal log entry (v0.5)
- timestamp
- type (`ritual_logged`, `node_created`, `edge_created`, ...)
- short label/title (derived)
- optional linked address (deep link)

Click on an entry:
- focuses the relevant node in Field, or opens NOW if needed

---

## 3) Filters (minimal)
- date range (today / 7d)
- type
- space scope (current / global) — optional

---

## 4) DoD (v0.5)
- Logs drawer opens fast and does not tank performance
- Log entry click resolves address reliably
- Filters are minimal but useful