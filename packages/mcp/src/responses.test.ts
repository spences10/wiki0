import { describe, expect, it } from 'vitest';
import {
	error_response,
	json_response,
	text_response,
	with_tool_errors,
} from './responses.js';

describe('tool responses', () => {
	it('formats plain text content', () => {
		expect(text_response('ok')).toEqual({
			content: [{ type: 'text', text: 'ok' }],
		});
	});

	it('formats JSON content with stable indentation and structured content', () => {
		expect(json_response({ ok: true })).toEqual({
			content: [{ type: 'text', text: '{\n  "ok": true\n}' }],
			structuredContent: { ok: true },
		});
	});

	it('wraps non-object JSON values for structured content', () => {
		expect(json_response(['a'])).toEqual({
			content: [{ type: 'text', text: '[\n  "a"\n]' }],
			structuredContent: { value: ['a'] },
		});
	});

	it('formats tool execution errors', () => {
		expect(error_response(new Error('Nope'))).toEqual({
			content: [{ type: 'text', text: 'Nope' }],
			structuredContent: { error: 'Nope' },
			isError: true,
		});
	});

	it('converts thrown handler errors to MCP tool errors', async () => {
		const handler = with_tool_errors(() => {
			throw new Error('Broken');
		});

		expect(await handler({})).toEqual({
			content: [{ type: 'text', text: 'Broken' }],
			structuredContent: { error: 'Broken' },
			isError: true,
		});
	});
});
