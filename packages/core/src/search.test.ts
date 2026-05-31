import { describe, expect, it } from 'vitest';
import { index_wiki } from './indexer.js';
import { create_page } from './pages.js';
import {
	backlinks_for_page,
	get_wiki_context,
	plain_text_fts_query,
	relaxed_plain_text_fts_query,
	search_wiki,
	search_wiki_chunks,
	show_wiki_chunk,
} from './search.js';
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
			warnings: [],
			results: [
				expect.objectContaining({
					path: 'topics/memory.md',
					start_line: 1,
				}),
			],
			markdown: expect.stringContaining(
				'Source: `wiki/topics/memory.md:',
			),
		});
		expect(backlinks_for_page('topics/memory', root)).toEqual([
			expect.objectContaining({
				path: 'projects/wiki0.md',
				raw_text: '[[topics/memory|memory]]',
				alias: 'memory',
				embed: false,
			}),
		]);
	});

	it('retrieves chunk results and known path line chunks', () => {
		const root = make_wiki_root();
		create_page(
			'projects/wiki0',
			'# wiki0\n\nIntro.\n\n## Retrieval\n\nAgents need exact cited chunks.\n\n## Other\n\nNoise.',
			{ root },
		);
		index_wiki(root);

		expect(search_wiki_chunks('exact cited chunks', root, 1)).toEqual(
			[
				expect.objectContaining({
					path: 'projects/wiki0.md',
					heading: 'Retrieval',
					start_line: 5,
				}),
			],
		);
		expect(show_wiki_chunk('projects/wiki0.md:6', root)).toEqual(
			expect.objectContaining({
				path: 'projects/wiki0.md',
				heading: 'Retrieval',
			}),
		);
	});

	it('boosts chunk results with frontmatter priority and status', () => {
		const root = make_wiki_root();
		create_page(
			'archive/old',
			'---\npriority: 0\nstatus: stale\n---\n# Old\n\nAgent context ranking.',
			{ root },
		);
		create_page(
			'decisions/current',
			'---\npriority: 20\nstatus: verified\ntags: [canonical]\n---\n# Current\n\nAgent context ranking.',
			{ root },
		);
		index_wiki(root);

		expect(
			search_wiki_chunks('agent context ranking', root, 2)[0],
		).toEqual(
			expect.objectContaining({ path: 'decisions/current.md' }),
		);
	});

	it('warns when context uses a stale index', () => {
		const root = make_wiki_root();
		create_page('projects/wiki0', 'Stable indexed text.', { root });
		index_wiki(root);
		create_page('projects/new', 'Fresh unindexed text.', { root });

		expect(get_wiki_context('indexed', root, 1)).toEqual(
			expect.objectContaining({
				warnings: [expect.stringContaining('Index is stale')],
				markdown: expect.stringContaining('## Warnings'),
			}),
		);
	});

	it('treats user search text as plain text', () => {
		const root = make_wiki_root();
		create_page('packages/core', '@wiki0/core powers wiki0.', {
			root,
		});
		index_wiki(root);

		expect(plain_text_fts_query('@wiki0/core')).toBe('"wiki0/core"');
		expect(search_wiki('@wiki0/core', root, 1)).toEqual([
			expect.objectContaining({ path: 'packages/core.md' }),
		]);
	});

	it('relaxes broad natural-language searches when exact term matching fails', () => {
		const root = make_wiki_root();
		create_page(
			'product/wiki-building-workflow',
			'The build_wiki prompt and plan_wiki tool describe a wiki building workflow.',
			{ root },
		);
		index_wiki(root);

		expect(
			relaxed_plain_text_fts_query(
				'wiki building workflow gap plan_wiki build_wiki version capability structuredContent search',
			),
		).toContain(' OR ');
		expect(
			search_wiki(
				'wiki building workflow gap plan_wiki build_wiki version capability structuredContent search',
				root,
				1,
			),
		).toEqual([
			expect.objectContaining({
				path: 'product/wiki-building-workflow.md',
			}),
		]);
	});
});
