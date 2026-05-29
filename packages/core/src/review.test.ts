import { describe, expect, it } from 'vitest';
import { create_page } from './pages.js';
import { review_wiki } from './review.js';
import { make_wiki_root } from './test-utils.js';

describe('review_wiki', () => {
	it('lists pages marked for review by status or tag', () => {
		const root = make_wiki_root();
		create_page(
			'decisions/storage',
			'---\ntitle: Storage\nstatus: proposed\n---\n# Storage\n',
			{ root },
		);
		create_page(
			'patterns/api',
			'---\ntitle: API\ntags: [needs-review]\n---\n# API\n',
			{ root },
		);
		create_page('patterns/done', '# Done\n\nVerified.', { root });

		expect(review_wiki(root)).toEqual([
			expect.objectContaining({
				path: 'decisions/storage.md',
				reason: 'status:proposed',
			}),
			expect.objectContaining({
				path: 'patterns/api.md',
				reason: 'tag:needs-review',
			}),
		]);
	});
});
