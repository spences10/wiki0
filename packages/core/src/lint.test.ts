import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';
import { index_wiki } from './indexer.js';
import { lint_wiki } from './lint.js';
import { make_wiki_root } from './test-utils.js';

function write(root: string, path: string, body: string): void {
	mkdirSync(join(root, path, '..'), { recursive: true });
	writeFileSync(join(root, path), body);
}

describe('lint_wiki', () => {
	it('reports broken links with line numbers and suggestions', async () => {
		const root = make_wiki_root();
		write(
			root,
			'docs/guide.md',
			[
				'# Guide',
				'',
				'See [setup](./setup.md#instal) and [gone](./gone.md).',
				'',
				'Also [[Known topic]] and [[missing-note]].',
			].join('\n'),
		);
		write(root, 'docs/setup.md', '# Setup\n\n## Install\n\nSteps.');
		write(
			root,
			'notes/known.md',
			'---\ntitle: Known topic\n---\n# Known',
		);
		await index_wiki(root);

		const result = lint_wiki(root);

		expect(result.ok).toBe(false);
		expect(
			result.issues.filter((issue) => issue.severity !== 'info'),
		).toEqual([
			expect.objectContaining({
				rule: 'missing-file',
				path: 'docs/guide.md',
				line: 3,
				target: './gone.md',
			}),
			expect.objectContaining({
				rule: 'missing-heading',
				path: 'docs/guide.md',
				line: 3,
				suggestions: ['install'],
			}),
			expect.objectContaining({
				rule: 'missing-file',
				path: 'docs/guide.md',
				line: 5,
				target: 'missing-note',
			}),
		]);
	});

	it('reports duplicate names and orphans without failing', async () => {
		const root = make_wiki_root();
		write(root, 'a.md', '---\naliases: [shared]\n---\n# A');
		write(root, 'b.md', '---\naliases: [shared]\n---\n# B');
		await index_wiki(root);

		const result = lint_wiki(root);

		expect(result.ok).toBe(true);
		expect(result.counts).toEqual({ error: 0, warning: 0, info: 3 });
		expect(result.issues).toContainEqual(
			expect.objectContaining({
				rule: 'duplicate-name',
				path: 'b.md',
				target: 'shared',
			}),
		);
	});

	it('needs an index', () => {
		expect(() => lint_wiki(make_wiki_root())).toThrow(/wiki0 index/u);
	});
});
