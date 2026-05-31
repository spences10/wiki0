import { describe, expect, it } from 'vitest';
import { lint_wiki } from './lint.js';
import { create_page } from './pages.js';
import { make_wiki_root } from './test-utils.js';

describe('lint_wiki', () => {
	it('reports unresolved wikilinks and duplicate names', () => {
		const root = make_wiki_root();
		create_page(
			'projects/wiki0',
			'---\ntitle: wiki0\naliases: [wiki zero]\n---\n# wiki0\n\nLinks to [[topics/missing]] and [[Known topic]].',
			{ root },
		);
		create_page(
			'topics/wiki-zero',
			'---\ntitle: Wiki Zero\n---\n# Wiki Zero\n\nDuplicate alias name.',
			{ root },
		);
		create_page(
			'topics/known',
			'---\ntitle: Known topic\n---\n# Known\n\nResolvable by title.',
			{ root },
		);

		expect(lint_wiki(root)).toEqual({
			root,
			ok: false,
			issue_count: 2,
			issues: [
				expect.objectContaining({
					code: 'unresolved-wikilink',
					severity: 'error',
					path: 'projects/wiki0.md',
					target: 'topics/missing',
				}),
				expect.objectContaining({
					code: 'duplicate-name',
					severity: 'warning',
					path: 'topics/wiki-zero.md',
					target: 'Wiki Zero',
				}),
			],
		});
	});
});
