import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';
import { index_wiki } from './indexer.js';
import {
	backlinks_for_page,
	get_wiki_context,
	plain_text_terms,
	search,
	show,
} from './search.js';
import { make_wiki_root } from './test-utils.js';

function write(root: string, path: string, body: string): void {
	mkdirSync(join(root, path, '..'), { recursive: true });
	writeFileSync(join(root, path), body);
}

const filler = (word: string) => `${word} detail. `.repeat(20).trim();

describe('search', () => {
	it('returns one cited section per document with breadcrumbs', async () => {
		const root = make_wiki_root();
		write(
			root,
			'docs/guide.md',
			[
				'# Guide',
				'',
				filler('Intro'),
				'',
				'## Deploys',
				'',
				`Deploys run from the main branch. ${filler('Deploy')}`,
				'',
				'## Rollbacks',
				'',
				`Deploys can be rolled back. ${filler('Rollback')}`,
			].join('\n'),
		);
		await index_wiki(root);

		const response = search('deploys', root);

		expect(response.relaxation).toBe('all-terms');
		expect(response.results).toEqual([
			expect.objectContaining({
				path: 'docs/guide.md',
				citation: expect.stringMatching(/^docs\/guide\.md:\d+-\d+$/u),
				breadcrumb: ['Guide', expect.any(String)],
				more_in_doc: 1,
				anchor: expect.stringMatching(/^docs\/guide\.md#/u),
			}),
		]);
		const [hit] = response.results;
		expect(
			hit?.snippet.slice(...(hit.match_ranges[0] ?? [0, 0])),
		).toMatch(/^deploys$/iu);
	});

	it('ranks current decisions above superseded ones and links the successor', async () => {
		const root = make_wiki_root();
		write(
			root,
			'docs/adr/0001-store-index-in-repo.md',
			'---\nstatus: superseded\nsuperseded_by: docs/adr/0002-store-index-in-cache.md\n---\n# Store the index in the repo\n\nThe index file lives in the repo.',
		);
		write(
			root,
			'docs/adr/0002-store-index-in-cache.md',
			'---\nstatus: accepted\nsupersedes: [docs/adr/0001-store-index-in-repo.md]\n---\n# Store the index in the cache\n\nThe index file lives in the user cache.',
		);
		await index_wiki(root);

		const { results } = search(
			'where does the index file live',
			root,
		);

		expect(results.map((hit) => hit.path)).toEqual([
			'docs/adr/0002-store-index-in-cache.md',
			'docs/adr/0001-store-index-in-repo.md',
		]);
		expect(results[1]).toMatchObject({
			superseded_by: 'docs/adr/0002-store-index-in-cache.md',
			score_parts: expect.objectContaining({ status: 0.3 }),
		});
		expect(results[0]?.doc_type).toBe('decision');
		expect(
			search('index file', root, { include_superseded: false })
				.results,
		).toHaveLength(1);
	});

	it('ranks ideas below decisions and labels them not decided', async () => {
		const root = make_wiki_root();
		write(
			root,
			'docs/postgres.md',
			'---\nstatus: idea\n---\n# Postgres\n\nMove the database to Postgres if it grows.',
		);
		write(
			root,
			'docs/sqlite.md',
			'---\nstatus: accepted\n---\n# SQLite\n\nThe database is SQLite.',
		);
		await index_wiki(root);

		const { results } = search('database', root);

		expect(results.map((hit) => [hit.path, hit.status_note])).toEqual(
			[
				['docs/sqlite.md', null],
				['docs/postgres.md', 'idea, not decided'],
			],
		);
		expect(results[1]?.score_parts.status).toBe(0.85);
		expect(show('docs/postgres.md', root)?.status_note).toBe(
			'idea, not decided',
		);
		expect(get_wiki_context('postgres', root).markdown).toContain(
			'Status: idea, not decided',
		);
	});

	it('drops terms that match nothing before using OR', async () => {
		const root = make_wiki_root();
		write(
			root,
			'a.md',
			'# Alpha\n\nThe flux capacitor needs plutonium.',
		);
		write(root, 'b.md', '# Beta\n\nThe capacitor is in the car.');
		write(root, 'c.md', '# Gamma\n\nThe car is fast.');
		await index_wiki(root);

		const response = search('capacitor plutonium unicorn', root);

		expect(response.relaxation).toBe('dropped-terms');
		expect(response.results[0]?.path).toBe('a.md');
	});

	it('treats query punctuation as plain text', async () => {
		const root = make_wiki_root();
		write(root, 'core.md', '# Core\n\n@wiki0/core powers wiki0.');
		await index_wiki(root);

		expect(plain_text_terms('"@wiki0/core" OR (x)')).toEqual([
			'wiki0/core',
			'OR',
			'x',
		]);
		expect(search('@wiki0/core', root).results).toHaveLength(1);
	});

	it('stems words so plurals match', async () => {
		const root = make_wiki_root();
		write(root, 'rules.md', '# Rules\n\nAll migrations run in CI.');
		await index_wiki(root);

		expect(search('migration', root).results).toHaveLength(1);
	});

	it('warns when the index is stale', async () => {
		const root = make_wiki_root();
		write(root, 'a.md', '# A\n\nIndexed text.');
		await index_wiki(root);
		write(root, 'b.md', '# B\n\nNew text.');

		expect(search('indexed', root).warnings).toEqual([
			expect.stringContaining('Index is stale'),
		]);
	});
});

describe('show', () => {
	const doc = [
		'---',
		'title: Runbook',
		'---',
		'# Runbook',
		'',
		filler('Intro'),
		'',
		'## Restart',
		'',
		`Restart the worker. ${filler('Restart')}`,
		'',
		'## Escalate',
		'',
		`Page the on-call. ${filler('Escalate')}`,
	].join('\n');

	it('returns the section for a line, heading or range from the file', async () => {
		const root = make_wiki_root();
		write(root, 'ops/runbook.md', doc);
		await index_wiki(root);

		expect(show('ops/runbook.md:10', root)).toMatchObject({
			citation: 'ops/runbook.md:8-10',
			breadcrumb: ['Runbook', 'Restart'],
			markdown: `## Restart\n\nRestart the worker. ${filler('Restart')}`,
			truncated: false,
			warnings: [],
		});
		expect(show('runbook#escalate', root)?.citation).toBe(
			'ops/runbook.md:12-14',
		);
		expect(show('Runbook', root)?.citation).toBe(
			'ops/runbook.md:4-14',
		);
		expect(show('ops/runbook.md:8-9', root)?.markdown).toBe(
			'## Restart',
		);
		expect(
			show('ops/runbook.md:10', root, { neighbours: 1 })?.citation,
		).toBe('ops/runbook.md:4-14');
		expect(show('nope.md', root)).toBeNull();
	});

	it('truncates to the token budget and says where to continue', async () => {
		const root = make_wiki_root();
		write(root, 'ops/runbook.md', doc);
		await index_wiki(root);

		const section = show('ops/runbook.md', root, {
			token_budget: 60,
		});

		expect(section).toMatchObject({ truncated: true });
		expect(section?.next).toMatch(/^ops\/runbook\.md:\d+-14$/u);
	});

	it('warns when the file changed after indexing', async () => {
		const root = make_wiki_root();
		write(root, 'ops/runbook.md', doc);
		await index_wiki(root);
		write(root, 'ops/runbook.md', `${doc}\n\nExtra line.`);

		expect(show('ops/runbook.md:10', root)?.warnings).toEqual([
			expect.stringContaining('changed since it was indexed'),
		]);
	});
});

describe('get_wiki_context', () => {
	it('returns the top sections as cited Markdown', async () => {
		const root = make_wiki_root();
		write(
			root,
			'docs/memory.md',
			'# Memory\n\nAgents read [[docs/notes]] for inspectable memory.',
		);
		write(root, 'docs/notes.md', '# Notes\n\nPlain notes.');
		await index_wiki(root);

		const context = get_wiki_context('inspectable memory', root, 1);

		expect(context.results).toHaveLength(1);
		expect(context.markdown).toContain(
			'Source: `docs/memory.md:1-3`',
		);
		expect(context.markdown).toContain('Agents read [[docs/notes]]');
		expect(backlinks_for_page('docs/notes', root)).toEqual([
			expect.objectContaining({
				path: 'docs/memory.md',
				line: 3,
				kind: 'wikilink',
			}),
		]);
	});
});
