import { describe, expect, it } from 'vitest';
import { index_wiki } from './indexer.js';
import { create_page } from './pages.js';
import { search_wiki } from './search.js';
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

		const results = search_wiki('inspectable', root);
		expect(results).toEqual([
			expect.objectContaining({
				path: 'topics/memory.md',
				title: 'memory',
			}),
		]);
	});
});
