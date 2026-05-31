import { describe, expect, it } from 'vitest';
import { list_wiki_events, log_wiki_event } from './events.js';
import { make_wiki_root } from './test-utils.js';

describe('events', () => {
	it('logs and lists wiki operation events', () => {
		const root = make_wiki_root();
		const event = log_wiki_event({
			root,
			operation: 'dogfood',
			summary: 'Captured an event',
			target: 'wiki/index.md',
			details: { ok: true },
		});

		expect(event).toEqual(
			expect.objectContaining({
				operation: 'dogfood',
				summary: 'Captured an event',
				target: 'wiki/index.md',
				details: '{"ok":true}',
			}),
		);
		expect(list_wiki_events(root, 1)).toEqual([event]);
	});
});
