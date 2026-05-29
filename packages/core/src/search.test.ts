import { describe, expect, it } from 'vitest';
import { index_wiki } from './indexer.js';
import { create_page } from './pages.js';
import { backlinks_for_page, get_wiki_context } from './search.js';
import { make_wiki_root } from './test-utils.js';

describe('context and backlinks', () => {
	it('retrieves context and resolved backlinks from the index', () => {
		const root = make_wiki_root();
		create_page(
			'projects/wiki0',
			'Local-first context points to [[topics/memory|memory]].',
			{ root },
		);
		create_page('topics/memory', 'Inspectable agent memory.', {
			root,
		});

		index_wiki(root);

		const context = get_wiki_context('agent', root, 1);
		expect(context).toEqual({
			query: 'agent',
			results: [
				expect.objectContaining({ path: 'topics/memory.md' }),
			],
			markdown: expect.stringContaining(
				'Source: `wiki/topics/memory.md`',
			),
		});
		expect(backlinks_for_page('topics/memory', root)).toEqual([
			expect.objectContaining({
				path: 'projects/wiki0.md',
				rawText: '[[topics/memory|memory]]',
				alias: 'memory',
				embed: false,
			}),
		]);
	});
});
