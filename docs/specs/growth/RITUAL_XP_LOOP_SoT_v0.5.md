Status: SoT
Version: v0.5
Owner: SF
Last updated: 2026-01-05
Supersedes: RITUAL_XP_LOOP_SoT_v0.5_r1.md

# RITUAL_XP_LOOP_SoT_v0.5_r1
**Status:** Source of Truth (SoT)  
**Scope:** SF v0.5 — ritual logging → XP ledger → UI surfaces  
**Canon:** Actions & Events. Ritual is an entry (data) that produces XP deltas (ledger).

---

## 0) Goal
Enable in v0.5:
- 10-second ritual logging
- XP deltas computed consistently
- A simple “today + totals” surface (StateCore / Time Panel widget)
- Auditable history (ledger + EventLog)

Non-goal v0.5: complex skill trees, streak gamification beyond basics.

---

## 1) Entities
### 1.1 RitualEntry
Represents a performed session.
Minimum fields:
- `user_id`, `space_id?`, `started_at`, `duration_min`
- `ritual_type` (string key)
- `note` (optional)
- `linked_node_ids[]` (optional)

### 1.2 XPLedgerEntry
Immutable delta entries:
- `axis` in `{HP, EP, MP, SP, QNP}`
- `delta` numeric
- `reason` (e.g., "ritual")
- `source_id` (ritual_entry_id)
- `ts`

Ledger is the source of truth for totals.

---

## 2) XP axes mapping (v0.5)
| Axis | Meaning | Examples |
|---|---|---|
| **HP** 🪨 | somatic presence | movement, strength, mobility |
| **EP** 💧 | expressive energy | voice, music, art, writing |
| **MP** 🔥 | mind/system building | research, code, architecture |
| **SP** 🌬 | stillness/regulation | breathwork, meditation |
| **QNP** 🌈/🕳 | threshold/reset/meta | rare, manual for v0.5 |

---

## 3) Ritual types (minimum set)
Ritual types are string keys (extensible):
- `meditation`
- `breathwork`
- `somatic_flow`
- `workout_hiit`
- `deep_work`
- `creative_jam`

---

## 4) XP calculation (v0.5 deterministic)
### 4.1 Default rule
**XP = duration_min × rate** per ritual type.

Default rates (editable in DB table `ritual_xp_rates`):
- meditation → SP: 1.0 / min
- breathwork → SP: 1.0 / min
- somatic_flow → HP: 1.0 / min
- workout_hiit → HP: 1.2 / min
- deep_work → MP: 1.0 / min
- creative_jam → EP: 1.0 / min

### 4.2 Override rule
RitualEntry may include:
- `xp_override_axis`
- `xp_override_delta`

Used for QNP or custom calibration.

---

## 5) UI surfaces (v0.5)
- **StateCore (optional):** small XP tick (today) + quick ritual buttons.
- **Time Panel (DAY lens):** daily rituals list + daily XP totals.
- **(Optional) Logs:** ritual feed + filters.

---

## 6) Events (persisted)
When a ritual is logged:
- EventLogEntry: `RitualLogged`
- Ledger entries created: `XPLedgerEntryCreated` (can be implicit via inserts)

---

## 7) DoD — v0.5
- [ ] Log ritual in ≤10 seconds.
- [ ] XP ledger deltas created on ritual insert (or by server action).
- [ ] Daily XP totals can be queried fast.
- [ ] Rituals can link to nodes (at least array of uuids).
- [ ] All changes auditable (EventLogEntry).
