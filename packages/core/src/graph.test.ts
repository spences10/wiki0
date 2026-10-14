import { describe, expect, it } from 'vite-plus/test';
import { graph_wiki } from './graph.js';
import { index_wiki } from './indexer.js';
import { create_page } from './pages.js';
import { make_wiki_root } from './test-utils.js';

describe('graph_wiki', () => {
	it('returns indexed pages and wikilink edges', async () => {
		const root = make_wiki_root();
		create_page(
			'projects/wiki0',
			'See [[topics/memory|memory]] and [[missing/page]].',
			{ root },
		);
		create_page('topics/memory', 'Inspectable memory.', { root });
		await index_wiki(root);

		expect(graph_wiki(root)).toEqual({
			root,
			nodes: [
				{ path: 'wiki/projects/wiki0.md', title: 'wiki0' },
				{ path: 'wiki/topics/memory.md', title: 'memory' },
			],
			edges: [
				expect.objectContaining({
					from: 'wiki/projects/wiki0.md',
					to: 'missing/page.md',
					target: 'missing/page',
					status: 'unresolved',
				}),
				expect.objectContaining({
					from: 'wiki/projects/wiki0.md',
					to: 'wiki/topics/memory.md',
					target: 'topics/memory',
					alias: 'memory',
					embed: false,
					status: 'resolved',
				}),
			],
		});
	});
});
