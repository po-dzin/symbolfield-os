/**
 * tests/regression.spec.js
 * Critical interaction regressions.
 */
import { test, expect } from '@playwright/test';

test.describe('Regression: Critical Flows', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('Selection should trigger Context Toolbar', async ({ page }) => {
        // 1. Locate root node
        const rootNode = page.locator('[data-node-id="root"]');
        await expect(rootNode).toBeVisible();

        // 2. Click it
        await rootNode.click();

        // 3. Verify selection visual state (border/scale)
        // (This is harder to test via styles without screenshot, but we can check if it has the "selected" class logic)
        // Actually, we look for the Context Toolbar which appears on selection.
        await expect(page.getByText('Core').first()).toBeVisible();

        // 4. Verify Context Actions
        await expect(page.getByRole('button', { name: 'Enter Now' })).toBeVisible();
    });

    test('Dive/Enter NOW works via Double Click', async ({ page }) => {
        const rootNode = page.locator('[data-node-id="root"]');
        await expect(rootNode).toBeVisible();

        // Action: Double Click
        await rootNode.dblclick();

        // Expect: Now Overlay Presence
        const overlay = page.getByText('Now Focus');
        await expect(overlay).toBeVisible();

        // Expect: Node Label in Header
        await expect(page.getByRole('heading', { name: 'Core' })).toBeVisible();

        // Action: Exit
        await page.getByRole('button', { name: '←' }).click();
        await expect(overlay).not.toBeVisible();
    });
});
