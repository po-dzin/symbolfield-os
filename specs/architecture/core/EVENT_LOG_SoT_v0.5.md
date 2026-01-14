Status: SoT
Version: v0.5
Owner: SymbolField
Last updated: 2026-01-05
Supersedes: EVENT_LOG_SoT_v0.5_r1

# EVENT_LOG_SoT_v0.5

---


## 0) Canon
We keep **Actions & Events** terminology.

- **Action**: an intentful, state-changing operation (often undoable).
- **Event**: an append-only audit/telemetry fact (not undone).

Semantically, this is close to “commands + events”, but we avoid the word *command* for product clarity.

---

## 1) Why EventLog exists
- Debugging: “what happened?”
- Analytics: basic usage metrics
- Safety: audit trail for destructive operations
- Navigation: store address snapshots for deep links

---

## 2) Core entity: EventLogEntry
Minimal fields (aligns with SQL patch):
- `id` (uuid)
- `ts` (timestamp)
- `user_id`
- `space_id` (nullable)
- `address` (jsonb, nullable) — snapshot for navigation context
- `action_type` (text) — name of action/event
- `entity_kind` (text, nullable) — e.g. "node" | "edge" | "space" | "hub"
- `entity_id` (uuid, nullable)
- `payload` (jsonb) — free-form details
- `undo` (jsonb, nullable) — optional inverse payload for Actions
- `meta` (jsonb, nullable) — device/session/build/version

---

## 3) Action vs Event rules
### 3.1 Actions (typical undoable)
Examples:
- `create_node`, `update_node`, `move_node`
- `connect_nodes`, `delete_edge`
- `group_to_hub`, `set_icon`
- `create_region`, `update_region`

**Undo storage**
- store minimal inverse data in `undo` (or reference to an Undo stack)
- do not store huge snapshots unless necessary

### 3.2 Events (audit, not undone)
Examples:
- `portal_entered`, `address_resolved`
- `now_opened`, `now_closed`
- `playground_reset`, `onboarding_completed`

---

## 4) Write policy
- EventLog is **append-only**.
- The UI should never depend on reading EventLog for core behavior (it is not the source of truth for state).
- EventLog may be used for “recent activity” views and debugging tools.

---

## 5) Security / RLS (baseline)
- User can read/write only their own entries.
- Shared spaces: writing entries still belongs to the acting user; reading is constrained by access rules.

---

## 6) DoD (v0.5)
- Every core action emits an Action entry.
- Key navigation emits an Event entry with `address` snapshot.
- EventLog stays non-blocking (failures must not break core UX).