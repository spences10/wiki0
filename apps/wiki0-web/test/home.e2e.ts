import { expect, test } from '@playwright/test';

test('home page has the product name', async ({ page }) => {
	await page.goto('/');
	await expect(
		page.getByRole('heading', { level: 1, name: 'wiki0' }),
	).toBeVisible();
});
