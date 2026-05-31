import { describe, expect, it } from 'vitest';
import {
	current_index_package_version,
	index_status,
	index_wiki,
} from './indexer.js';
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
		expect(result.page_count).toBe(2);
		expect(result.link_count).toBe(1);
		expect(result.indexed_at).toEqual(expect.any(String));
		expect(result.schema_version).toBe(3);
		expect(result.package_version).toBe(
			current_index_package_version,
		);

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
				package_version: current_index_package_version,
				current_package_version: current_index_package_version,
				page_count: 1,
				indexed_page_count: 1,
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

		expect(result.link_count).toBe(2);
		expect(backlinks_for_page('Core package', root)).toEqual([
			expect.objectContaining({
				path: 'projects/wiki0.md',
				raw_text: '[[Core package]]',
			}),
		]);
		expect(backlinks_for_page('wiki0 CLI', root)).toEqual([
			expect.objectContaining({
				path: 'projects/wiki0.md',
				raw_text: '[[wiki0 CLI]]',
			}),
		]);
	});
});
