import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';

const sections = [
	'Agents read whole files',
	'It indexes the docs you already have',
	'Current docs rank first',
	'Agents read the cited lines',
	'Links resolve, and lint finds the broken ones',
	'“Show me the docs”',
	'Use it',
];

test('has the headline and every section', async ({ page }) => {
	await page.goto('/');
	await expect(
		page.getByRole('heading', {
			level: 1,
			name: 'Docs search for your coding agent.',
		}),
	).toBeVisible();
	for (const name of sections) {
		await expect(
			page.getByRole('heading', { level: 2, name }),
		).toBeAttached();
	}
});

test('is the same height before and after JS runs', async ({
	browser,
}) => {
	// A layout that changes when JS loads makes a reload land in the
	// wrong place.
	const height = async (javaScriptEnabled: boolean) => {
		const context = await browser.newContext({
			javaScriptEnabled,
			viewport: { width: 1440, height: 900 },
		});
		const page = await context.newPage();
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		const value = await page.evaluate(
			() => document.documentElement.scrollHeight,
		);
		await context.close();
		return value;
	};
	expect(await height(true)).toBe(await height(false));
});

test('keeps its scroll position on reload', async ({ page }) => {
	await page.goto('/');
	await page.evaluate(() => window.scrollTo(0, 5000));
	await page.reload();
	await page.waitForLoadState('networkidle');
	expect(await page.evaluate(() => window.scrollY)).toBe(5000);
});

test('shows the finished story with reduced motion', async ({
	browser,
}) => {
	const context = await browser.newContext({
		reducedMotion: 'reduce',
	});
	const page = await context.newPage();
	await page.goto('/');
	const answer = page.getByText(
		"The agent's answer, quoted from a decision you replaced:",
	);
	await answer.scrollIntoViewIfNeeded();
	await expect(answer).toBeVisible();
	const ranked = page.getByRole('list', { name: 'Search results' });
	await ranked.scrollIntoViewIfNeeded();
	await expect(ranked.getByRole('listitem').first()).toContainText(
		'Index in the user cache',
	);
	await expect(ranked.getByRole('listitem').last()).toContainText(
		'Index in the project folder',
	);
	await context.close();
});

test('fits a phone screen without sideways scrolling', async ({
	browser,
}) => {
	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
	});
	const page = await context.newPage();
	await page.goto('/');
	await page.waitForLoadState('networkidle');
	const overflow = await page.evaluate(
		() =>
			document.documentElement.scrollWidth -
			document.documentElement.clientWidth,
	);
	expect(overflow).toBe(0);
	await context.close();
});

test('starts keyboard navigation at the skip link', async ({
	page,
}) => {
	await page.goto('/');
	await page.keyboard.press('Tab');
	const skip = page.getByRole('link', { name: 'Skip to content' });
	await expect(skip).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/#main$/u);
});

test('the built page has no local paths', async () => {
	const html = await readFile('build/index.html', 'utf8');
	for (const path of [homedir(), tmpdir(), '/home/', '/Users/']) {
		expect(html).not.toContain(path);
	}
});

test('reranks the results when asked', async ({ page }) => {
	await page.goto('/');
	const ranked = page.getByRole('list', { name: 'Search results' });
	await ranked.scrollIntoViewIfNeeded();
	await page.getByRole('button', { name: 'By text match' }).click();
	await expect(ranked.getByRole('listitem').first()).toContainText(
		'Index in the project folder',
	);
	await page.getByRole('button', { name: 'Ranked by wiki0' }).click();
	await expect(ranked.getByRole('listitem').first()).toContainText(
		'Index in the user cache',
	);
});

test('switches tabs without changing the page height', async ({
	page,
}) => {
	await page.goto('/');
	await page
		.getByRole('tab', { name: 'MCP' })
		.scrollIntoViewIfNeeded();
	const height = () =>
		page.evaluate(() => document.documentElement.scrollHeight);
	const before = await height();
	await page.getByRole('tab', { name: 'MCP' }).click();
	await expect(page.getByText('"mcpServers"')).toBeVisible();
	expect(await height()).toBe(before);
});
