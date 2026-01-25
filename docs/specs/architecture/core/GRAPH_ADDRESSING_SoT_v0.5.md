Status: SoT
Version: v0.5
Owner: SymbolField
Last updated: 2026-01-05
Supersedes: GRAPH_ADDRESSING_SoT_v0.5 (pre-EN normalization)

# GRAPH_ADDRESSING_SoT_v0.5

---


## 0) Canon
SF is a nested **digital mycelium**:

**Global Graph (ArcheCore) → Space (node subgraph) → Hub (node subgraph) → Node (recursive)**

A **Portal** can target any address in this hierarchy:
- a Space (open Field of that subgraph)
- a Hub (open Field scoped to that Hub’s local subgraph)
- a Node (open Note by default, NOW explicitly)

---

## 1) Address model (v0.5)
### 1.1 Address shape
An address must be:
- stable (shareable deep link)
- serializable (JSON)
- resolvable (server + client)

**Canonical fields**
- `spaceId` (required)
- `scope` (optional): `{ hubId?: string }`  // field can be scoped to hub-local subgraph
- `target` (optional): `{ nodeId?: string, mode?: "field" | "note" | "now" }`
- `camera` (optional): `{ x:number, y:number, z:number }` OR `{ rect, padding }`
- `selection` (optional): `{ nodeIds?: string[], edgeIds?: string[] }`

### 1.2 Examples
**Open Space Field**
```json
{"spaceId":"S1","target":{"mode":"field"}}
```

**Open Hub-local Field**
```json
{"spaceId":"S1","scope":{"hubId":"H7"}, "target":{"mode":"field"}}
```

**Open Node in NOW**
```json
{"spaceId":"S1","target":{"nodeId":"N42","mode":"now"}}
```

**Open Node in Note**
```json
{"spaceId":"S1","target":{"nodeId":"N42","mode":"note"}}
```

---

## 2) Resolution rules
1) Resolve `spaceId` → load Space graph.
2) If `scope.hubId` exists → set Field scope to that hub’s local subgraph.
3) If `target.nodeId` exists:
   - `mode:"now"` → open NOW editor for the node
   - `mode:"note"` → open Note view for the node
   - else → focus node in Field (camera + selection)
4) Apply `camera` and `selection` if present.

---

## 3) Shareability (v0.5 baseline)
- **Public share** is only allowed for explicitly shared Spaces/Hubs (see SHARE_SUBGRAPH spec).
- Address can be used internally (user) even if not shareable publicly.
- When exporting share links, include a **share token** and the address payload.

---

## 4) Events (audit)
Emit (non-undoable audit):
- `portal_entered` (with address snapshot)
- `address_resolved`
- `address_failed` (with reason)

---

## 5) DoD (v0.5)
- Address JSON can open Space Field, Hub-scoped Field, Node NOW.
- Address resolution is deterministic and does not depend on UI layout.
- Address snapshots are stored in EventLog for navigation audit.
