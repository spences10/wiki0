import { describe, expect, it } from 'vitest';
import { page_relative_path, slugify_title } from './paths.js';

describe('slugify_title', () => {
	it('normalizes titles into URL-safe slugs', () => {
		expect(slugify_title(' Café Notes: Day 01! ')).toBe(
			'cafe-notes-day-01',
		);
	});
});

describe('page paths', () => {
	it('preserves slash-separated namespaces while slugifying parts', () => {
		expect(page_relative_path('Projects/Building wiki0')).toBe(
			'projects/building-wiki0.md',
		);
	});
});
