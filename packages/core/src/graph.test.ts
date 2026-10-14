import { describe, expect, it } from 'vite-plus/test';
import { graph_wiki } from './graph.js';
import { index_wiki } from './indexer.js';
import { make_wiki_root, write_doc } from './test-utils.js';

describe('graph_wiki', () => {
	it('returns indexed pages and link edges', async () => {
		const root = make_wiki_root();
		write_doc(
			root,
			'wiki/projects/wiki0.md',
			'See [[topics/memory|memory]] and [[missing/page]].',
		);
		write_doc(root, 'wiki/topics/memory.md', 'Inspectable memory.');
		await index_wiki(root);

		const graph = graph_wiki(root);

		expect(graph.nodes).toEqual([
			expect.objectContaining({
				path: 'wiki/projects/wiki0.md',
				title: 'wiki0',
				orphan: true,
			}),
			expect.objectContaining({
				path: 'wiki/topics/memory.md',
				title: 'memory',
				orphan: false,
			}),
		]);
		expect(graph.edges).toEqual([
			expect.objectContaining({
				from: 'wiki/projects/wiki0.md',
				to: 'missing/page',
				status: 'unresolved',
				link_status: 'missing-file',
			}),
			expect.objectContaining({
				from: 'wiki/projects/wiki0.md',
				to: 'wiki/topics/memory.md',
				target: 'topics/memory',
				alias: 'memory',
				kind: 'wikilink',
				status: 'resolved',
			}),
		]);
	});
});
