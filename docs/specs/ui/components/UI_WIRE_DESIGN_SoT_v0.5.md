# Wire Design SoT v0.5

## 0) Purpose
Зафиксировать **wire design** (связи как «провода»):
- как в SF сочетаются **смысл (EdgeType)** и **визуальная кастомизация (style/route/intersections)**
- где это редактируется (mini-toolbar vs wire-mode)
- какие изменения **влияют на взаимоотношения объектов** (семантика), а какие — чисто на визуал

> Канон: **edge = relation(type) + route + expression(style) + trace(signal)**

---

## 1) Логика ↔ геометрия (про «операторы над объектами/множествами»)
SF живёт на пересечении:
- **логики отношений** (что означает связь)
- **геометрии карты** (как это ощущается и читается)

### 1.1 Ментальная модель
- **Nodes** = элементы/объекты (можно мыслить как элементы множества).
- **Areas** = множества/контексты (геометрическое множество на карте).
- **Edges** = логические операторы/отношения между объектами.

### 1.2 Главное правило согласованности
Геометрия может **подсказывать** отношения, но не должна молча их «перезаписывать».
- Авто-правила (future): «если узел внутри Area → предложить membership/contains».
- Канон v0.5: **отношения живут в EdgeType + DB**, а геометрия — это UI-представление.

---

## 2) Semantic Coupling: когда стиль влияет на отношения
Здесь важный момент, который ты отметил.

### 2.1 Влияние стиля на отношения — 2 режима
**Режим A (безопасный, default v0.5):**
- Изменение style/route/intersections **не меняет EdgeType и не меняет DB-семантику**.
- Это чистый визуал/читаемость.

**Режим B (семантический, явный):**
- Если пользователь выбирает **“Set as Type Default”** → это меняет **дефолт визуального кодирования типа**.
- Это влияет на **взаимоотношения в смысле восприятия/семиотики**: все edges этого типа начинают “значить” визуально иначе.

> Важно: “влияет на взаимоотношения” = влияет на **семантическую интерпретацию**, а не обязательно на структуру DB.

### 2.2 Защита от «визуал убил смысл»
Вводим понятие **Semantically Locked Style Fields** (опционально):
- некоторые поля style считаются «кодом типа» и по умолчанию не меняются без подтверждения.
Пример:
- `contains` → route=orthoRounded (почти всегда)
- `refers` → pattern=dash
- `contrasts` → pattern=dash + arrow=none

UI: при попытке изменить locked-поле показываем маленький prompt:
- “Override for this edge” / “Change Type Default” / “Cancel”

---

## 3) UI surfaces (где и что редактируем)

### 3.1 Edge mini-toolbar (быстрый макияж)
Появляется при выборе edge (или RMB → Style…):
- **Type pill (первый контрол)**: показывает EdgeType (glyph + label)
- Thickness: 5 уровней
- Route: straight / orthoRounded / curveGrid
- Pattern: solid / dash / dot
- Intersections: none / jump / gap / dot
- Actions:
  - Reset to Type Default (удалить override)
  - Set as Type Default (явное изменение типа)

**Правило:** mini-toolbar не превращаем в “панель управления миром”. Это быстрые настройки выбранного edge.

### 3.2 Wire-mode (глубокий режим)
Wire-mode = редактор **смысла + трасс + батч-операций**.

**Entry points:**
- RMB edge → Wire-mode
- Manage Links → Wire-mode
- Hotkey `W` (когда выбран edge / есть выделение edges)

**Панели wire-mode (v0.5):**
1) **Edges**: список/поиск, фильтр по типу, batch apply
2) **Types**: библиотека EdgeType (создание/редактирование), дефолтные стили
3) **Route/Trace**:
   - route settings (curve bend handle минимум 1)
   - intersection policy preview
   - (future) signal/impulse preview

---

## 4) Route + intersections (геометрия проводов)

### 4.1 Routes (все grid-aware)
- `straight`: прямой сегмент
- `orthoRounded`: Manhattan по сетке + радиус скругления как кратность `GRID_METRICS.cell`
- `curveGrid`: grid-путь + сглаживание + **bend** (параметр -1..+1)

### 4.2 Intersections policy
Возможные режимы:
- none
- jump (верхняя линия «прыгает» дугой)
- gap (нижняя линия имеет разрыв)
- dot (точка на пересечении)

**Determinism rule (обязателен):**
при пан/зуме результат пересечений **не должен дрожать**.
Порядок должен быть стабильным:
- например: zIndex → createdAt → id

Perf v0.5:
- пересечения считаем только для видимых edges
- intersection режим активируется только если `intersection != none`

---

## 5) DB / data model hooks (где логика отражается в данных)

### 5.1 EdgeType как логический оператор
EdgeType описывает:
- смысл (key/label)
- направленность
- обратный тип (reverse)
- дефолтную визуальную кодировку (defaultStyle)
- optional: constraints (например, contains = single-parent)

### 5.2 contains и parent/child
`contains` — это не «про красоту линии», это про структуру.

Канон v0.5:
- Источник истины: **edges type=contains**.
- Опциональная денормализация: `nodes.parent_id` (если хотим быстрый tree/outline).

Constraints:
- если включён single-parent: у узла может быть 0..1 входящих `contains`.
- циклы запрещены.

---

## 6) Hotkeys / режимы (минимум)
- `P/L/A` — инструменты
- `W` — wire-mode (если релевантно)
- `Esc` закрывает верхний слой (wire-mode/toolbar/popovers) по LIFO

---

## 7) Acceptance criteria (v0.5)
1) У выбранного edge есть mini-toolbar, первый элемент — **Type pill**.
2) Любое изменение style для edge создаёт `styleOverride`, и это явно видно (Reset доступен).
3) “Set as Type Default” меняет defaultStyle у EdgeType (семантическое влияние через визуальный код).
4) Wire-mode умеет: список edges + batch change type + редактирование EdgeType defaults.
5) contains поддерживает parent/child политику (как минимум на уровне модели/валидации).
6) Intersections deterministic (без дрожи).

