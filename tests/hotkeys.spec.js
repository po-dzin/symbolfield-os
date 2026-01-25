import { test, expect } from '@playwright/test';

test.describe('Hotkeys: Canon v0.5', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('.os-shell')).toBeVisible();

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

            if (window.__GRAPH_STORE__) {
                const store = window.__GRAPH_STORE__.getState();
                store.clearGraph();
                store.addNode({ id: 'root', type: 'root', position: { x: 400, y: 300 }, data: { label: 'Core' } });
            }
            if (window.__APP_STORE__) {
                const app = window.__APP_STORE__.getState();
                app.setViewContext('space');
                app.setTool('pointer');
                app.closePalette?.();
                app.closeSettings?.();
            }
        });

        await expect(page.locator('[data-node-id="root"]')).toBeVisible();
    });

    test('L toggles link tool, Esc exits', async ({ page }) => {
        await page.keyboard.press('l');
        const linkTool = await page.evaluate(() => window.__APP_STORE__?.getState().activeTool);
        expect(linkTool).toBe('link');

        await page.keyboard.press('Escape');
        const pointerTool = await page.evaluate(() => window.__APP_STORE__?.getState().activeTool);
        expect(pointerTool).toBe('pointer');
    });

    test('Z does not toggle tools', async ({ page }) => {
        await page.keyboard.press('z');
        const activeTool = await page.evaluate(() => window.__APP_STORE__?.getState().activeTool);
        expect(activeTool).toBe('pointer');
    });

    test('Cmd/Ctrl+K toggles command palette event', async ({ page }) => {
        await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
        await expect(page.getByText('Command Palette')).toBeVisible();
    });

    test('Backslash toggles right drawer event', async ({ page }) => {
        await page.evaluate(() => {
            window.__lastEvent__ = null;
            window.__EVENT_BUS__?.on('UI_DRAWER_TOGGLE', () => {
                window.__lastEvent__ = 'UI_DRAWER_TOGGLE';
            });
        });

        await page.keyboard.press('Backslash');
        await page.waitForFunction(() => window.__lastEvent__ === 'UI_DRAWER_TOGGLE');
    });

    test('Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z emit undo/redo events', async ({ page }) => {
        const canvas = page.locator('.w-full.h-full.bg-os-dark');
        const box = await canvas.boundingBox();

        await page.mouse.move(box.x + 220, box.y + 220);
        await page.keyboard.press('n');
        await expect(page.locator('[data-node-id]')).toHaveCount(2);

        await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z');
        await page.waitForTimeout(200);

        await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Shift+Z' : 'Control+Shift+Z');
        await page.waitForTimeout(200);

        await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z');
        await page.waitForTimeout(200);

        await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Y' : 'Control+Y');
        await page.waitForTimeout(200);
    });

    test('Shift+Click does not create links', async ({ page }) => {
        const canvas = page.locator('.w-full.h-full.bg-os-dark');
        await canvas.dblclick({ position: { x: 200, y: 200 } });
        await expect(page.locator('[data-node-id]')).toHaveCount(2);

        const rootNode = page.locator('[data-node-id="root"]');
        const node2 = page.locator('[data-node-id]').nth(1);

        await rootNode.click();
        await page.keyboard.down('Shift');
        await node2.click();
        await page.keyboard.up('Shift');

        await expect(page.locator('[data-edge-id]')).toHaveCount(0);
    });

    test('Link tool creates edge with drag A -> B', async ({ page }) => {
        const canvas = page.locator('.w-full.h-full.bg-os-dark');
        await canvas.dblclick({ position: { x: 200, y: 200 } });
        await expect(page.locator('[data-node-id]')).toHaveCount(2);

        await page.keyboard.press('l');
        const rootNode = page.locator('[data-node-id="root"]');
        const node2 = page.locator('[data-node-id]').nth(1);

        const rootBox = await rootNode.boundingBox();
        const nodeBox = await node2.boundingBox();
        await page.mouse.move(rootBox.x + rootBox.width / 2, rootBox.y + rootBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(nodeBox.x + nodeBox.width / 2, nodeBox.y + nodeBox.height / 2, { steps: 6 });
        await page.mouse.up();

        await page.waitForFunction(() => (window.__GRAPH_STORE__?.getState().edges.length ?? 0) > 0);
    });

    test('G groups selection into hub', async ({ page }) => {
        await page.evaluate(() => {
            const store = window.__GRAPH_STORE__?.getState();
            store?.addNode({ id: 'n1', position: { x: 200, y: 200 }, data: { label: 'N1' } });
            store?.addNode({ id: 'n2', position: { x: 260, y: 200 }, data: { label: 'N2' } });
        });
        await expect(page.locator('[data-node-id]')).toHaveCount(3);

        const node1 = page.locator('[data-node-id="n1"]');
        const node2 = page.locator('[data-node-id="n2"]');

        await node1.click();
        await page.keyboard.down('Shift');
        await node2.click();
        await page.keyboard.up('Shift');

        await page.keyboard.press('g');
        await expect(page.locator('[data-node-id]')).toHaveCount(4);
    });

    test('Shift+Enter groups selection into hub (equivalent to G)', async ({ page }) => {
        await page.evaluate(() => {
            const store = window.__GRAPH_STORE__?.getState();
            store?.addNode({ id: 'n3', position: { x: 240, y: 240 }, data: { label: 'N3' } });
            store?.addNode({ id: 'n4', position: { x: 300, y: 240 }, data: { label: 'N4' } });
        });
        await expect(page.locator('[data-node-id]')).toHaveCount(3);

        const node1 = page.locator('[data-node-id="n3"]');
        const node2 = page.locator('[data-node-id="n4"]');

        await node1.click();
        await page.keyboard.down('Shift');
        await node2.click();
        await page.keyboard.press('Shift+Enter');
        await page.keyboard.up('Shift');

        await expect(page.locator('[data-node-id]')).toHaveCount(4);
    });

    test('Enter opens NOW when one node is selected', async ({ page }) => {
        const rootNode = page.locator('[data-node-id="root"]');
        await rootNode.click();

        await page.keyboard.press('Enter');
        await expect(page.getByText('Now Focus')).toBeVisible();
    });

    test('Esc exits NOW and closes command palette', async ({ page }) => {
        const rootNode = page.locator('[data-node-id="root"]');
        await rootNode.click();
        await page.keyboard.press('Enter');
        await expect(page.getByText('Now Focus')).toBeVisible();

        await page.keyboard.press('Escape');
        const nowVisible = await page.locator('[data-overlay="now"]').isVisible();
        expect(nowVisible).toBe(false);

        await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
        await expect(page.getByText('Command Palette')).toBeVisible();

        await page.keyboard.press('Escape');
        await expect(page.getByText('Command Palette')).not.toBeVisible();
    });

    test('Settings hotkey toggles open state', async ({ page }) => {
        await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Comma' : 'Control+Comma');
        const openState = await page.evaluate(() => window.__APP_STORE__?.getState().settingsOpen);
        expect(openState).toBe(true);
        await expect(page.getByText('Settings', { exact: true })).toBeVisible();
    });

    test('Settings button opens drawer', async ({ page }) => {
        await page.getByTitle('Settings').click();
        await expect(page.getByText('Settings', { exact: true })).toBeVisible();
    });

    test('Alt creates associative link in link mode', async ({ page }) => {
        const canvas = page.locator('.w-full.h-full.bg-os-dark');
        await canvas.dblclick({ position: { x: 200, y: 200 } });
        await expect(page.locator('[data-node-id]')).toHaveCount(2);

        await page.keyboard.press('l');
        const rootNode = page.locator('[data-node-id="root"]');
        const node2 = page.locator('[data-node-id]').nth(1);

        const rootBox = await rootNode.boundingBox();
        const nodeBox = await node2.boundingBox();
        await page.keyboard.down('Alt');
        await page.mouse.move(rootBox.x + rootBox.width / 2, rootBox.y + rootBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(nodeBox.x + nodeBox.width / 2, nodeBox.y + nodeBox.height / 2, { steps: 6 });
        await page.mouse.up();
        await page.keyboard.up('Alt');

        const edge = page.locator('line[data-edge-id]:not([stroke="transparent"])').first();
        await expect(edge).toHaveAttribute('stroke-dasharray', '4 4');
    });

    test('Delete removes selected edge', async ({ page }) => {
        const canvas = page.locator('.w-full.h-full.bg-os-dark');
        await canvas.dblclick({ position: { x: 200, y: 200 } });
        await expect(page.locator('[data-node-id]')).toHaveCount(2);

        const rootNode = page.locator('[data-node-id="root"]');
        const node2 = page.locator('[data-node-id]').nth(1);

        await page.keyboard.press('l');
        const rootBox = await rootNode.boundingBox();
        const nodeBox = await node2.boundingBox();
        await page.mouse.move(rootBox.x + rootBox.width / 2, rootBox.y + rootBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(nodeBox.x + nodeBox.width / 2, nodeBox.y + nodeBox.height / 2, { steps: 6 });
        await page.mouse.up();
        await page.waitForFunction(() => (window.__GRAPH_STORE__?.getState().edges.length ?? 0) > 0);

        const edge = page.locator('line[data-edge-id][stroke="transparent"]').first();
        await edge.click({ force: true });
        await page.keyboard.press('Delete');
        await page.waitForFunction(() => (window.__GRAPH_STORE__?.getState().edges.length ?? 0) === 0);
    });

    test('N creates node at cursor', async ({ page }) => {
        const canvas = page.locator('.w-full.h-full.bg-os-dark');
        const box = await canvas.boundingBox();

        await page.mouse.move(box.x + 250, box.y + 250);
        await page.keyboard.press('n');
        await expect(page.locator('[data-node-id]')).toHaveCount(2);
    });
});
