# TECH_EDITOR_ADAPTER_SoT_v0.5_r1
**Status:** SoT  
**Goal:** подключить BlockSuite (или другой движок) как модуль, не вплетая его в граф.

BlockSuite описывает editor как doc-centric систему (Store/Model/View/Action) и использует CRDT (Yjs) в data layer. citeturn0search0turn0search5

---

## 0) Boundary
- Graph = отдельный runtime (Space Field)
- Content Doc = отдельный документ (per Node)
- Связь: Node имеет компонент `doc.*` (например `doc.blocksuite`)

---

## 1) EditorAdapter v1 (interface)
```ts
type DocId = string & { __brand:'DocId' };

interface EditorAdapter {
  kind: string; // 'blocksuite'
  create(docId: DocId, initial?: unknown): Promise<void>;
  load(docId: DocId, snapshot: unknown): Promise<void>;

  // snapshot/serialization
  getSnapshot(docId: DocId): Promise<unknown>;
  applyPatch(docId: DocId, patch: unknown): Promise<void>;

  // events
  onChange(docId: DocId, cb: (change: { patch?: unknown; at:number }) => void): () => void;

  // UX helpers
  focus(docId: DocId, target: { blockId?: string; anchor?: string }): void;
  export(docId: DocId, format: 'markdown'|'html'|'json'): Promise<string>;
}
```

---

## 2) Minimal integration in SF v0.5
- Node Component: `{ kind:'doc.blocksuite', props:{ docId, snapshot? } }`
- NOW editor:
  - mount adapter editor in center (blocks)
  - right panel = SF Local Graph (не часть editor)
- Save rule:
  - при close NOW → flush snapshot в компонент (или incremental patches in background)

---

## 3) Future (not v0.5)
- realtime collaboration: включить CRDT storage + sync (doc-level)
- time-travel: “history” по doc snapshots/ops
- embed: ссылки на NodeId внутри doc (backlinks)

