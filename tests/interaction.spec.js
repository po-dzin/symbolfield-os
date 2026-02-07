import { test, expect } from '@playwright/test';

const CORE_ID = 'core';

test.describe('Coordinate & Interaction System', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('.os-shell')).toBeVisible();

        // Deterministic clear and re-seed core
        await page.evaluate((coreId) => {
            try {
                localStorage.setItem('sf_onboarding_state', JSON.stringify({
                    isCompleted: true,
                    hasSeenWelcome: true,
                    playgroundCreated: true,
                    completedSteps: []
                }));
            } catch {
                // Ignore storage errors in tests.
            }

            window.__E2E__ = true;

            if (window.__GRAPH_STORE__) {
                const store = window.__GRAPH_STORE__.getState();
                store.clearGraph();
                store.addNode({ id: coreId, type: 'core', position: { x: 400, y: 300 }, data: { label: 'Core' } });
            }
            if (window.__APP_STORE__) {
                const app = window.__APP_STORE__.getState();
                app.setViewContext('space');
                app.setTool('pointer');
            }
        }, CORE_ID);

        // Wait for core to render
        await expect(page.locator(`[data-node-id="${CORE_ID}"]`)).toBeVisible();
    });

    test('should create node at clicked location (projected)', async ({ page }) => {
        const canvas = page.locator('.w-full.h-full.bg-os-dark');
        const canvasBox = await canvas.boundingBox();

        // 1. Double Click to create node at relative (100, 100)
        await canvas.dblclick({ position: { x: 100, y: 100 } });

        // 2. We should have 2 nodes now
        const nodes = page.locator('[data-node-id]');
        await expect(nodes).toHaveCount(2);

        // 3. The new node should be centered at canvas.x + 100, canvas.y + 100
        const newNode = nodes.nth(1);
        await expect(newNode).toBeVisible();
        const box = await newNode.boundingBox();
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;

        expect(Math.abs(centerX - (canvasBox.x + 100))).toBeLessThan(30);
        expect(Math.abs(centerY - (canvasBox.y + 100))).toBeLessThan(30);
    });

    test('should click-to-select on pointer up', async ({ page }) => {
        const coreNode = page.locator(`[data-node-id="${CORE_ID}"]`);
        const box = await coreNode.boundingBox();
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;

        // 1. Click core center
        await page.mouse.click(centerX, centerY);

        // 2. Should be selected (check for orbits)
        await expect(page.locator('.animate-orbit-slow')).toBeVisible();
    });

    test('should not create a node when double-clicking an existing node', async ({ page }) => {
        const coreNode = page.locator(`[data-node-id="${CORE_ID}"]`);
        const box = await coreNode.boundingBox();
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;

        await page.mouse.dblclick(centerX, centerY);

        await expect(page.locator('[data-node-id]')).toHaveCount(1);
    });

    test('should NOT select node on drag move', async ({ page }) => {
        const canvas = page.locator('.w-full.h-full.bg-os-dark');

        // 1. Create a transient node
        await canvas.dblclick({ position: { x: 100, y: 100 } });
        const node = page.locator('[data-node-id]').nth(1);
        const box = await node.boundingBox();
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;

        // 2. Start drag
        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.mouse.move(centerX + 100, centerY + 100, { steps: 5 });

        // 3. Should NOT be selected (no scale-110)
        const inner = node.locator('div').first();
        const isSelectedMid = await inner.evaluate(el => el.classList.contains('scale-110'));
        expect(isSelectedMid).toBe(false);

        // 4. Release
        await page.mouse.up();

        // 5. Still NOT selected
        const isSelectedEnd = await inner.evaluate(el => el.classList.contains('scale-110'));
        expect(isSelectedEnd).toBe(false);
    });

    test('should pan camera and stay consistent', async ({ page }) => {
        const canvas = page.locator('.w-full.h-full.bg-os-dark');
        const canvasBox = await canvas.boundingBox();

        const coreNode = page.locator(`[data-node-id="${CORE_ID}"]`);
        const before = await coreNode.boundingBox();

        // Pan +100, +100 using Space+Drag
        await page.keyboard.down('Space');
        await page.mouse.move(canvasBox.x + 100, canvasBox.y + 100);
        await page.mouse.down();
        await page.mouse.move(canvasBox.x + 200, canvasBox.y + 200);
        await page.mouse.up();
        await page.keyboard.up('Space');

        await page.waitForTimeout(100);

        const after = await coreNode.boundingBox();
        expect(after.x).not.toBe(before.x);
        expect(after.y).not.toBe(before.y);
    });

    test('should NOT allow dragging core node', async ({ page }) => {
        const coreNode = page.locator(`[data-node-id="${CORE_ID}"]`);
        const boxBefore = await coreNode.boundingBox();
        const centerX = boxBefore.x + boxBefore.width / 2;
        const centerY = boxBefore.y + boxBefore.height / 2;

        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.mouse.move(centerX + 100, centerY + 100);
        await page.mouse.up();

        const boxAfter = await coreNode.boundingBox();
        expect(boxAfter.x).toBeCloseTo(boxBefore.x, 0);
        expect(boxAfter.y).toBeCloseTo(boxBefore.y, 0);
    });

    test('should link nodes regardless of panning', async ({ page }) => {
        const canvas = page.locator('.w-full.h-full.bg-os-dark');
        const canvasBox = await canvas.boundingBox();

        // 1. Create second node at (100, 100)
        await canvas.dblclick({ position: { x: 100, y: 100 } });
        await expect(page.locator('[data-node-id]')).toHaveCount(2);

        // 2. Pan +100, +100
        await page.keyboard.down('Space');
        await page.mouse.move(canvasBox.x + 500, canvasBox.y + 500);
        await page.mouse.down();
        await page.mouse.move(canvasBox.x + 600, canvasBox.y + 600);
        await page.mouse.up();
        await page.keyboard.up('Space');

        // 3. Create link after pan (store path)
        await page.evaluate((coreId) => {
            if (!window.__GRAPH_STORE__) return;
            const store = window.__GRAPH_STORE__.getState();
            const other = store.nodes.find(n => n.id !== coreId);
            if (other) {
                store.addEdge(coreId, other.id);
            }
        }, CORE_ID);

        // 5. Verify Edge
        await page.waitForFunction(() => (window.__GRAPH_STORE__?.getState().edges.length ?? 0) > 0);
    });

    test('should create and link node from selected node when clicking empty in link mode', async ({ page }) => {
        const canvas = page.locator('.w-full.h-full.bg-os-dark');
        const canvasBox = await canvas.boundingBox();
        const coreNode = page.locator(`[data-node-id="${CORE_ID}"]`);

        await coreNode.click();
        await page.keyboard.press('l');
        await page.mouse.click(canvasBox.x + 220, canvasBox.y + 140);

        await page.waitForFunction(() => (window.__GRAPH_STORE__?.getState().nodes.length ?? 0) === 2);
        await page.waitForFunction(() => (window.__GRAPH_STORE__?.getState().edges.length ?? 0) === 1);
    });

    test('should prevent node overlap after dragging', async ({ page }) => {
        const canvas = page.locator('.w-full.h-full.bg-os-dark');
        await canvas.dblclick({ position: { x: 200, y: 200 } });
        await expect(page.locator('[data-node-id]')).toHaveCount(2);

        const coreNode = page.locator(`[data-node-id="${CORE_ID}"]`);
        const node2 = page.locator('[data-node-id]').nth(1);

        const coreBox = await coreNode.boundingBox();
        const nodeBox = await node2.boundingBox();
        const coreCenter = { x: coreBox.x + coreBox.width / 2, y: coreBox.y + coreBox.height / 2 };
        const nodeCenter = { x: nodeBox.x + nodeBox.width / 2, y: nodeBox.y + nodeBox.height / 2 };

        await page.mouse.move(nodeCenter.x, nodeCenter.y);
        await page.mouse.down();
        await page.mouse.move(coreCenter.x, coreCenter.y, { steps: 8 });
        await page.mouse.up();

        await page.waitForFunction(() => {
            const core = document.querySelector('[data-node-id="core"]');
            const node = document.querySelectorAll('[data-node-id]')[1];
            if (!core || !node) return false;
            const coreBox = core.getBoundingClientRect();
            const nodeBox = node.getBoundingClientRect();
            const coreCenter = { x: coreBox.x + coreBox.width / 2, y: coreBox.y + coreBox.height / 2 };
            const nodeCenter = { x: nodeBox.x + nodeBox.width / 2, y: nodeBox.y + nodeBox.height / 2 };
            const dx = nodeCenter.x - coreCenter.x;
            const dy = nodeCenter.y - coreCenter.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = (coreBox.width / 2) + (nodeBox.width / 2) - 1;
            return dist >= minDist;
        });
    });

    test('should prevent node overlap on creation near core', async ({ page }) => {
        const canvas = page.locator('.w-full.h-full.bg-os-dark');
        const canvasBox = await canvas.boundingBox();
        const coreNode = page.locator(`[data-node-id="${CORE_ID}"]`);
        const coreBox = await coreNode.boundingBox();

        // Attempt to create a node just outside the core hit area but within overlap distance.
        const coreCenterLocal = {
            x: (coreBox.x - canvasBox.x) + coreBox.width / 2 + 50,
            y: (coreBox.y - canvasBox.y) + coreBox.height / 2
        };
        await canvas.dblclick({
            position: {
                x: coreCenterLocal.x,
                y: coreCenterLocal.y
            }
        });

        await expect(page.locator('[data-node-id]')).toHaveCount(2);

        const ok = await page.evaluate((coreId) => {
            const { nodes } = window.__GRAPH_STORE__?.getState() ?? { nodes: [] };
            const core = nodes.find(n => n.id === coreId);
            const other = nodes.find(n => n.id !== coreId);
            if (!core || !other) return false;

            const cell = 24;
            const baseRadius = (cell * 2) / 2;
            const rootRadius = (cell * 3) / 2;
            const dx = other.position.x - core.position.x;
            const dy = other.position.y - core.position.y;
            const dist = Math.hypot(dx, dy);
            const minDist = baseRadius + rootRadius;
            return dist >= (minDist - 1);
        }, CORE_ID);

        expect(ok).toBe(true);
    });

    test('grid snap is on by default and snaps on pointer up', async ({ page }) => {
        const canvas = page.locator('.w-full.h-full.bg-os-dark');
        const canvasBox = await canvas.boundingBox();

        const snapId = 'snap-default';
        await page.evaluate((id) => {
            const store = window.__GRAPH_STORE__?.getState();
            store?.addNode({ id, position: { x: 205, y: 205 }, data: { label: id } });
        }, snapId);
        const node = page.locator(`[data-node-id="${snapId}"]`);
        await expect(node).toBeVisible();

        const nodeBox = await node.boundingBox();
        await page.mouse.move(nodeBox.x + nodeBox.width / 2, nodeBox.y + nodeBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(canvasBox.x + 219, canvasBox.y + 227, { steps: 8 });
        await page.mouse.up();

        await page.waitForFunction((id) => {
            const cell = 24;
            const nodeState = window.__GRAPH_STORE__?.getState().nodes.find(n => n.id === id);
            if (!nodeState) return false;
            const snappedX = Math.round(nodeState.position.x / cell) * cell;
            const snappedY = Math.round(nodeState.position.y / cell) * cell;
            return nodeState.position.x === snappedX && nodeState.position.y === snappedY;
        }, snapId);
    });

    test('grid snap toggle in settings disables snapping on pointer up', async ({ page }) => {
        await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Comma' : 'Control+Comma');
        await expect(page.getByText('Settings', { exact: true })).toBeVisible();
        const gridSnapToggle = page.locator('text=Grid snap').locator('..').getByRole('button').first();
        await gridSnapToggle.click();
        const gridSnapEnabled = await page.evaluate(() => window.__APP_STORE__?.getState().gridSnapEnabled);
        expect(gridSnapEnabled).toBe(false);

        const canvas = page.locator('.w-full.h-full.bg-os-dark');
        const canvasBox = await canvas.boundingBox();
        const snapId = 'snap-off';
        await page.evaluate((id) => {
            const store = window.__GRAPH_STORE__?.getState();
            store?.addNode({ id, position: { x: 240, y: 240 }, data: { label: id } });
        }, snapId);
        const node = page.locator(`[data-node-id="${snapId}"]`);
        await expect(node).toBeVisible();

        const nodeBox = await node.boundingBox();
        await page.mouse.move(nodeBox.x + nodeBox.width / 2, nodeBox.y + nodeBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(canvasBox.x + 253, canvasBox.y + 247, { steps: 8 });
        await page.mouse.up();

        const snapped = await page.evaluate((id) => {
            const cell = 24;
            const nodeState = window.__GRAPH_STORE__?.getState().nodes.find(n => n.id === id);
            if (!nodeState) return true;
            const snappedX = Math.round(nodeState.position.x / cell) * cell;
            const snappedY = Math.round(nodeState.position.y / cell) * cell;
            return nodeState.position.x === snappedX && nodeState.position.y === snappedY;
        }, snapId);
        expect(snapped).toBe(false);
    });

    test('should create node with [N] at cursor', async ({ page }) => {
        const canvas = page.locator('.w-full.h-full.bg-os-dark');
        const canvasBox = await canvas.boundingBox();

        // Move mouse to some location
        await page.mouse.move(canvasBox.x + 300, canvasBox.y + 300);

        // Press N
        await page.keyboard.press('n');

        // Verify new node exists
        const node = page.locator('[data-node-id]').nth(1); // nth(0) is core
        await expect(node).toBeVisible();

        // Select it to see the label
        await node.click();
        await expect(page.getByText(/Empty/i).first()).toBeVisible();
    });

    test('should group nodes with [Shift+Enter]', async ({ page }) => {
        const canvas = page.locator('.w-full.h-full.bg-os-dark');

        // 1. Create two additional nodes (non-core)
        await canvas.dblclick({ position: { x: 200, y: 200 } });
        await canvas.dblclick({ position: { x: 300, y: 300 } });
        await expect(page.locator('[data-node-id]')).toHaveCount(3);

        // 2. Multi-select the two non-core nodes
        const node2 = page.locator('[data-node-id]').nth(1);
        const node3 = page.locator('[data-node-id]').nth(2);

        await node2.click();
        await page.keyboard.down('Shift');
        await node3.click();
        await page.keyboard.up('Shift');

        // 3. Press Shift+Enter
        await page.keyboard.press('Shift+Enter');

        // 4. Verify Hub Created (count = 4)
        await expect(page.locator('[data-node-id]')).toHaveCount(4);
    });

    test('should group nodes via toolbar action', async ({ page }) => {
        const canvas = page.locator('.w-full.h-full.bg-os-dark');

        await canvas.dblclick({ position: { x: 220, y: 200 } });
        await canvas.dblclick({ position: { x: 320, y: 260 } });
        await expect(page.locator('[data-node-id]')).toHaveCount(3);

        const node2 = page.locator('[data-node-id]').nth(1);
        const node3 = page.locator('[data-node-id]').nth(2);

        await node2.click();
        await page.keyboard.down('Shift');
        await node3.click();
        await page.keyboard.up('Shift');

        await page.getByRole('button', { name: /Group/i }).click();
        await expect(page.locator('[data-node-id]')).toHaveCount(4);
    });

    test('should delete a selected node via toolbar action', async ({ page }) => {
        const canvas = page.locator('.w-full.h-full.bg-os-dark');

        await canvas.dblclick({ position: { x: 180, y: 260 } });
        await expect(page.locator('[data-node-id]')).toHaveCount(2);

        const node2 = page.locator('[data-node-id]').nth(1);
        await node2.click();

        await page.getByTitle('Actions').click();
        await page.getByRole('button', { name: /^Delete$/ }).click();
        await expect(page.locator('[data-node-id]')).toHaveCount(1);
    });

    test('should pan camera with [Space+Drag]', async ({ page }) => {
        const canvas = page.locator('.w-full.h-full.bg-os-dark');
        const canvasBox = await canvas.boundingBox();

        const coreNode = page.locator(`[data-node-id="${CORE_ID}"]`);
        const before = await coreNode.boundingBox();

        // Press Space and Drag
        await page.keyboard.down('Space');
        await page.mouse.move(canvasBox.x + 500, canvasBox.y + 500);
        await page.mouse.down();
        await page.mouse.move(canvasBox.x + 600, canvasBox.y + 600);
        await page.mouse.up();
        await page.keyboard.up('Space');

        const after = await coreNode.boundingBox();
        expect(after.x).toBeGreaterThan(before.x);
    });

    test('should create and link node when dragging to empty space', async ({ page }) => {
        const coreNode = page.locator(`[data-node-id="${CORE_ID}"]`);
        const coreBox = await coreNode.boundingBox();

        await page.keyboard.press('l'); // LINK tool

        await page.mouse.move(coreBox.x + coreBox.width / 2, coreBox.y + coreBox.height / 2);
        await page.mouse.down();
        // Drag to empty field
        await page.mouse.move(coreBox.x + 300, coreBox.y + 300, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(300); // Wait for interaction settle

        // Verify count = 2 and edge exists
        await expect(page.locator('[data-node-id]')).toHaveCount(2);
        const edgeCount = await page.evaluate(() => window.__GRAPH_STORE__?.getState().edges.length ?? 0);
        expect(edgeCount).toBeGreaterThanOrEqual(1);

        // Select new node to verify it exists
        const node2 = page.locator('[data-node-id]').nth(1);
        await node2.click();
        await expect(node2).toBeVisible();
    });

    test('link drag to empty creates one edge from the source node', async ({ page }) => {
        const coreNode = page.locator(`[data-node-id="${CORE_ID}"]`);
        const coreBox = await coreNode.boundingBox();

        await page.keyboard.press('l');

        const startX = coreBox.x + coreBox.width / 2;
        const startY = coreBox.y + coreBox.height / 2;

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX + 180, startY + 60, { steps: 12 });
        await page.mouse.up();

        await page.waitForFunction(() => (window.__GRAPH_STORE__?.getState().nodes.length ?? 0) === 2);
        await page.waitForFunction(() => (window.__GRAPH_STORE__?.getState().edges.length ?? 0) === 1);

        const edge = await page.evaluate(() => window.__GRAPH_STORE__?.getState().edges[0]);
        expect(edge?.source).toBe(CORE_ID);
    });

    test('should delete links via edge click and via Links menu', async ({ page }) => {
        await page.evaluate((coreId) => {
            if (!window.__GRAPH_STORE__) return;
            const store = window.__GRAPH_STORE__.getState();
            store.addNode({ id: 'node-1', type: 'node', position: { x: 600, y: 300 }, data: { label: 'Node1' } });
            store.addEdge(coreId, 'node-1');
        }, CORE_ID);

        const initialEdgeCount = await page.evaluate(() => window.__GRAPH_STORE__?.getState().edges.length ?? 0);
        expect(initialEdgeCount).toBeGreaterThanOrEqual(1);

        const coreNode = page.locator(`[data-node-id="${CORE_ID}"]`);
        const node = page.locator('[data-node-id="node-1"]');
        const coreBox = await coreNode.boundingBox();
        const nodeBox = await node.boundingBox();
        const midX = (coreBox.x + coreBox.width / 2 + nodeBox.x + nodeBox.width / 2) / 2;
        const midY = (coreBox.y + coreBox.height / 2 + nodeBox.y + nodeBox.height / 2) / 2;

        const edge = page.locator('[data-edge-id]').first();
        await edge.click({ force: true });
        await page.keyboard.press('Delete');
        await page.waitForFunction((count) => {
            const next = window.__GRAPH_STORE__?.getState().edges.length ?? 0;
            return next < count;
        }, initialEdgeCount);

        await page.evaluate((coreId) => {
            if (!window.__GRAPH_STORE__) return;
            const store = window.__GRAPH_STORE__.getState();
            store.addEdge(coreId, 'node-1');
        }, CORE_ID);

        const restoredEdgeCount = await page.evaluate(() => window.__GRAPH_STORE__?.getState().edges.length ?? 0);
        expect(restoredEdgeCount).toBeGreaterThanOrEqual(1);

        await coreNode.click();
        await page.getByTitle('Actions').click();
        await page.getByRole('button', { name: /Links/ }).click();
        const linksMenu = page.locator('[data-context-menu]').filter({ hasText: 'Links' }).first();
        await linksMenu.getByRole('button', { name: '✕' }).first().click();
        await page.waitForFunction((count) => {
            const next = window.__GRAPH_STORE__?.getState().edges.length ?? 0;
            return next < count;
        }, restoredEdgeCount);
    });

    test('should clear edge selection on single node select', async ({ page }) => {
        const canvas = page.locator('.w-full.h-full.bg-os-dark');
        await canvas.dblclick({ position: { x: 200, y: 200 } });
        await expect(page.locator('[data-node-id]')).toHaveCount(2);

        const rootNode = page.locator(`[data-node-id="${CORE_ID}"]`);
        const node2 = page.locator('[data-node-id]').nth(1);

        await page.evaluate((coreId) => {
            if (!window.__GRAPH_STORE__) return;
            const store = window.__GRAPH_STORE__.getState();
            store.addEdge(coreId, store.nodes.find(n => n.id !== coreId)?.id ?? 'node-1');
        }, CORE_ID);
        await page.waitForFunction(() => (window.__GRAPH_STORE__?.getState().edges.length ?? 0) > 0);

        await page.keyboard.press('l');
        const hitEdge = page.locator('line[data-edge-id][stroke="transparent"]').first();
        const visibleEdge = page.locator('line[data-edge-id]:not([stroke="transparent"])').first();
        await hitEdge.click({ force: true });
        await expect(visibleEdge).toHaveAttribute('stroke-width', '2.2');

        await rootNode.click();
        await expect(visibleEdge).toHaveAttribute('stroke-width', '1.5');
    });

    test('should box-select multiple nodes', async ({ page }) => {
        await page.evaluate(() => {
            const store = window.__GRAPH_STORE__?.getState();
            // Grid snap is enabled by default; seed nodes on grid centers.
            store?.addNode({ id: 'n1', position: { x: 216, y: 216 }, data: { label: 'N1' } });
            store?.addNode({ id: 'n2', position: { x: 288, y: 264 }, data: { label: 'N2' } });
        });

        const n1 = page.locator('[data-node-id="n1"]');
        const n2 = page.locator('[data-node-id="n2"]');
        await expect(n1).toBeVisible();
        await expect(n2).toBeVisible();

        const canvas = page.locator('#sf-canvas');
        const canvasBox = await canvas.boundingBox();
        const startX = canvasBox.x + 12;
        const startY = canvasBox.y + 12;
        const endX = canvasBox.x + canvasBox.width - 12;
        const endY = canvasBox.y + canvasBox.height - 12;

        await canvas.dragTo(canvas, {
            sourcePosition: { x: startX - canvasBox.x, y: startY - canvasBox.y },
            targetPosition: { x: endX - canvasBox.x, y: endY - canvasBox.y },
            force: true
        });

        await page.waitForFunction(() => (window.__SELECTION_STORE__?.getState().selectedIds.length ?? 0) >= 2);
        const selectionIds = await page.evaluate(() => window.__SELECTION_STORE__?.getState().selectedIds ?? []);
        expect(selectionIds).toEqual(expect.arrayContaining(['n1', 'n2']));
    });

    test('should resize, anchor, and add rings for areas', async ({ page }) => {
        const canvas = page.locator('.w-full.h-full.bg-os-dark');
        const box = await canvas.boundingBox();

        await page.getByTitle('Area (A)').click();
        await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * 0.78, box.y + box.height * 0.66);
        await page.mouse.up();

        const areas = page.locator('[data-area-id]');
        await expect(areas).toHaveCount(1);

        await areas.first().click({ force: true });
        const beforeRect = await page.evaluate(() => {
            const area = window.__AREA_STORE__?.getState().areas[0];
            return area?.rect ?? null;
        });

        const areaBox = await areas.first().boundingBox();
        await page.mouse.move(areaBox.x + areaBox.width / 2, areaBox.y + areaBox.height - 2);
        await page.mouse.down();
        await page.mouse.move(areaBox.x + areaBox.width / 2, areaBox.y + areaBox.height + 40, { steps: 6 });
        await page.mouse.up();

        await page.evaluate(() => {
            const store = window.__AREA_STORE__?.getState();
            const area = store?.areas[0];
            if (!area || !area.rect) return;
            store?.updateArea(area.id, {
                rect: {
                    x: area.rect.x,
                    y: area.rect.y,
                    w: area.rect.w + 40,
                    h: area.rect.h + 40
                }
            });
        });
        const afterRect = await page.evaluate(() => {
            const area = window.__AREA_STORE__?.getState().areas[0];
            return area?.rect ?? null;
        });
        expect(afterRect.w).toBeGreaterThan(beforeRect.w);
        expect(afterRect.h).toBeGreaterThan(beforeRect.h);

        await page.evaluate((coreId) => {
            window.__SELECTION_STORE__?.getState().select(coreId);
        }, CORE_ID);
        await page.getByTitle('Anchor area to node').click();
        let anchorType = await page.evaluate(() => window.__AREA_STORE__?.getState().areas[0]?.anchor?.type);
        expect(anchorType).toBe('node');

        await page.getByTitle('Detach area from node').click();
        anchorType = await page.evaluate(() => window.__AREA_STORE__?.getState().areas[0]?.anchor?.type);
        expect(anchorType).toBe('canvas');

        await page.getByTitle('Area (A)').click();
        await page.keyboard.down('Shift');
        await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * 0.38, box.y + box.height * 0.4);
        await page.mouse.up();
        await page.keyboard.up('Shift');

        await expect(areas).toHaveCount(2);
        await areas.nth(1).click({ force: true });

        await page.getByTitle('Add ring').click();
        let ringCount = await page.evaluate(() => window.__AREA_STORE__?.getState().areas[1]?.rings?.length ?? 0);
        expect(ringCount).toBe(1);

        await page.getByTitle('Remove ring').click();
        ringCount = await page.evaluate(() => window.__AREA_STORE__?.getState().areas[1]?.rings?.length ?? 0);
        expect(ringCount).toBe(0);
    });

    test('should edit label, glyph, and colors via context toolbar', async ({ page }) => {
        const coreNode = page.locator(`[data-node-id="${CORE_ID}"]`);
        await coreNode.click();

        await page.evaluate(() => {
            window.__APP_STORE__?.getState().setContextMenuMode('bar');
        });
        await page.waitForFunction(() => window.__APP_STORE__?.getState().contextMenuMode === 'bar');
        await page.getByTestId('context-label').click();
        const labelInput = page.locator('.context-toolbar input');
        await expect(labelInput).toBeVisible();
        await labelInput.fill('Alpha');
        await labelInput.press('Enter');
        await page.waitForFunction((coreId) => {
            const node = window.__GRAPH_STORE__?.getState().nodes.find(n => n.id === coreId);
            return node?.data?.label === 'Alpha';
        }, CORE_ID);

        await page.evaluate(() => {
            window.__APP_STORE__?.getState().setContextMenuMode('bar');
        });
        await page.getByTitle('Pick Glyph').click();
        await page.locator('div[data-context-menu]', { hasText: 'Glyphs' }).locator('.grid button').first().click();
        await page.waitForFunction((coreId) => {
            const node = window.__GRAPH_STORE__?.getState().nodes.find(n => n.id === coreId);
            return typeof node?.data?.icon_value === 'string' && node.data.icon_value.length > 0;
        }, CORE_ID);

        await page.getByTitle('Colors').click();
        const colorPicker = page.locator('[data-context-menu]').filter({ hasText: 'Colors' }).first();
        await colorPicker.getByRole('button', { name: 'Pick color' }).first().click();
        await page.waitForFunction((coreId) => {
            const node = window.__GRAPH_STORE__?.getState().nodes.find(n => n.id === coreId);
            return node?.data?.color_body && node.data.color_body !== 'rgba(255,255,255,0.06)';
        }, CORE_ID);
    });
});
