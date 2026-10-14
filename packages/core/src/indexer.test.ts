import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';
import {
	current_index_package_version,
	current_index_schema_version,
	index_status,
	index_wiki,
} from './indexer.js';
import {
	list_chunks,
	list_documents,
	list_links,
	read_document,
} from './catalog.js';
import { backlinks_for_page, search } from './search.js';
import { make_wiki_root, write_doc } from './test-utils.js';

describe('index_wiki', () => {
	it('indexes Markdown pages into SQLite and searches content', async () => {
		const root = make_wiki_root();
		write_doc(
			root,
			'wiki/projects/wiki0.md',
			'SQLite search with [[topics/memory]].',
		);
		write_doc(
			root,
			'wiki/topics/memory.md',
			'Agent memory should be inspectable.',
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
		write_doc(root, 'wiki/projects/wiki0.md', 'SQLite search.');

		expect(index_status(root)).toEqual(
			expect.objectContaining({
				exists: false,
				stale: true,
				reasons: ['missing-index'],
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

		write_doc(root, 'wiki/topics/memory.md', 'New page.');
		expect(index_status(root)).toEqual(
			expect.objectContaining({
				stale: true,
				reasons: expect.arrayContaining(['new-pages']),
			}),
		);
	});

	it('resolves wikilinks by page title and alias while indexing', async () => {
		const root = make_wiki_root();
		write_doc(
			root,
			'wiki/projects/wiki0.md',
			'Links to [[Core package]] and [[wiki0 CLI]].',
		);
		write_doc(
			root,
			'wiki/packages/core.md',
			'---\ntitle: Core package\n---\n# Core\n',
		);
		write_doc(
			root,
			'wiki/interfaces/cli.md',
			'---\ntitle: CLI\naliases: [wiki0 CLI]\n---\n# CLI\n',
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

describe('list_documents', () => {
	it('lists documents with outlines and link counts', async () => {
		const root = make_wiki_root();
		write_doc(
			root,
			'docs/a.md',
			'---\nstatus: accepted\ntype: decision\n---\n# A\n\n## Why\n\nSee [b](./b.md).',
		);
		write_doc(root, 'docs/b.md', '# B');
		await index_wiki(root);

		expect(list_documents(root)).toEqual([
			expect.objectContaining({
				path: 'docs/a.md',
				status: 'accepted',
				doc_type: 'decision',
				out_link_count: 1,
				in_link_count: 0,
				headings: [
					{ slug: 'a', text: 'A', depth: 1, line: 5 },
					{ slug: 'why', text: 'Why', depth: 2, line: 7 },
				],
			}),
			expect.objectContaining({
				path: 'docs/b.md',
				in_link_count: 1,
				out_link_count: 0,
			}),
		]);
	});
});

describe('index_status changes and warnings', () => {
	it('lists changed files and keeps warnings from the last index', async () => {
		const root = make_wiki_root();
		write_doc(root, 'a.md', '# A');
		write_doc(root, 'b.md', '# B');
		write_doc(root, 'bad.md', '---\ntitle: [oops\n---\n# Bad');
		await index_wiki(root);
		write_doc(root, 'a.md', '# A changed');
		write_doc(root, 'c.md', '# C');
		rmSync(join(root, 'b.md'));

		const status = index_status(root);

		expect(status.changes).toEqual({
			new: ['c.md'],
			modified: ['a.md'],
			deleted: ['b.md'],
		});
		expect(status.reasons).toEqual([
			'new-pages',
			'modified-pages',
			'deleted-pages',
		]);
		expect(status.warnings).toEqual([
			expect.stringContaining('bad.md: Invalid YAML frontmatter'),
		]);
	});
});

describe('list_chunks', () => {
	it('returns the stored chunks for a document', async () => {
		const root = make_wiki_root();
		const filler = 'Detail. '.repeat(40);
		write_doc(
			root,
			'docs/guide.md',
			`# Guide\n\n${filler}\n\n## Setup\n\n${filler}`,
		);
		await index_wiki(root);

		expect(list_chunks('guide', root)).toEqual([
			expect.objectContaining({
				citation: 'docs/guide.md:1-3',
				heading: 'Guide',
				breadcrumb: ['Guide'],
				tokens: expect.any(Number),
			}),
			expect.objectContaining({
				citation: 'docs/guide.md:5-7',
				breadcrumb: ['Guide', 'Setup'],
			}),
		]);
		expect(list_chunks('missing', root)).toBeNull();
	});
});

describe('read_document', () => {
	it('returns the whole file with frontmatter split off', async () => {
		const root = make_wiki_root();
		write_doc(
			root,
			'docs/a.md',
			'---\nstatus: accepted\n---\n# A\n\nBody text.',
		);
		await index_wiki(root);

		expect(read_document('docs/a', root)).toMatchObject({
			path: 'docs/a.md',
			title: 'A',
			markdown: '# A\n\nBody text.',
			body_start_line: 4,
			frontmatter: { status: 'accepted' },
			status: 'accepted',
			warnings: [],
		});
		write_doc(root, 'docs/a.md', '# A\n\nEdited.');
		expect(read_document('docs/a.md', root)?.warnings).toEqual([
			expect.stringContaining('changed since it was indexed'),
		]);
		expect(read_document('nope', root)).toBeNull();
	});
});

describe('list_links', () => {
	it('lists a document’s links in order with lint rules', async () => {
		const root = make_wiki_root();
		write_doc(
			root,
			'docs/a.md',
			'# A\n\n[b](./b.md#setup) then [gone](./gone.md)\n\nSee [[B]].',
		);
		write_doc(root, 'docs/b.md', '# B\n\n## Setup');
		await index_wiki(root);

		expect(list_links('docs/a.md', root)).toEqual([
			expect.objectContaining({
				line: 3,
				raw_text: '[b](./b.md#setup)',
				to: 'docs/b.md',
				to_anchor: 'setup',
				link_status: 'resolved',
				rule: null,
			}),
			expect.objectContaining({
				line: 3,
				raw_text: '[gone](./gone.md)',
				link_status: 'missing-file',
				rule: 'missing-file',
			}),
			expect.objectContaining({
				line: 5,
				kind: 'wikilink',
				to: 'docs/b.md',
			}),
		]);
		expect(list_links('nope', root)).toBeNull();
	});
});
