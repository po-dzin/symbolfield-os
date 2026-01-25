# TECH_DOCUMENT_BOUNDARIES_SoT_v0.5_r1
**Status:** SoT  
**Goal:** подготовить место под CRDT/синк без переписывания v0.5.

---

## 1) Документы в SF (v0.5)
### 1.1 SpaceGraphDoc (per Space)
- содержит: nodes/edges/positions/regions
- storage: Supabase (таблицы) + event log (audit)

### 1.2 NodeContentDoc (per Node)
- содержит: blocks/таблицы/медиа-ссылки (через EditorAdapter)
- storage: как компонент `doc.*` (snapshot) + позже отдельная таблица/doc-store

---

## 2) Почему так
- graph mutations и content mutations имеют разный темп, разные истории undo/redo и разные конфликты.
- CRDT проще включать на уровне документа (per node) чем на “весь граф сразу”.

---

## 3) Addressing & Portals
- Portal ведёт в GraphAddress (space/hub/node/region)
- Enter Space/Hub → открывает SpaceGraphDoc scoped view
- NOW(node) → открывает NodeContentDoc + local graph context

