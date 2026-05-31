import { describe, expect, it } from 'vitest';
import { add_fact, list_facts } from './facts.js';
import { index_wiki } from './indexer.js';
import { create_page } from './pages.js';
import { make_wiki_root } from './test-utils.js';

describe('facts', () => {
	it('adds and lists facts linked to indexed pages', () => {
		const root = make_wiki_root();
		create_page(
			'projects/wiki0',
			'# wiki0\n\nLocal-first memory.\n\n## Storage\n\nMarkdown is canonical.',
			{ root },
		);
		index_wiki(root);

		const fact = add_fact({
			root,
			page: 'projects/wiki0',
			category: 'decision',
			summary: 'wiki0 stores canonical knowledge in Markdown.',
			body: 'SQLite is a rebuildable index.',
			confidence: 'high',
			source: 'projects/wiki0.md:5',
		});

		expect(fact).toEqual(
			expect.objectContaining({
				page_path: 'projects/wiki0.md',
				category: 'decision',
				summary: 'wiki0 stores canonical knowledge in Markdown.',
				body: 'SQLite is a rebuildable index.',
				confidence: 'high',
				source_path: 'projects/wiki0.md',
				source_heading: 'Storage',
				source_start_line: 5,
				source_end_line: 8,
				source_quote: '## Storage\n\nMarkdown is canonical.',
			}),
		);
		expect(list_facts(root, 'decision')).toEqual([fact]);
		expect(list_facts(root, 'note')).toEqual([]);
	});
});
