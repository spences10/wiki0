import { describe, expect, it } from 'vitest';
import { index_status, index_wiki } from './indexer.js';
import { create_page } from './pages.js';
import { backlinks_for_page, search_wiki } from './search.js';
import { make_wiki_root } from './test-utils.js';

describe('index_wiki', () => {
	it('indexes Markdown pages into SQLite and searches content', () => {
		const root = make_wiki_root();
		create_page(
			'projects/wiki0',
			'SQLite search with [[topics/memory]].',
			{ root },
		);
		create_page(
			'topics/memory',
			'Agent memory should be inspectable.',
			{ root },
		);

		const result = index_wiki(root);
		expect(result.pageCount).toBe(2);
		expect(result.linkCount).toBe(1);
		expect(result.indexedAt).toEqual(expect.any(String));
		expect(result.schemaVersion).toBe(1);

		const results = search_wiki('inspectable', root);
		expect(results).toEqual([
			expect.objectContaining({
				path: 'topics/memory.md',
				title: 'memory',
			}),
		]);
	});

	it('reports index freshness status', () => {
		const root = make_wiki_root();
		create_page('projects/wiki0', 'SQLite search.', { root });

		expect(index_status(root)).toEqual(
			expect.objectContaining({
				exists: false,
				stale: true,
				reasons: ['missing-index'],
			}),
		);

		index_wiki(root);
		expect(index_status(root)).toEqual(
			expect.objectContaining({
				exists: true,
				stale: false,
				reasons: [],
				pageCount: 1,
				indexedPageCount: 1,
			}),
		);

		create_page('topics/memory', 'New page.', { root });
		expect(index_status(root)).toEqual(
			expect.objectContaining({
				stale: true,
				reasons: expect.arrayContaining([
					'page-count-changed',
					'new-pages',
				]),
			}),
		);
	});

	it('resolves wikilinks by page title and alias while indexing', () => {
		const root = make_wiki_root();
		create_page(
			'projects/wiki0',
			'Links to [[Core package]] and [[wiki0 CLI]].',
			{ root },
		);
		create_page(
			'packages/core',
			'---\ntitle: Core package\n---\n# Core\n',
			{ root },
		);
		create_page(
			'interfaces/cli',
			'---\ntitle: CLI\naliases: [wiki0 CLI]\n---\n# CLI\n',
			{ root },
		);

		const result = index_wiki(root);

		expect(result.linkCount).toBe(2);
		expect(backlinks_for_page('Core package', root)).toEqual([
			expect.objectContaining({
				path: 'projects/wiki0.md',
				rawText: '[[Core package]]',
			}),
		]);
		expect(backlinks_for_page('wiki0 CLI', root)).toEqual([
			expect.objectContaining({
				path: 'projects/wiki0.md',
				rawText: '[[wiki0 CLI]]',
			}),
		]);
	});
});
