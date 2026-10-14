import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';
import {
	current_index_package_version,
	current_index_schema_version,
	index_status,
	index_wiki,
} from './indexer.js';
import { create_page } from './pages.js';
import { backlinks_for_page, search } from './search.js';
import { make_wiki_root } from './test-utils.js';

describe('index_wiki', () => {
	it('indexes Markdown pages into SQLite and searches content', async () => {
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

		const result = await index_wiki(root);
		expect(result.page_count).toBe(2);
		expect(result.link_count).toBe(1);
		expect(result.indexed_at).toEqual(expect.any(String));
		expect(result.schema_version).toBe(current_index_schema_version);
		expect(result.package_version).toBe(
			current_index_package_version,
		);

		const results = search('inspectable', root).results;
		expect(results).toEqual([
			expect.objectContaining({
				path: 'wiki/topics/memory.md',
				title: 'memory',
			}),
		]);
	});

	it('reports index freshness status', async () => {
		const root = make_wiki_root();
		create_page('projects/wiki0', 'SQLite search.', { root });

		expect(index_status(root)).toEqual(
			expect.objectContaining({
				exists: true,
				stale: true,
				reasons: expect.arrayContaining(['never-indexed']),
			}),
		);

		await index_wiki(root);
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
				reasons: expect.arrayContaining(['new-pages']),
			}),
		);
	});

	it('resolves wikilinks by page title and alias while indexing', async () => {
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

		const result = await index_wiki(root);

		expect(result.link_count).toBe(2);
		expect(backlinks_for_page('Core package', root)).toEqual([
			expect.objectContaining({
				path: 'wiki/projects/wiki0.md',
				raw_text: '[[Core package]]',
			}),
		]);
		expect(backlinks_for_page('wiki0 CLI', root)).toEqual([
			expect.objectContaining({
				path: 'wiki/projects/wiki0.md',
				raw_text: '[[wiki0 CLI]]',
			}),
		]);
	});
});

describe('index_wiki on project docs', () => {
	it('indexes Markdown outside wiki/ with frontmatter metadata', async () => {
		const root = make_wiki_root();
		mkdirSync(join(root, 'docs/adr'), { recursive: true });
		writeFileSync(
			join(root, 'docs/adr/0002-storage.md'),
			[
				'---',
				'status: Superseded',
				'type: decision',
				'aliases: [storage decision]',
				'superseded_by: docs/adr/0003-cache.md',
				'---',
				'# Store the index in the repo',
				'',
				'We keep the index next to the docs.',
			].join('\n'),
		);
		writeFileSync(join(root, 'README.md'), '# Project\n\nOverview.');

		const result = await index_wiki(root);

		expect(result).toMatchObject({ page_count: 2, warnings: [] });
		expect(
			search('index next to the docs', root, { limit: 1 }).results,
		).toEqual([
			expect.objectContaining({
				path: 'docs/adr/0002-storage.md',
				title: 'Store the index in the repo',
				breadcrumb: ['Store the index in the repo'],
				status: 'superseded',
				doc_type: 'decision',
				start_line: 7,
				end_line: 9,
			}),
		]);
	});

	it('warns about invalid frontmatter instead of failing', async () => {
		const root = make_wiki_root();
		writeFileSync(
			join(root, 'broken.md'),
			'---\ntitle: [unclosed\n---\n# Broken\n\nStill searchable.',
		);

		const result = await index_wiki(root);

		expect(result.page_count).toBe(1);
		expect(result.warnings).toEqual([
			expect.stringContaining('broken.md: Invalid YAML frontmatter'),
		]);
		expect(search('still searchable', root).results).toHaveLength(1);
	});
});
