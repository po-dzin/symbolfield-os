# UI_NODE_CONTEXT_MENU_SoT_v0.5_r1
**Status:** Source of Truth (SoT)  
**Scope:** SF v0.5 — Node Context Menu (single + multi-select)

---

## 0) TL;DR
Context Menu — главный “скрытый пульт” действий по нодам:
- минимальный UI по умолчанию,
- **progressive disclosure** вместо постоянного тяжёлого properties окна,
- список действий зависит от **типа ноды** и **прав доступа**,
- интеграция с Icon Picker (`Set icon…`).

---

## 1) Принципы
## 7) Context Menu ноды (детально)

### 7.1 Общие принципы

- Правый клик по ноде / по заголовку.
- Пункты зависят от типа ноды и прав.
- Группы разделены divider’ами.
- На каждый пункт — горячая клавиша (если есть).

---

## 2) Группы пунктов меню (v0.5)
Пункты разбиты на группы, разделены divider’ами.

### A) Быстрые действия
- Open (Enter / Double click)
- Rename (`F2`)
- Set icon… (`I`) → открывает Icon Picker
- Open NOW (optional)
- Copy link/address (GraphAddress) (optional)

### B) Создание/структура
- Add child node
- Add sibling node
- Create link… (или включить Link mode `L`)
- Group selection into Hub (`Shift+Enter`) — только при multi-select

### C) Компоненты (ECS)
- Add component… (может быть disabled, если ECS ещё не включён в v0.5 UI)
- Remove component…
- Edit component props…

### D) Morph / Change type
- Morph node type… (Regular ↔ Hub where allowed)

### E) Copy / Duplicate / Export
- Duplicate (optional hotkey)
- Copy content
- Export (markdown/json) — optional

### F) Arrange / View
- Collapse/Expand (только Hub)
- Focus / Center camera on node
- Pin / Unpin (optional)

### G) Undo/Redo
- Undo (`Cmd/Ctrl+Z`)
- Redo (`Cmd/Ctrl+Shift+Z` / `Ctrl+Y`)

### H) Destructive (Trash)
- Move to Trash (soft delete)
- Restore (в Trash view)
- Delete permanently (hard delete) — owner-only, confirm

---

## 3) Multi-select (если выделено 2+ ноды)
- Group into Hub (`Shift+Enter`)
- Batch move to Trash
- Batch link (chain/star/complete) — optional

---

## 4) Варианты по типу (канон)
### 7.3 Контекстные варианты по типу

| Пункт          | Core                                | Hub | Regular               |
| -------------- | ----------------------------------- | --- | --------------------- |
| Set icon       | ✅                                   | ✅   | ✅                     |
| Collapse       | ❌                                   | ✅   | ❌                     |
| Group into Hub | ❌                                   | ❌   | ✅ (если multi-select) |
| Morph          | ограничено                          | ✅   | ✅                     |
| Delete         | ограничено (если единственный core) | ✅   | ✅                     |

---

---

## 5) Права доступа (v0.5)
- Hard delete: только owner(s), только из Trash, с подтверждением.
- Core node:
  - нельзя удалить единственный Core
  - morph Core ограничен

---

## 6) Actions/Events
Menu items вызывают **Actions** (undoable): rename, set/clear keySlot, create node/link, group hub, delete/restore.
И пишут **Events** (audit/telemetry): `context_menu_opened`, `context_menu_action_selected`, `icon_selected`, …

---

## 7) Acceptance Criteria (v0.5)
- [ ] ПКМ по ноде открывает меню.
- [ ] Меню зависит от Core/Hub/Regular и selection (single/multi).
- [ ] `I` открывает Icon Picker.
- [ ] Trash flow: soft delete → restore/hard delete (owner-only).
- [ ] Ключевые операции undoable.
