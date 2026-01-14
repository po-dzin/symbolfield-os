# SF HUD Structure v2

Core idea: **one living daily interface** built from three blocks:
- `/state_bar` — subjective perception now.
- `/xp_matrix` — what you actually do today.
- `/time_spiral` — objective time/phase context.

Этот документ — не про мета-архитектуру 6 слоёв, а про **конкретную структуру органа HUD**, который ты видишь и трогаешь каждый день.

---

## 1. /state_bar — subjective state vector

**What it answers:** "Как я сейчас проживаю момент?"

Display format:

> `State: [mode] · [tone] · [glyph]`

### 1.1. `mode` (triad)

Archetypal perception mode (3-core):

- 🕳 `shadow`  — depth, shadow, deconstruction.
- 🌀 `flow`    — neutral working flow, adaptive.
- 🔆 `radiant` — peak, stage, social expression.

Stored as:
```yaml
state.mode: "shadow" | "flow" | "radiant"
```

### 1.2. `tone` (color dot)

Color-quality of the moment:

- 🟢 `calm`
- 🟡 `joy`
- 🔵 `focus`
- 🟣 `deep`
- 🔴 `anger`
- 🟠 `excite`
- ⚫ `burnout`
- ⚪ `neutral`

Stored as emoji (with optional mapping to label):
```yaml
state.tone: "🟣"
```

### 1.3. `glyph` (daily sigil)

Free-field symbol describing the "shape" of the day:

- can be SEM7 glyph (• ∣ ○ ⊙ ∴ 𓂀 ∅),
- or any custom GlyphField mark.

```yaml
state.glyph: "𓂀"
```

**Full /state_bar example:**

> `State: 🌀 · 🟣 · 𓂀`

---

## 2. /xp_matrix — daily action & XP field

**What it answers:** "Что я реально делаю сегодня телом / креативом / умом / тишиной?"

4 quadrants = 4 XP types:

| Quad | XP | Label (eng)        | Meaning                         |
|------|----|--------------------|---------------------------------|
| 🪨   | HP | `body / soma`      | sleep, food, movement, bodywork |
| 💧   | CP | `create / art`     | art, sound, visuals, writing    |
| 🔥   | MP | `mind / systems`   | code, strategy, learning        |
| 🌬   | DP | `stillness / space`| meditation, breath, ritual, walk|

### 2.1. Fields per quadrant

Minimal set (per XP axis):

- `focus` — main intention / anchor (1 phrase).
- `target_xp` — planned effort (0–3 scale).
- `result` — short factual note at end of day.

```yaml
xp_matrix:
  HP: { focus: "IVEM + normal food",      target_xp: 2, result: null }
  CP: { focus: "1 GlyphField artwork",    target_xp: 2, result: null }
  MP: { focus: "SF HUD v2 spec",          target_xp: 3, result: null }
  DP: { focus: "20m meditation + breath", target_xp: 2, result: null }
```

UI example:

| Quad | Focus                       | Target | Result |
|------|-----------------------------|--------|--------|
| 🪨 HP | IVEM + normal food          | +2     | __     |
| 💧 CP | 1 GlyphField artwork        | +2     | __     |
| 🔥 MP | SF HUD v2 spec              | +3     | __     |
| 🌬 DP | 20m meditation + breath     | +2     | __     |

---

## 3. /time_spiral — objective time & phase context

**What it answers:** "В каком объективном ритме сейчас всё происходит?"

Global symbol:

- ⏳ — `time_spiral`

Core scales (5 levels):

| Scale    | Icon | Code      | Meaning                                  |
|----------|------|-----------|------------------------------------------|
| Breath   | 🫁   | `breath`  | breath cycle, nervous system state       |
| Day      | ☀️   | `day`     | circadian / daily rhythm                 |
| Month    | 🌙   | `month`   | lunar / monthly creative-emotional cycle |
| Year     | 🌍   | `year`    | seasons, yearly focus                    |
| 12Y Arc  | 🪐   | `arc_12y` | big arc (career/life/Jupiter-like cycle) |

Each scale has a **phase glyph** from:

> • → ○ → ⊙ → ◌  
> seed → expand → full → fade

- **•** — seed / initial impulse
- **○** — expansion / growth
- **⊙** — peak / full presence
- **◌** — fade / release / distillation

Stored as:

```yaml
time_spiral:
  breath:  { icon: "🫁", phase: "◌" }
  day:     { icon: "☀️", phase: "◌" }
  month:   { icon: "🌙", phase: "◌" }
  year:    { icon: "🌍", phase: "◌" }
  arc_12y: { icon: "🪐", phase: "○" }
```

HUD display example:

```text
2025-11-18 · 03:10 · Kyiv · Moon: Waning Crescent · Season: Late Autumn
⏳  🫁◌  ☀️◌  🌙◌  🌍◌  🪐○
State: 🌀 · 🟣 · 𓂀
```

---

## 4. SF HUD v2 · Full daily object

This is the **full data structure** for one day of SF HUD v2:

```yaml
hud_v2_day:
  meta:
    date: "2025-11-18"
    timezone: "UTC+2"
    location: "Kyiv"
    moon: "Waning Crescent"
    season: "Late Autumn"

  state_bar:
    mode:  "flow"   # shadow | flow | radiant
    tone:  "🟣"      # color dot
    glyph: "𓂀"      # daily sigil

  xp_matrix:
    HP: { focus: "IVEM + normal food",      target_xp: 2, result: null }
    CP: { focus: "1 GlyphField artwork",    target_xp: 2, result: null }
    MP: { focus: "SF HUD v2 spec",          target_xp: 3, result: null }
    DP: { focus: "20m meditation + breath", target_xp: 2, result: null }

  time_spiral:
    breath:  { icon: "🫁", phase: "◌" }
    day:     { icon: "☀️", phase: "◌" }
    month:   { icon: "🌙", phase: "◌" }
    year:    { icon: "🌍", phase: "◌" }
    arc_12y: { icon: "🪐", phase: "○" }
```

Это и есть **SF HUD Structure v2** как живой модуль:
- три блока (state / xp / time),
- минимальный набор полей,
- готов для реализации в Notion / Obsidian / боте без изменения смысла ядра.

