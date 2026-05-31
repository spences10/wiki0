import { describe, expect, it } from 'vitest';
import { index_wiki } from './indexer.js';
import { create_page } from './pages.js';
import { make_wiki_root } from './test-utils.js';
import { list_topic_threads } from './topics.js';

describe('topics', () => {
	it('lists lightweight topic threads from tags and headings', () => {
		const root = make_wiki_root();
		create_page(
			'projects/wiki0',
			'---\ntags: [memory, agent]\n---\n# wiki0\n\n## Retrieval\n\nContext chunks.',
			{ root },
		);
		index_wiki(root);

		expect(list_topic_threads(root, 10)).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					topic: 'memory',
					paths: ['projects/wiki0.md'],
				}),
				expect.objectContaining({ topic: 'Retrieval' }),
			]),
		);
	});
});
