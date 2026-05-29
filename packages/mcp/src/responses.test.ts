import { describe, expect, it } from 'vitest';
import { json_response, text_response } from './responses.js';

describe('tool responses', () => {
	it('formats plain text content', () => {
		expect(text_response('ok')).toEqual({
			content: [{ type: 'text', text: 'ok' }],
		});
	});

	it('formats JSON content with stable indentation', () => {
		expect(json_response({ ok: true }).content[0]?.text).toBe(
			'{\n  "ok": true\n}',
		);
	});
});
