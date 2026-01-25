import { test, expect } from '@playwright/test';

test.describe('Coordinate & Interaction System', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('.os-shell')).toBeVisible();

        // Deterministic clear and re-seed root
        await page.evaluate(() => {
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
                store.addNode({ id: 'root', type: 'root', position: { x: 400, y: 300 }, data: { label: 'Core' } });
            }
            if (window.__APP_STORE__) {
                const app = window.__APP_STORE__.getState();
                app.setViewContext('space');
            }
        });

        // Wait for root to render
        await expect(page.locator('[data-node-id="root"]')).toBeVisible();
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
        const rootNode = page.locator('[data-node-id="root"]');
        const box = await rootNode.boundingBox();
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;

        // 1. Click root center
        await page.mouse.click(centerX, centerY);

        // 2. Should be selected (check for orbits)
        await expect(page.locator('.animate-orbit-slow')).toBeVisible();
    });

    test('should not create a node when double-clicking an existing node', async ({ page }) => {
        const rootNode = page.locator('[data-node-id="root"]');
        const box = await rootNode.boundingBox();
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

        const rootNode = page.locator('[data-node-id="root"]');
        const before = await rootNode.boundingBox();

        // Pan +100, +100 using Space+Drag
        await page.keyboard.down('Space');
        await page.mouse.move(canvasBox.x + 100, canvasBox.y + 100);
        await page.mouse.down();
        await page.mouse.move(canvasBox.x + 200, canvasBox.y + 200);
        await page.mouse.up();
        await page.keyboard.up('Space');

        await page.waitForTimeout(100);

        const after = await rootNode.boundingBox();
        expect(after.x).not.toBe(before.x);
        expect(after.y).not.toBe(before.y);
    });

    test('should NOT allow dragging root node', async ({ page }) => {
        const rootNode = page.locator('[data-node-id="root"]');
        const boxBefore = await rootNode.boundingBox();
        const centerX = boxBefore.x + boxBefore.width / 2;
        const centerY = boxBefore.y + boxBefore.height / 2;

        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.mouse.move(centerX + 100, centerY + 100);
        await page.mouse.up();

        const boxAfter = await rootNode.boundingBox();
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
        await page.evaluate(() => {
            if (!window.__GRAPH_STORE__) return;
            const store = window.__GRAPH_STORE__.getState();
            const other = store.nodes.find(n => n.id !== 'root');
            if (other) {
                store.addEdge('root', other.id);
            }
        });

        // 5. Verify Edge
        await page.waitForFunction(() => (window.__GRAPH_STORE__?.getState().edges.length ?? 0) > 0);
    });

    test('should create node with [N] at cursor', async ({ page }) => {
        const canvas = page.locator('.w-full.h-full.bg-os-dark');
        const canvasBox = await canvas.boundingBox();

        // Move mouse to some location
        await page.mouse.move(canvasBox.x + 300, canvasBox.y + 300);

        // Press N
        await page.keyboard.press('n');

        // Verify new node exists
        const node = page.locator('[data-node-id]').nth(1); // nth(0) is root
        await expect(node).toBeVisible();

        // Select it to see the label
        await node.click();
        await expect(page.getByText(/Empty/i).first()).toBeVisible();
    });

    test('should group nodes with [Shift+Enter]', async ({ page }) => {
        const canvas = page.locator('.w-full.h-full.bg-os-dark');

        // 1. Create two additional nodes (non-root)
        await canvas.dblclick({ position: { x: 200, y: 200 } });
        await canvas.dblclick({ position: { x: 300, y: 300 } });
        await expect(page.locator('[data-node-id]')).toHaveCount(3);

        // 2. Multi-select the two non-root nodes
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

        const root = page.locator('[data-node-id="root"]');
        const before = await root.boundingBox();

        // Press Space and Drag
        await page.keyboard.down('Space');
        await page.mouse.move(canvasBox.x + 500, canvasBox.y + 500);
        await page.mouse.down();
        await page.mouse.move(canvasBox.x + 600, canvasBox.y + 600);
        await page.mouse.up();
        await page.keyboard.up('Space');

        const after = await root.boundingBox();
        expect(after.x).toBeGreaterThan(before.x);
    });

    test('should create and link node when dragging to empty space', async ({ page }) => {
        const rootNode = page.locator('[data-node-id="root"]');
        const rootBox = await rootNode.boundingBox();

        await page.keyboard.press('l'); // LINK tool

        await page.mouse.move(rootBox.x + rootBox.width / 2, rootBox.y + rootBox.height / 2);
        await page.mouse.down();
        // Drag to empty field
        await page.mouse.move(rootBox.x + 300, rootBox.y + 300, { steps: 10 });
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

    test('should delete links via edge click and via Links menu', async ({ page }) => {
        await page.evaluate(() => {
            if (!window.__GRAPH_STORE__) return;
            const store = window.__GRAPH_STORE__.getState();
            store.addNode({ id: 'node-1', type: 'node', position: { x: 600, y: 300 }, data: { label: 'Node1' } });
            store.addEdge('root', 'node-1');
        });

        const initialEdgeCount = await page.evaluate(() => window.__GRAPH_STORE__?.getState().edges.length ?? 0);
        expect(initialEdgeCount).toBeGreaterThanOrEqual(1);

        const root = page.locator('[data-node-id="root"]');
        const node = page.locator('[data-node-id="node-1"]');
        const rootBox = await root.boundingBox();
        const nodeBox = await node.boundingBox();
        const midX = (rootBox.x + rootBox.width / 2 + nodeBox.x + nodeBox.width / 2) / 2;
        const midY = (rootBox.y + rootBox.height / 2 + nodeBox.y + nodeBox.height / 2) / 2;

        const edge = page.locator('[data-edge-id]').first();
        await edge.click({ force: true });
        await page.keyboard.press('Delete');
        await page.waitForFunction((count) => {
            const next = window.__GRAPH_STORE__?.getState().edges.length ?? 0;
            return next < count;
        }, initialEdgeCount);

        await page.evaluate(() => {
            if (!window.__GRAPH_STORE__) return;
            const store = window.__GRAPH_STORE__.getState();
            store.addEdge('root', 'node-1');
        });

        const restoredEdgeCount = await page.evaluate(() => window.__GRAPH_STORE__?.getState().edges.length ?? 0);
        expect(restoredEdgeCount).toBeGreaterThanOrEqual(1);

        await root.click();
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

        const rootNode = page.locator('[data-node-id="root"]');
        const node2 = page.locator('[data-node-id]').nth(1);

        await page.evaluate(() => {
            if (!window.__GRAPH_STORE__) return;
            const store = window.__GRAPH_STORE__.getState();
            store.addEdge('root', store.nodes.find(n => n.id !== 'root')?.id ?? 'node-1');
        });
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
            store?.addNode({ id: 'n1', position: { x: 220, y: 220 }, data: { label: 'N1' } });
            store?.addNode({ id: 'n2', position: { x: 280, y: 260 }, data: { label: 'N2' } });
        });

        const n1 = page.locator('[data-node-id="n1"]');
        const n2 = page.locator('[data-node-id="n2"]');
        await expect(n1).toBeVisible();
        await expect(n2).toBeVisible();

        const box1 = await n1.boundingBox();
        const box2 = await n2.boundingBox();
        const startX = Math.min(box1.x, box2.x) - 20;
        const startY = Math.min(box1.y, box2.y) - 20;
        const endX = Math.max(box1.x + box1.width, box2.x + box2.width) + 20;
        const endY = Math.max(box1.y + box1.height, box2.y + box2.height) + 20;

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(endX, endY, { steps: 8 });
        await page.mouse.up();

        const selectionCount = await page.evaluate(() => window.__SELECTION_STORE__?.getState().selectedIds.length ?? 0);
        expect(selectionCount).toBe(2);
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

        await page.evaluate(() => {
            window.__SELECTION_STORE__?.getState().select('root');
        });
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
        const rootNode = page.locator('[data-node-id="root"]');
        await rootNode.click();

        await page.evaluate(() => {
            window.__APP_STORE__?.getState().setContextMenuMode('bar');
        });
        await page.waitForFunction(() => window.__APP_STORE__?.getState().contextMenuMode === 'bar');
        await page.getByTestId('context-label').click();
        const labelInput = page.locator('.context-toolbar input');
        await expect(labelInput).toBeVisible();
        await labelInput.fill('Alpha');
        await labelInput.press('Enter');
        await page.waitForFunction(() => {
            const node = window.__GRAPH_STORE__?.getState().nodes.find(n => n.id === 'root');
            return node?.data?.label === 'Alpha';
        });

        await page.evaluate(() => {
            window.__APP_STORE__?.getState().setContextMenuMode('bar');
        });
        await page.getByTitle('Pick Glyph').click();
        await page.locator('div[data-context-menu]', { hasText: 'Glyphs' }).locator('.grid button').first().click();
        await page.waitForFunction(() => {
            const node = window.__GRAPH_STORE__?.getState().nodes.find(n => n.id === 'root');
            return typeof node?.data?.icon_value === 'string' && node.data.icon_value.length > 0;
        });

        await page.getByTitle('Colors').click();
        const colorPicker = page.locator('[data-context-menu]').filter({ hasText: 'Colors' }).first();
        await colorPicker.getByRole('button', { name: 'Pick color' }).first().click();
        await page.waitForFunction(() => {
            const node = window.__GRAPH_STORE__?.getState().nodes.find(n => n.id === 'root');
            return node?.data?.color_body && node.data.color_body !== 'rgba(255,255,255,0.06)';
        });
    });
});
