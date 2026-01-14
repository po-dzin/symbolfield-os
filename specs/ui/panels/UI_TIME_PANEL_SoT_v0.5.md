Status: SoT
Version: v0.5
Owner: SymbolField
Last updated: 2026-01-05
Supersedes: UI_TIME_PANEL_SoT_v0.5_r1

# UI_TIME_PANEL_SoT_v0.5

---


## 0) Canon
Time in SF is a **meta layer**, not the main UI.

The Time Panel exists to:
- show “Today” context quickly
- provide lightweight navigation by date
- feed logging (rituals/sessions) without pulling the user out of Field

---

## 1) Placement
Time Panel is a **drawer** (collapsible), not a permanent column.

Entry points:
- Hotkey (e.g., `T`)
- Command palette (“Open Time Panel”)
- Optional icon in top bar

---

## 2) Core contents (v0.5)
- **Today summary**:
  - date
  - optional “state” indicator (if enabled)
  - quick “Log ritual” button
- **Mini timeline** (days):
  - last 7–14 days
  - click a day → open that day’s node/logs view (implementation choice)
- **Filters** (minimal):
  - ritual type
  - linked node (optional)

---

## 3) Constraints
- Do not show heavy analytics in v0.5.
- Do not require users to configure “state” on a permanent panel.

---

## 4) Actions & Events
- `open_time_panel`, `close_time_panel` (UI events)
- `navigate_to_day` (event with address snapshot)

---

## 5) DoD (v0.5)
- Time Panel can be opened/closed fast
- Today + last days are visible and clickable
- Logging entry is reachable in ≤2 actions