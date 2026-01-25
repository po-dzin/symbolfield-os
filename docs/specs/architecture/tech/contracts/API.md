# SymbolField Internal API & Data Schemas v0.5

## JSON Schema (v0.5.0)

### 1. Space (Root Object)
Represents a sub-graph or the entire world state for export.

```json
{
  "schema_version": "0.5.0",
  "id": "uuid-v4",
  "title": "My World",
  "nodes": [ ... ],
  "links": [ ... ],
  "events": [ ... ],
  "state_history": [ ... ]
}
```

### 2. Node
```json
{
  "id": "uuid-v4",
  "space_id": "uuid-v4",
  "label": "My Idea",
  "components": ["view:crystal", "logic:ego"],
  "tags": ["#vision"],
  "metadata": { ... },
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

### 3. Link
```json
{
  "id": "uuid-v4",
  "from_node_id": "node-uuid",
  "to_node_id": "node-uuid",
  "kind": "link | portal | archive",
  "weight": 1.0,
  "metadata": { ... }
}
```

### 4. EventLog Entry
```json
{
  "id": "uuid-v4",
  "timestamp": "ISO8601",
  "type": "NODE_CREATED | STATE_CHANGE | RITUAL_LOG | ...",
  "payload": { ... }
}
```

### 5. XP Ledger Entry
```json
{
  "id": "uuid-v4",
  "timestamp": "ISO8601",
  "axis": "HP | EP | MP | SP",
  "amount": 10,
  "reason": "Ritual complete: Meditation"
}
```

---

## Core API Methods (Draft)

These methods are exposed by `src/core` engines.

### Graph
- `graph.addNode(data)` -> `NodeEntity`
- `graph.removeNode(id)` -> `boolean`
- `graph.connect(sourceId, targetId, relation)` -> `EdgeEntity`
- `graph.getNeighborhood(nodeId, radius)` -> `GraphSubgraph`

### State
- `state.setMode(mode: 'deep'|'flow'|'luma')`
- `state.setContext(contextId)`
- `state.pushHistory()`

### Time
- `time.setAnchor(date)`
- `time.getRange()` -> `[start, end]`
