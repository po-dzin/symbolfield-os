/**
 * tests/smoke.spec.js
 * Basic "Can I see the app?" tests.
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

test.describe('Smoke Test: App Loading', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await seedSpace(page);
    });

    test('App should load and render Shell', async ({ page }) => {
        // Check for Shell container
        const shell = page.locator('.os-shell');
        await expect(shell).toBeVisible();

        // Check for Main Views
        await expect(page.locator('.nodes-layer')).toBeAttached(); // Canvas Layer exists
        await expect(page.locator('.os-shell')).toBeVisible();
        await expect(page.locator('button[title="Pointer (P)"]')).toBeVisible(); // Dock

        // Check for Initial Nodes (Core/Web/Life)
        // We expect 1 seeded core node
        const nodes = page.locator('[data-node-id]');
        await expect(nodes).toHaveCount(1);
    });

    test('Core drawers and overlays open and close', async ({ page }) => {
        await page.getByTitle('Settings').click();
        await expect(page.getByText('Settings', { exact: true })).toBeVisible();
        await page.getByRole('button', { name: '✕' }).click();
        await expect(page.getByText('Settings', { exact: true })).not.toBeVisible();

        await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
        await expect(page.getByText('Omni Input — Expanded')).toBeVisible();
        const palette = page.locator('.glass-panel', { hasText: 'Omni Input — Expanded' });
        await palette.getByRole('button', { name: '✕' }).click();
        await expect(page.getByText('Omni Input — Expanded')).not.toBeVisible();

        const timeChip = page.locator('.os-shell .absolute.bottom-4.right-4');
        await timeChip.click();
        await expect(page.getByText('NowCore')).toBeVisible();
        await page.getByRole('button', { name: 'Close NowCore' }).click();
        await expect(page.getByText('NowCore')).not.toBeVisible();
    });
});
