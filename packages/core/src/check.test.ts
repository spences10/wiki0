import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';
import { check_docs } from './check.js';
import { make_wiki_root, write_doc } from './test-utils.js';

function git(root: string, ...args: string[]): void {
	execFileSync(
		'git',
		[
			'-c',
			'user.email=test@example.com',
			'-c',
			'user.name=test',
			...args,
		],
		{ cwd: root, stdio: 'ignore' },
	);
}

const paragraph = [
	'The index lives in the user cache so that checkouts stay clean,',
	'and every worktree gets its own database keyed by its path, which',
	'means two branches never overwrite each other and deleting the',
	'cache folder is always safe because wiki0 rebuilds it on demand.',
].join('\n');

describe('check_docs', () => {
	it('reports IDs that match no document or are not linked', async () => {
		const root = make_wiki_root();
		write_doc(root, 'decisions/0001-first.md', '# First');
		write_doc(
			root,
			'docs/guide.md',
			[
				'# Guide',
				'',
				'Decision 0001 says so.',
				'See [Decision 0001](../decisions/0001-first.md).',
				'Decision 0009 says otherwise.',
				'Not in code: `Decision 0009`. Hash: SHA-256.',
				'',
				'```',
				'decision 0042',
				'```',
			].join('\n'),
		);

		const result = await check_docs(root, { all: true });

		expect(result.ok).toBe(false);
		expect(
			result.issues.filter((issue) => issue.severity !== 'info'),
		).toEqual([
			expect.objectContaining({
				rule: 'unlinked-id',
				path: 'docs/guide.md',
				line: 3,
				suggestions: ['decisions/0001-first.md'],
			}),
			expect.objectContaining({
				rule: 'unresolved-id',
				path: 'docs/guide.md',
				line: 5,
				target: 'Decision 0009',
			}),
		]);
	});

	it('matches a file name prefix exactly', async () => {
		const root = make_wiki_root();
		write_doc(root, 'adr/ADR-012-cache.md', '# Cache');
		write_doc(
			root,
			'notes.md',
			'# Notes\n\nSee ADR-012 and ADR-013. An adr 7 in passing.',
		);

		const result = await check_docs(root, { paths: ['notes.md'] });

		expect(
			result.issues.map((issue) => [issue.rule, issue.target]),
		).toEqual([
			['orphan-page', undefined],
			['unlinked-id', 'ADR-012'],
			['unresolved-id', 'ADR-013'],
			['unresolved-id', 'adr 7'],
		]);
	});

	it('checks no IDs in a repo without numbered files', async () => {
		const root = make_wiki_root();
		write_doc(root, 'a.md', '# A\n\nSee D-236 and Decision 4.');

		const result = await check_docs(root, { all: true });

		expect(
			result.issues.filter((issue) => issue.severity !== 'info'),
		).toEqual([]);
	});

	it('reports a repeated section once, ignoring changelogs', async () => {
		const root = make_wiki_root();
		write_doc(root, 'a.md', `# A\n\n## Storage\n\n${paragraph}`);
		write_doc(
			root,
			'b.md',
			`# B\n\n## Where it lives\n\n${paragraph}`,
		);
		write_doc(root, 'CHANGELOG.md', `# Changes\n\n${paragraph}`);

		const result = await check_docs(root, { all: true });

		expect(
			result.issues.filter(
				(issue) => issue.rule === 'overlapping-section',
			),
		).toEqual([
			expect.objectContaining({
				path: 'a.md',
				line: 1,
				target: 'b.md:1-8',
			}),
		]);
	});

	it('checks only files changed since HEAD and flags additions', async () => {
		const root = make_wiki_root();
		write_doc(root, 'a.md', '# A\n\nOld line.\n');
		write_doc(root, 'b.md', '# B\n\nSee [gone](gone.md).');
		git(root, 'init', '-q');
		git(root, 'add', '.');
		git(root, 'commit', '-qm', 'base');
		const added = Array.from({ length: 12 }, (_, i) => `Line ${i}.`);
		write_doc(
			root,
			'a.md',
			['# A', '', 'Old line.', ...added, ''].join('\n'),
		);
		write_doc(root, 'c.md', ['# C', '', ...added].join('\n'));

		const result = await check_docs(root);

		expect(result.files).toEqual(['a.md', 'c.md']);
		expect(result.ok).toBe(true);
		expect(
			result.issues
				.filter((issue) => issue.rule === 'net-growth')
				.map((issue) => [issue.path, issue.message]),
		).toEqual([
			[
				'a.md',
				expect.stringMatching(/^Only additions \(\+12, -0\)/u),
			],
			[
				'c.md',
				expect.stringMatching(/^New document \(\+14 lines\)/u),
			],
		]);
	});

	it('skips rules disabled in wiki0.toml', async () => {
		const root = make_wiki_root();
		write_doc(root, 'decisions/0001-first.md', '# First');
		write_doc(root, 'a.md', '# A\n\nDecision 0001.');
		writeFileSync(
			join(root, 'wiki0.toml'),
			'[check]\ndisable = ["unlinked-id", "orphan-page"]',
		);

		const result = await check_docs(root, { paths: ['a.md'] });

		expect(result.issues).toEqual([]);
	});

	it('warns about paths that are not indexed', async () => {
		const root = make_wiki_root();
		write_doc(root, 'a.md', '# A');

		const result = await check_docs(root, { paths: ['nope.md'] });

		expect(result.files).toEqual([]);
		expect(result.warnings).toEqual([
			'nope.md is not an indexed document',
		]);
	});
});
