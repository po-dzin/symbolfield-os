# SF v0.2 — Areas (SoT)

1. **Areas** (официальный термин; допускаются синонимы zone/region в UI) — *объекты холста*.

Термины (канон):

- **Node** — смысловая сущность/спейс.
- **Edge** — связь.
- **Cluster** — группировка нод.
- **Area** — область холста (объект field), может быть прямоугольной или радиальной; может быть привязана к ноде.

---

# A) Areas — Source of Truth

## A1. Зачем Areas

Areas решают 3 задачи:

1. **Категоризация пространства** (обрамить тему/сцену).
2. **Локальный фокус** (Enter/Focus area → масштаб/приглушение остального).
3. **Область влияния** (radial areas, привязанные к нодам).

Areas **не заменяют** Cluster:

- Cluster = *структурная группа нод*.
- Area = *пространственный слой/контекст*.

---

## A2. Entity / Data Model

### A2.1 Минимальная структура

```ts
type AreaId = string
type NodeId = string

type AreaShape = 'rect' | 'circle'

type AreaAnchor =
  | { type: 'canvas' }
  | {
      type: 'node'
      nodeId: NodeId
      attach: 'center'
      offset?: { dx: number; dy: number }
      follow: 'position'
    }

type AreaRing = {
  id: string
  r: number            // радиус кольца (для circle)
  opacityMul?: number  // 0..1 (множитель от base opacity)
  border?: { width: number; style: 'solid'|'dashed' }
}

type Area = {
  id: AreaId
  title?: string

  shape: AreaShape

  // geometry in world coords
  rect?: { x: number; y: number; w: number; h: number }
  circle?: { cx?: number; cy?: number; r: number } // cx/cy опциональны при anchor=node

  anchor: AreaAnchor

  // style
  color: string
  opacity: number       // 0..1
  border: { width: number; style: 'solid'|'dashed' }
  zIndex: number

  // behavior
  locked: boolean
  hitbox: 'border' | 'fill' // v0: рекомендуем 'border'

  // semantics
  purpose?: 'highlight' | 'clusterFrame' | 'influence'
  clusterId?: string

  // radial-only
  rings?: AreaRing[]
}
```

### A2.2 Ключевые правила

- **Area всегда хранится отдельно от Node/Edge** (canvas object).
- **Anchor** определяет поведение центра:
  - `canvas` → Area свободно двигается.
  - `node` → центр следует за нодой; перемещение центра отключено, разрешён resize.
- **Multiple rings** допустимы только для `shape='circle'`.

---

## A3. Rendering / Z-order

### A3.1 Слой

- Areas рендерятся **под нодами и ребрами** (если так задумано визуально), но при этом должны быть **выбираемыми**.
- Рекомендуемый порядок:
  1. background grid
  2. areas (по `zIndex`)
  3. edges
  4. nodes
  5. overlays (selection, handles, HUD)

### A3.2 Z-order операции

Команды для выбранной Area:

- `Bring Forward`
- `Send Backward`
- `Bring to Front`
- `Send to Back`

Изменяют `zIndex` локально внутри списка areas.

---

## A4. Interaction Model

### A4.1 Tools

- Pointer **(P)**
- Link **(L)**
- Area **(A)**
- Settings **(⚙)**

### A4.2 Создание Area

**Area Tool (A):**

- Drag на холсте → создаёт Area.
- В UI у инструмента (параллельная мини-панель) выбирается `shape`:
  - Rect
  - Circle

_Backlog (не делаем сейчас): Ellipse, Hexagon и прочая «сложная геометрия» — вернёмся, когда будем готовы к более тяжёлой математике пространства._

**Circle:**

- Drag: центр = точка начала, радиус = длина drag.

### A4.3 Выделение Area без мешания нодам

Цель: Area не мешает выбору нод, но остаётся управляемой.

**Рекомендуемый канон v0:**

- В Pointer режиме:
  - клики по **fill** Area *пробивают* к нодам (не перехватывают).
  - Area выбирается по **border hitbox** (увеличенный невидимый хитбокс рамки).
- В Area Tool режиме:
  - клик по Area выбирает Area (можно и по fill).

Параметр: `hitbox='border'` по умолчанию.

### A4.4 Move / Resize

- Rect:
  - move drag внутри рамки (если не locked)
  - resize handles по углам/сторонам
- Circle:
  - move drag центра (только если anchor=canvas)
  - resize handle на окружности (radius)
- Anchored circle (anchor=node):
  - move центра **запрещён**, разрешён только resize радиуса.

### A4.5 Fit to selection (Nodes → Area)

Команда: `Fit Area to Selected Nodes`

- вычислить bbox по позициям выбранных нод
- применить padding (константа или настройка)
- создать новую rect-area или обновить активную rect-area

### A4.6 Snap to nodes (для Area)

При move/resize Area рамка “липнет” к:

- центрам нод
- bbox выделения
- краям bbox (опционально)

Snap к grid — **глобальная политика поля** (см. Settings).

---

## A5. Focus / Enter Area

Фича: **Enter Area** (локальный фокус без отдельного субграфа).

- Trigger:
  - double-click по Area
  - или `Enter` при выбранной Area
- Действие:
  - камера делает `zoom-to-bounds(area)`
  - всё вне bounds приглушается (dim outside)
- Exit:
  - `Esc` возвращает к предыдущему виду

---

## A6. Multiple Rings (radial)

### A6.1 Назначение

Отображение “слоёв влияния” (inner/mid/outer) для anchored circle.

### A6.2 Мини-UX

- У выбранной circle-area:
  - `Add ring`
  - `Remove ring`
- У каждого кольца:
  - resize handle на окружности (меняет `r`)

### A6.3 Пресеты (опционально, но полезно)

- `3 Rings preset`: создаёт три кольца с шагом Δr.

---

## A7. Context Menu (Area)

RMB по Area:

- Rename
- Style
  - Color
  - Opacity
  - Border
  - BG
- Fit to selection (если есть selected nodes)
- Focus
- Lock
- Delete
+ Action menu (3dots in context menu): 
- Z-order (4 команды)

---

## A8. Acceptance Criteria (v0.2)

1. Area хранится как отдельная сущность (`areas[]`).
2. Rect & Circle создаются через Area tool.
3. Z-order работает и визуально заметен при пересечениях.
4. Fit to selection создаёт/обновляет rect-area по bbox selected nodes.
5. Snap to nodes работает для move/resize area.
6. Focus/Enter Area: zoom-to-bounds + dim outside + Esc back.
7. Circle-area может быть anchored к node; центр следует за нодой.
8. Multiple rings для circle реализованы (add/remove/resize).