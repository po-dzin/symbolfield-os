import { test, expect } from '@playwright/test';

test.describe('Coordinate & Interaction System', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('.os-shell')).toBeVisible();

        // Deterministic clear and re-seed root
        await page.evaluate(() => {
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

        expect(centerX).toBeCloseTo(canvasBox.x + 100, 0);
        expect(centerY).toBeCloseTo(canvasBox.y + 100, 0);
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

        // Pan +100, +100
        await page.mouse.move(canvasBox.x + 100, canvasBox.y + 100);
        await page.mouse.down();
        await page.mouse.move(canvasBox.x + 200, canvasBox.y + 200);
        await page.mouse.up();

        await page.waitForTimeout(100);

        const dotMatrix = page.locator('[data-grid="dot-matrix"]');
        await expect(dotMatrix).toHaveCSS('background-position', '100px 100px');
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
        await page.mouse.move(canvasBox.x + 500, canvasBox.y + 500);
        await page.mouse.down();
        await page.mouse.move(canvasBox.x + 600, canvasBox.y + 600);
        await page.mouse.up();

        // 3. Enter Tool: LINK
        await page.keyboard.press('l');

        // 4. Perform Click-to-Link
        const rootNode = page.locator('[data-node-id="root"]');
        const node2 = page.locator('[data-node-id]').nth(1);
        await rootNode.click();
        await node2.click();

        // 5. Verify Edge
        await page.waitForTimeout(200);
        await expect(page.locator('[data-edge-id]').first()).toBeVisible();
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

        await page.getByRole('button', { name: /Delete/i }).click();
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
        await expect(page.locator('[data-edge-id]')).toHaveCount(1);

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

        await expect(page.locator('[data-edge-id]')).toHaveCount(1);

        const root = page.locator('[data-node-id="root"]');
        const node = page.locator('[data-node-id="node-1"]');
        const rootBox = await root.boundingBox();
        const nodeBox = await node.boundingBox();
        const midX = (rootBox.x + rootBox.width / 2 + nodeBox.x + nodeBox.width / 2) / 2;
        const midY = (rootBox.y + rootBox.height / 2 + nodeBox.y + nodeBox.height / 2) / 2;

        await page.mouse.click(midX, midY);
        await page.keyboard.press('Delete');
        await expect(page.locator('[data-edge-id]')).toHaveCount(0);

        await page.evaluate(() => {
            if (!window.__GRAPH_STORE__) return;
            const store = window.__GRAPH_STORE__.getState();
            store.addEdge('root', 'node-1');
        });

        await expect(page.locator('[data-edge-id]')).toHaveCount(1);

        await root.click();
        await page.getByRole('button', { name: /Links/ }).click();
        await page.getByRole('button', { name: /Unlink/i }).first().click();
        await expect(page.locator('[data-edge-id]')).toHaveCount(0);
    });

    test('should clear edge selection on single node select', async ({ page }) => {
        const canvas = page.locator('.w-full.h-full.bg-os-dark');
        await canvas.dblclick({ position: { x: 200, y: 200 } });
        await expect(page.locator('[data-node-id]')).toHaveCount(2);

        const rootNode = page.locator('[data-node-id="root"]');
        const node2 = page.locator('[data-node-id]').nth(1);

        await page.keyboard.press('l');
        await rootNode.click();
        await node2.click();
        await expect(page.locator('[data-edge-id]')).toHaveCount(1);

        await page.keyboard.press('l');
        const edge = page.locator('[data-edge-id]').first();
        await edge.click();
        await expect(edge).toHaveAttribute('stroke-width', '2.2');

        await rootNode.click();
        await expect(edge).toHaveAttribute('stroke-width', '1.5');
    });
});
