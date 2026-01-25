# TEST_COVERAGE_MATRIX_v0.5

Scope: Implemented v0.5 features in this repo and current automated coverage.
Legend: covered | partial | missing

| Area | Feature | Coverage | Tests | Notes |
|---|---|---|---|---|
| Shell | App shell renders (os-shell, canvas layer) | covered | tests/smoke.spec.js | Seeded root node for deterministic smoke. |
| Shell | Space header: return to Station | covered | tests/regression.spec.js | Uses "Return to Station" button. |
| Shell | Space header: rename space | missing | - | No test for rename persistence. |
| Tools | Tool dock buttons (pointer/link/area) | partial | tests/regression.spec.js | Area button covered; pointer/link button coverage missing. |
| Tools | Active tool hotkeys (L/P/A/N) | covered | tests/hotkeys.spec.js | L/N covered; P/A not directly asserted. |
| Tools | Settings drawer open/close | covered | tests/smoke.spec.js, tests/regression.spec.js, tests/hotkeys.spec.js | Button + hotkey coverage. |
| Overlays | Command palette open/close | covered | tests/smoke.spec.js, tests/regression.spec.js, tests/hotkeys.spec.js | Close button + hotkey. |
| Overlays | NOW overlay enter/exit | covered | tests/regression.spec.js, tests/hotkeys.spec.js | Double-click + Enter + Esc/back. |
| Time | Log drawer toggle | covered | tests/smoke.spec.js, tests/regression.spec.js | Opens via TimeChip click. |
| Time | Time scale buttons | partial | tests/regression.spec.js | Week button only; day/month not asserted. |
| Time | Time navigation (prev/next, jump today) | missing | - | No coverage for date changes. |
| Canvas | Node creation by double-click | covered | tests/interaction.spec.js | Verifies position projection. |
| Canvas | Node creation by hotkey (N) | covered | tests/interaction.spec.js, tests/hotkeys.spec.js | Cursor placement verified. |
| Canvas | Node selection (click, multi-select) | covered | tests/interaction.spec.js | Shift multi-select covered. |
| Canvas | Box select | covered | tests/interaction.spec.js | Drag marquee selects multiple nodes. |
| Canvas | Node drag vs click behavior | covered | tests/interaction.spec.js | Drag should not select. |
| Canvas | Pan camera (drag, Space+Drag) | covered | tests/interaction.spec.js | Both behaviors covered. |
| Links | Link tool click-to-link | covered | tests/interaction.spec.js, tests/hotkeys.spec.js | Creates edge A -> B. |
| Links | Drag-to-create node + link | covered | tests/interaction.spec.js | Link drag to empty space. |
| Links | Associative link (Alt) | covered | tests/hotkeys.spec.js | Dashed stroke check. |
| Links | Edge selection + delete | covered | tests/interaction.spec.js, tests/hotkeys.spec.js | Delete via edge click + Delete. |
| Grouping | Group selection (Shift+Enter / G) | covered | tests/interaction.spec.js, tests/hotkeys.spec.js | Hub created. |
| Context | Context toolbar appears on selection | covered | tests/regression.spec.js | "Enter Now" button visible. |
| Context | Context toolbar actions (Group/Delete/Links) | covered | tests/interaction.spec.js | Unlink and delete coverage. |
| Context | Label edit / glyph / color picker | covered | tests/interaction.spec.js | Toolbar edit + picker selections. |
| Areas | Area tool create rect/circle | covered | tests/regression.spec.js | Uses Area tool button + shift modifier. |
| Areas | Area focus toggle (double click) | covered | tests/regression.spec.js | Focused area state asserted. |
| Areas | Area move/resize/anchor/rings | covered | tests/interaction.spec.js | Resize drag, anchor toggle, rings add/remove. |
| Station | Home portal renders (search input, gates) | partial | tests/regression.spec.js | Station visible + New Space click. |
| Station | Recents rail / templates / onboarding / account settings | partial | tests/regression.spec.js | Recents + templates covered; onboarding/account settings still missing. |
| Undo/Redo | Cmd/Ctrl+Z / redo | covered | tests/hotkeys.spec.js | Node count assertions. |
| Unit | GraphEngine add/remove node | covered | tests/unit/graph.test.js | Basic CRUD unit tests. |
| Unit | GestureRouter delete protection | covered | src/core/interaction/__tests__/GestureRouter.test.ts | Root/core delete guard. |
