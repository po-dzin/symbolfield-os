# TECH_CORE_CONTRACTS_SoT_v0.5_r1
**Status:** Source of Truth (SoT)  
**Goal:** дать TS-скелет (контракты), не ломая продуктовую онтологию SF.

---

## 0) Принцип
**Strict contracts, flexible payloads.**  
Ядро типизировано жёстко; содержимое компонентов — гибко (`unknown` + runtime validation).

---

## 1) Identity (IDs)
- `NodeId`, `EdgeId`, `SpaceId`, `UserId`, `ComponentId`, `RegionId` = branded strings
- `TimestampMs = number`

> Branding: `type NodeId = string & { __brand: 'NodeId' }`

---

## 2) Graph Addressing (canonical)
Address = путь в цифровом мицелии (порталы → спейсы → хабы → ноды).

```ts
type GraphAddress =
  | { kind: 'space'; spaceId: SpaceId }
  | { kind: 'hub'; spaceId: SpaceId; hubNodeId: NodeId }
  | { kind: 'node'; spaceId: SpaceId; nodeId: NodeId }
  | { kind: 'region'; spaceId: SpaceId; regionId: RegionId };
```

---

## 3) Core Entities (shape)
### 3.1 NodeCore (immutable-ish contract)
```ts
type NodeCore = {
  id: NodeId;
  spaceId: SpaceId;
  title: string;
  createdAt: TimestampMs;
  updatedAt: TimestampMs;

  // визуальный ключ (икон-пикер)
  keySlot?: { kind: 'glyph'|'emoji'|'icon'|'upload'; value: string; meta?: Record<string, unknown> };

  // компонентная начинка (ECS)
  components: ComponentRef[];
};
```

### 3.2 ComponentRef (flex payload)
```ts
type ComponentRef = {
  id: ComponentId;
  kind: string;              // e.g. 'doc.blocksuite', 'ritual.log', 'xp', 'media.image'
  props: unknown;            // runtime-validated per kind
  schemaVersion?: number;
};
```

### 3.3 EdgeCore
```ts
type EdgeCore = {
  id: EdgeId;
  spaceId: SpaceId;
  from: NodeId;
  to: NodeId;
  kind?: string;             // semantic relation (optional in v0.5)
  meta?: Record<string, unknown>;
  createdAt: TimestampMs;
};
```

### 3.4 RegionCore (overlay-ish but persisted)
```ts
type RegionCore = {
  id: RegionId;
  spaceId: SpaceId;
  rect: { x:number; y:number; w:number; h:number }; // world coords
  name?: string;
  color?: string;
  note?: string;
};
```

---

## 4) Mutations
### 4.1 Actions (undoable)
Action = intentful state change (то, что откатывается).
```ts
type Action =
  | { type:'node.create'; payload:{ spaceId:SpaceId; node:NodeCore } }
  | { type:'node.update'; payload:{ spaceId:SpaceId; nodeId:NodeId; patch:Partial<NodeCore> } }
  | { type:'node.move';   payload:{ spaceId:SpaceId; nodeId:NodeId; pos:{x:number;y:number} } }
  | { type:'edge.create'; payload:{ spaceId:SpaceId; edge:EdgeCore } }
  | { type:'edge.delete'; payload:{ spaceId:SpaceId; edgeId:EdgeId } }
  | { type:'node.keyslot.set'; payload:{ spaceId:SpaceId; nodeId:NodeId; keySlot:NodeCore['keySlot'] } }
  | { type:'node.keyslot.clear'; payload:{ spaceId:SpaceId; nodeId:NodeId } }
  | { type:'hub.group'; payload:{ spaceId:SpaceId; nodeIds:NodeId[]; hubNodeId:NodeId } }
  | { type:'region.create'; payload:{ spaceId:SpaceId; region:RegionCore } }
  | { type:'region.update'; payload:{ spaceId:SpaceId; regionId:RegionId; patch:Partial<RegionCore> } }
  | { type:'trash.soft_delete'; payload:{ spaceId:SpaceId; nodeIds:NodeId[] } }
  | { type:'trash.restore'; payload:{ spaceId:SpaceId; nodeIds:NodeId[] } };
```

### 4.2 Events (audit/telemetry, НЕ откатываются)
Event = факт (журнал).
```ts
type SfEvent =
  | { type:'now.enter'; at:TimestampMs; payload:{ address:GraphAddress } }
  | { type:'now.exit';  at:TimestampMs; payload:{ address:GraphAddress } }
  | { type:'context_menu.open'; at:TimestampMs; payload:{ nodeId:NodeId } }
  | { type:'icon.selected'; at:TimestampMs; payload:{ nodeId:NodeId; kind:string } }
  | { type:'ritual.logged'; at:TimestampMs; payload:{ ... } }
  | { type:'xp.awarded';    at:TimestampMs; payload:{ ... } };
```

---

## 5) Patches & Versioning
- GraphSnapshot: сериализуемый снапшот пространства (`nodes`, `edges`, `regions`, `positions`)
- NodeDocSnapshot: сериализуемый снапшот контент-дока (через EditorAdapter)
- `schemaVersion` на snapshot + migrations

---

## 6) Runtime validation
- `props: unknown` валидируется по `kind` через `zod` (или собственный validator registry)
- Не валидируем всё везде; валидируем на границах: load/save/network.

