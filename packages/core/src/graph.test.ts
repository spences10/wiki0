import { describe, expect, it } from 'vitest';
import { graph_wiki } from './graph.js';
import { index_wiki } from './indexer.js';
import { create_page } from './pages.js';
import { make_wiki_root } from './test-utils.js';

describe('graph_wiki', () => {
	it('returns indexed pages and wikilink edges', () => {
		const root = make_wiki_root();
		create_page(
			'projects/wiki0',
			'See [[topics/memory|memory]] and [[missing/page]].',
			{ root },
		);
		create_page('topics/memory', 'Inspectable memory.', { root });
		index_wiki(root);

		expect(graph_wiki(root)).toEqual({
			root,
			nodes: [
				{ path: 'projects/wiki0.md', title: 'wiki0' },
				{ path: 'topics/memory.md', title: 'memory' },
			],
			edges: [
				expect.objectContaining({
					from: 'projects/wiki0.md',
					to: 'missing/page.md',
					target: 'missing/page',
					status: 'unresolved',
				}),
				expect.objectContaining({
					from: 'projects/wiki0.md',
					to: 'topics/memory.md',
					target: 'topics/memory',
					alias: 'memory',
					embed: false,
					status: 'resolved',
				}),
			],
		});
	});
});
