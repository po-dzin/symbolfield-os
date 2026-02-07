/**
 * tests/regression.spec.js
 * Critical interaction regressions.
 */
import { test, expect } from '@playwright/test';

const CORE_ID = 'core';

const seedSpace = async (page) => {
    await page.waitForFunction(() => window.__APP_STORE__ && window.__GRAPH_STORE__);
    await page.evaluate((coreId) => {
        const graph = window.__GRAPH_STORE__?.getState();
        const app = window.__APP_STORE__?.getState();
        const selection = window.__SELECTION_STORE__?.getState();
        const areas = window.__AREA_STORE__?.getState();

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

        graph?.clearGraph();
        graph?.addNode({ id: coreId, type: 'core', position: { x: 400, y: 300 }, data: { label: 'Core' } });

        app?.setViewContext('space');
        app?.setTool('pointer');
        app?.closePalette?.();
        app?.closeSettings?.();

        selection?.clear?.();
        areas?.clearRegions?.();
        areas?.clearFocusedArea?.();
    }, CORE_ID);
};

const createSpaceViaStation = async (page) => {
    // Ensure we are on Station view first.
    await page.evaluate(() => {
        window.__APP_STORE__?.getState().setViewContext('home');
    });
    const newSpaceButton = page.getByRole('button', { name: /\+\s*New Space/i }).first();
    await expect(newSpaceButton).toBeVisible();

    await newSpaceButton.click();
    await expect(page.locator('.nodes-layer')).toBeAttached();

    const headerInput = page.locator('input[placeholder="Untitled"]').first();
    await expect(headerInput).toBeVisible();
    const name = await headerInput.inputValue();

    const spaceId = await page.evaluate(() => window.__APP_STORE__?.getState().currentSpaceId);
    return { name, spaceId };
};

const openStationDrawer = async (page) => {
    await page.evaluate(() => {
        window.__APP_STORE__?.getState().setViewContext('home');
    });
    await page.mouse.move(2, 120);
    await expect(page.getByText('Recent', { exact: true })).toBeVisible();
};

