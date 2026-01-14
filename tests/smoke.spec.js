/**
 * tests/smoke.spec.js
 * Basic "Can I see the app?" tests.
 */
import { test, expect } from '@playwright/test';

test.describe('Smoke Test: App Loading', () => {
    test('App should load and render Shell', async ({ page }) => {
        await page.goto('/');

        // Check for Shell container
        const shell = page.locator('.os-shell');
        await expect(shell).toBeVisible();

        await page.evaluate(() => {
            if (window.__APP_STORE__) {
                const app = window.__APP_STORE__.getState();
                app.setViewContext('space');
            }
        });

        // Check for Main Views
        await expect(page.locator('.nodes-layer')).toBeAttached(); // Canvas Layer exists
        await expect(page.locator('.os-shell')).toBeVisible();
        await expect(page.locator('button[title="Pointer"]')).toBeVisible(); // Dock

        // Check for Initial Nodes (Core/Web/Life)
        // We expect 3 nodes from initial seed
        const nodes = page.locator('[data-node-id]');
        await expect(nodes).toHaveCount(3);
    });
});
