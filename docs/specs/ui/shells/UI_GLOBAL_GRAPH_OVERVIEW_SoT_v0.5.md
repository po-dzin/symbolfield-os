Status: SoT
Version: v0.5
Owner: SF
Last updated: 2026-01-05
Supersedes: UI_GLOBAL_GRAPH_OVERVIEW_SoT_v0.5_r1.md

# UI_GLOBAL_GRAPH_OVERVIEW_SoT_v0.5_r1
**Status:** Source of Truth (SoT)  
**Scope:** SF v0.5 — Global Graph Overview на Station (общий вид)

---

## 0) TL;DR
Global Graph Overview на Station — **обзорная скульптура** (data-sculpture), которая:
- показывает **весь граф** в 2D (Space/Hub/Node) без шума,
- поддерживает **LOD** (уровни детализации) + подсветку зон по порталам/поиску,
- не является редактором: редактирование — в Space Field.

---

## 1) Визуальный код
| Сущность | Представление на Station | Цель |
|---|---|---|
| Space | кластер/остров (облако точек) | “мир/зона” |
| Hub | плотный яркий узел в кластере | “центр/контейнер” |
| Node | точки/малые капсулы | “элементы” |
| Links | тонкие нити, частично скрыты | “связность” |

Текст:
- минимум подписей (pinned + hovered + 1–3 ключевых)

---

## 2) Read-only + лёгкая камера
Разрешено: hover highlight, лёгкий pan/zoom.
Запрещено: создание/редактирование/drag.

---

## 3) Умное упрощение (LOD)
- дальний масштаб: только Space clusters + Hub-ядра
- ближе: Nodes + часть связей
- cap на количество видимых links + sampling
- LOD должен позволять “схлопнуть/развернуть” уровень детализации по нужному масштабу

---

## 4) Композиция
Эстетика: “мицелий/нейронка/звёздное небо”, но ультраминимально.
Цель: спокойная карта, не шумный граф.

Визуальный референс: `docs/specs/product/sf_os_unified_roadmap_doc_seed.md` (раздел Station / Temple as “Director Panel”).

---

## 5) DoD v0.5
- [ ] Space/Hub/Node различимы на overview.
- [ ] LOD работает и не перегружает.
- [ ] Подсветка target стабильна и быстра.