test.describe('Regression: Critical Flows', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await seedSpace(page);
    });

    test('Selection should trigger Context Toolbar', async ({ page }) => {
        // 1. Locate core node
        const coreNode = page.locator(`[data-node-id="${CORE_ID}"]`);
        await expect(coreNode).toBeVisible();

        // 2. Click it
        await coreNode.click();

        // 3. Verify selection visual state (border/scale)
        // (This is harder to test via styles without screenshot, but we can check if it has the "selected" class logic)
        // Actually, we look for the Context Toolbar which appears on selection.
        await expect(page.getByText('Core').first()).toBeVisible();

        // 4. Verify Context Actions
        await expect(page.locator('button[title="Enter Node"]')).toBeVisible();
    });

    test('Radial context menu renders and action menu opens', async ({ page }) => {
        await page.evaluate(() => window.__APP_STORE__?.getState().setContextMenuMode('radial'));

        const coreNode = page.locator(`[data-node-id="${CORE_ID}"]`);
        await coreNode.click();

        await expect(page.getByText('Core').first()).toBeVisible();

        const actionsButton = page.getByTitle('Actions');
        await expect(actionsButton).toBeVisible();
        await actionsButton.click();

        await expect(page.getByRole('button', { name: /Delete/i })).toBeVisible();
    });

    test('Dive/Enter NOW works via Double Click', async ({ page }) => {
        const coreNode = page.locator(`[data-node-id="${CORE_ID}"]`);
        await expect(coreNode).toBeVisible();

        // Action: Double Click
        await coreNode.dblclick();

        // Expect: Now Overlay Presence
        const overlay = page.getByText('Now Focus');
        await expect(overlay).toBeVisible();

        // Expect: Node Label in Header
        await expect(page.getByRole('heading', { name: 'Core' })).toBeVisible();

        // Action: Exit
        await page.getByRole('button', { name: '←' }).click();
        await expect(overlay).not.toBeVisible();
    });

    test('Settings drawer toggles and context menu mode switches', async ({ page }) => {
        await page.getByTitle('Settings').click();
        await expect(page.getByText('Settings', { exact: true })).toBeVisible();

        const contextRow = page.getByText('Context menu mode').locator('..');
        const contextSwitch = contextRow.getByRole('switch');
        await expect(contextSwitch).toBeVisible();

        await contextSwitch.click();
        let mode = await page.evaluate(() => window.__APP_STORE__?.getState().contextMenuMode);
        expect(mode).toBe('radial');

        await contextSwitch.click();
        mode = await page.evaluate(() => window.__APP_STORE__?.getState().contextMenuMode);
        expect(mode).toBe('bar');

        const settingsPanel = page.locator('.glass-panel', { hasText: 'Settings' });
        await settingsPanel.getByRole('button', { name: '✕' }).click();
        await expect(page.getByText('Settings', { exact: true })).not.toBeVisible();
    });

    test('Omni input opens and closes via UI', async ({ page }) => {
        await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
        await expect(page.getByText('Omni Input — Expanded')).toBeVisible();

        const palette = page.locator('.glass-panel', { hasText: 'Omni Input — Expanded' });
        await palette.getByRole('button', { name: '✕' }).click();
        await expect(page.getByText('Omni Input — Expanded')).not.toBeVisible();
    });

    test('Omni input runs quick command and shows navigation hints', async ({ page }) => {
        await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
        await expect(page.getByText('Omni Input — Expanded')).toBeVisible();
        await expect(page.getByText('↑↓ navigate')).toBeVisible();

        const palette = page.locator('.glass-panel', { hasText: 'Omni Input — Expanded' });
        const input = palette.getByPlaceholder('Search or type /command...');
        await input.fill('link');
        await page.keyboard.press('Enter');

        const activeTool = await page.evaluate(() => window.__APP_STORE__?.getState().activeTool);
        expect(activeTool).toBe('link');
    });

    test('Backspace moves selected station space to trash (soft delete)', async ({ page }) => {
        await page.evaluate(() => window.__APP_STORE__?.getState().setViewContext('home'));

        const newSpaceButton = page.getByRole('button', { name: /\+\s*New Space/i }).first();
        await expect(newSpaceButton).toBeVisible();
        await newSpaceButton.click();

        const spaceId = await page.evaluate(() => window.__APP_STORE__?.getState().currentSpaceId);
        expect(spaceId).toBeTruthy();

        await page.evaluate(() => window.__APP_STORE__?.getState().setViewContext('home'));

        const spaceName = await page.evaluate((id) => {
            try {
                const raw = localStorage.getItem('sf_spaces_index');
                const list = raw ? JSON.parse(raw) : [];
                const found = list.find(item => item.id === id);
                return found?.name ?? 'New Space';
            } catch {
                return 'New Space';
            }
        }, spaceId);

        await page.on('dialog', dialog => dialog.accept());
        const stationLabel = page.locator('svg text').filter({ hasText: spaceName }).first();
        await expect(stationLabel).toBeVisible();
        await stationLabel.click();
        await page.keyboard.press('Backspace');

        await page.waitForFunction((id) => {
            try {
                const raw = localStorage.getItem('sf_spaces_index');
                const list = raw ? JSON.parse(raw) : [];
                return list.find(item => item.id === id)?.trashed === true;
            } catch {
                return false;
            }
        }, spaceId);
    });

    test('Tool dock buttons switch active tool', async ({ page }) => {
        await page.getByTitle('Link (L)').click();
        let activeTool = await page.evaluate(() => window.__APP_STORE__?.getState().activeTool);
        expect(activeTool).toBe('link');

        await page.getByTitle('Area (A)').click();
        activeTool = await page.evaluate(() => window.__APP_STORE__?.getState().activeTool);
        expect(activeTool).toBe('area');

        await page.getByTitle('Pointer (P)').click();
        activeTool = await page.evaluate(() => window.__APP_STORE__?.getState().activeTool);
        expect(activeTool).toBe('pointer');
    });

    test('Time chip toggles NowCore drawer and scale buttons respond', async ({ page }) => {
        const timeChip = page.locator('.os-shell .absolute.bottom-4.right-4');
        await timeChip.click();
        await expect(page.getByText('NowCore')).toBeVisible();
        await page.getByRole('button', { name: 'Close NowCore' }).click();
        await expect(page.getByText('NowCore')).not.toBeVisible();

        const weekButton = page.getByRole('button', { name: 'w', exact: true });
        await weekButton.click();
        await expect(weekButton).toHaveClass(/bg-white\/20/);
    });

    test('Area tool creates rect + circle regions and focus toggles', async ({ page }) => {
        const canvas = page.locator('.w-full.h-full.bg-os-dark');
        const box = await canvas.boundingBox();

        await page.getByTitle('Area (A)').click();
        let activeTool = await page.evaluate(() => window.__APP_STORE__?.getState().activeTool);
        expect(activeTool).toBe('area');

        const startX = box.x + box.width * 0.65;
        const startY = box.y + box.height * 0.55;
        const endX = box.x + box.width * 0.82;
        const endY = box.y + box.height * 0.7;

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(endX, endY);
        await page.mouse.up();

        const areas = page.locator('[data-area-id]');
        await expect(areas).toHaveCount(1);

        activeTool = await page.evaluate(() => window.__APP_STORE__?.getState().activeTool);
        expect(activeTool).toBe('pointer');

        await page.getByTitle('Area (A)').click();
        await page.keyboard.down('Shift');
        await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.35);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5);
        await page.mouse.up();
        await page.keyboard.up('Shift');

        await expect(areas).toHaveCount(2);
        const shapes = await page.evaluate(() => window.__AREA_STORE__?.getState().areas.map(area => area.shape));
        expect(shapes).toContain('circle');

        const areaId = await page.evaluate(() => {
            const store = window.__AREA_STORE__?.getState();
            const id = store?.areas?.[0]?.id;
            if (id) {
                store?.setSelectedAreaId(id);
            }
            return id ?? null;
        });
        expect(areaId).toBeTruthy();
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => window.__AREA_STORE__?.getState().focusedAreaId !== null);
        let focusedAreaId = await page.evaluate(() => window.__AREA_STORE__?.getState().focusedAreaId);
        expect(focusedAreaId).not.toBeNull();

        await page.keyboard.press('Escape');
        await page.waitForFunction(() => window.__AREA_STORE__?.getState().focusedAreaId === null);
        focusedAreaId = await page.evaluate(() => window.__AREA_STORE__?.getState().focusedAreaId);
        expect(focusedAreaId).toBeNull();
    });

    test('Station navigation returns to home and back to space', async ({ page }) => {
        await page.getByTitle('Return to Station').click();
        await expect(page.getByPlaceholder('Search or type /command...')).toBeVisible();

        await page.getByRole('button', { name: 'New Space' }).click();
        const viewContext = await page.evaluate(() => window.__APP_STORE__?.getState().viewContext);
        expect(viewContext).toBe('space');
        await expect(page.locator('.nodes-layer')).toBeAttached();
    });

    test('Station recents and templates open spaces', async ({ page }) => {
        await openStationDrawer(page);

        await page.getByRole('button', { name: /Playground/i }).click();
        let viewContext = await page.evaluate(() => window.__APP_STORE__?.getState().viewContext);
        expect(viewContext).toBe('space');

        await openStationDrawer(page);
        await expect(page.getByText('Templates', { exact: true })).toBeVisible();
        await page.getByRole('button', { name: /Default Space/i }).click();
        viewContext = await page.evaluate(() => window.__APP_STORE__?.getState().viewContext);
        expect(viewContext).toBe('space');
    });

    test('Station dropdown rename updates space name', async ({ page }) => {
        const created = await createSpaceViaStation(page);
        const oldName = created.name;
        const newName = `${oldName} Renamed`;

        await page.getByTitle('Return to Station').click();
        await openStationDrawer(page);

        const row = page
            .locator('h3', { hasText: oldName })
            .first()
            .locator('xpath=ancestor::div[contains(@class,"relative")]')
            .first();
        await row.locator('button[aria-label="Space actions"]').first().click();

        page.once('dialog', (dialog) => dialog.accept(newName));
        await page.getByRole('button', { name: 'Rename' }).click();

        await expect(page.getByRole('button', { name: new RegExp(newName) }).first()).toBeVisible();
    });

    test('Space header rename persists to Station recents', async ({ page }) => {
        const created = await createSpaceViaStation(page);
        const newName = `Core ${Date.now().toString().slice(-4)}`;

        const headerInput = page.locator('input[placeholder="Untitled"]').first();
        await headerInput.click();
        await headerInput.fill(newName);
        await headerInput.press('Enter');
        await expect(headerInput).toHaveValue(newName);

        await page.getByTitle('Return to Station').click();
        await openStationDrawer(page);
        await expect(page.getByRole('button', { name: new RegExp(newName) }).first()).toBeVisible();
    });

    test('Station rename enforces unique names', async ({ page }) => {
        const first = await createSpaceViaStation(page);
        const second = await createSpaceViaStation(page);

        await page.getByTitle('Return to Station').click();
        await openStationDrawer(page);

        const row = page
            .locator('h3', { hasText: second.name })
            .first()
            .locator('xpath=ancestor::div[contains(@class,"relative")]')
            .first();
        await row.locator('button[aria-label="Space actions"]').first().click();

        page.once('dialog', (dialog) => dialog.accept(first.name));
        await page.getByRole('button', { name: 'Rename' }).click();

        const renamed = await page.evaluate((spaceId) => {
            try {
                const raw = localStorage.getItem('sf_spaces_index');
                if (!raw) return null;
                const list = JSON.parse(raw);
                return list.find(s => s.id === spaceId)?.name ?? null;
            } catch {
                return null;
            }
        }, second.spaceId);

        expect(renamed).toBeTruthy();
        expect(renamed).not.toBe(first.name);
        expect(renamed.startsWith(first.name)).toBe(true);
    });
});
