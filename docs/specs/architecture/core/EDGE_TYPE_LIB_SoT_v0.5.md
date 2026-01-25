# EdgeType Library SoT v0.5

## 0) Purpose
Собрать **минимальную библиотеку базовых отношений** (EdgeType), которая:
- логически опирается на операции над объектами/множествами
- имеет стабильное визуальное кодирование (route/pattern/width/intersections)
- ложится в БД (включая contains → parent/child)
- расширяется пакетами, не превращаясь в хаос

> Канон: меньше типов, больше точности. **Core 8** + domain packs.

---

## 1) Principles
1) **Core-first**: 80% покрываем 6–8 типами.
2) **Reversible when possible**: если есть направление — указываем reverse.
3) **Meaning > style**: внешний вид по умолчанию вычисляется из EdgeType.
4) **Set-logic friendly**: отношения интерпретируем как операторы.
5) **Constraints explicit**: contains/depends и т.п. имеют правила (single-parent, no cycles).

---

## 2) Core EdgeTypes (v0.5)

| key | label (RU) | direction | reverse | set/logic intuition | typical use | default visual encoding |
|---|---|---:|---|---|---|---|
| contains | содержит | A→B | part_of | A ⊇ B / membership | иерархия, кластеры, «внутри» | route=orthoRounded, pattern=solid, width=w3 |
| part_of | часть | A→B | contains | A ⊆ B | обратная стрелка для contains | inherits from contains (reverse only) |
| relates | связано | ↔/— | — | отношение без уточнения | быстрые связи | route=straight, solid, w2 |
| refers | ссылается | A→B | referenced_by | reference/link | заметка→ресурс/концепт | straight, dash, w2 |
| referenced_by | упомянуто в | A→B | refers | обратное refers | навигация/обратные ссылки | straight, dash, w2 |
| depends_on | зависит от | A→B | required_for | prerequisite | задачи/сборки/логика | orthoRounded, dash, w3 |
| required_for | требуется для | A→B | depends_on | reverse dependency | обратная зависимость | orthoRounded, dash, w3 |
| causes | вызывает | A→B | caused_by | cause→effect | процессы/баги/эффекты | curveGrid, solid, w3 |
| caused_by | вызвано | A→B | causes | reverse cause | обратная причинность | curveGrid, solid, w3 |
| transforms_to | превращается в | A→B | transforms_from | state transition | версии/эволюция | curveGrid, dot, w3 |
| transforms_from | получено из | A→B | transforms_to | reverse transform | обратная линия версий | curveGrid, dot, w3 |
| supports | поддерживает | A→B | supported_by | support relation | ресурсы/аргументы/опоры | straight, solid, w2 |
| supported_by | поддержано | A→B | supports | reverse support | обратная опора | straight, solid, w2 |
| contrasts | контрастирует | ↔ | — | A ≠ B / tension | сравнения/дилеммы | straight, dash, w3 |

> Примечание: Core может быть «8 ключей», а reverse ключи генерируются/скрываются в UI как “reverse view”.

---

## 3) SF-special pack (optional, v0.5+)

| key | label | direction | reverse | use |
|---|---|---:|---|---|
| ritual_log | логирует ритуал для | A→B | logged_by | Daily/Log → object/project/area |
| signal | сигнал/изменение на | A→B | signaled_by | события/пульсы по ребру (wire-mode trace) |

---

## 4) Constraints (важно для DB и UX)

### 4.1 contains / part_of
**Option 1 (graph-first, recommended):**
- истины: edges type=contains
- ограничения:
  - single-parent: 0..1 входящих contains на узел (опционально)
  - no cycles

**Option 2 (tree-optimized, optional):**
- `nodes.parent_id` денормализуется из edges
- edges остаются источником истины

### 4.2 depends_on
- циклы технически возможны, но почти всегда это ошибка → можно предупреждать.

### 4.3 transforms_to
- желателен DAG по времени (но не требуем в v0.5)

---

## 5) Visual encoding rules (чтобы стиль не заменял смысл)

### 5.1 DefaultStyle — это часть EdgeType
EdgeType хранит `defaultStyle`.
Пер-ребро может иметь `styleOverride`.

### 5.2 Semantically locked fields (recommended)
Для некоторых типов фиксируем поля (по умолчанию):
- contains: route=orthoRounded
- refers: pattern=dash
- transforms_to: pattern=dot

Override разрешён, но UI предлагает:
- Override for this edge
- Change Type Default

---

## 6) JSON/TS skeleton (для агента)

```ts
type EdgeTypeId = string

type EdgeType = {
  id: EdgeTypeId
  key: string
  label: string
  glyph?: string
  directed: boolean
  reverseKey?: string
  defaultStyle: {
    width: 'w1'|'w2'|'w3'|'w4'|'w5'
    route: 'straight'|'orthoRounded'|'curveGrid'
    pattern: 'solid'|'dash'|'dot'
    intersection: 'none'|'jump'|'gap'|'dot'
    cornerRadiusMul?: number
    bend?: number
  }
  constraints?: {
    singleParent?: boolean
    forbidCycles?: boolean
  }
}
```

---

## 7) UI requirements (минимум)
- Edge mini-toolbar всегда показывает **Type pill**.
- Wire-mode → Types: список + редактирование defaultStyle.
- Команда: “Set as Type Default” и “Reset to Type Default”.

---

## 8) Acceptance criteria (v0.5)
1) Core EdgeTypes доступны в Type picker.
2) contains корректно поддерживает parent/child политику (как минимум в модели).
3) DefaultStyle считывается из EdgeType; override работает и сбрасывается.
4) Reverse отношения не ломают UX (видно направление + можно переключать отображение).

