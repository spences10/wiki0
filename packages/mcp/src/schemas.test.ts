import { parse } from 'valibot';
import { describe, expect, it } from 'vitest';
import {
	CreatePageSchema,
	IndexWikiSchema,
	SearchWikiSchema,
} from './schemas.js';

describe('MCP schemas', () => {
	it('applies defaults for page creation', () => {
		expect(
			parse(CreatePageSchema, { title: 'Test', body: 'Body' }),
		).toEqual({
			title: 'Test',
			body: 'Body',
			root: '.',
			overwrite: false,
		});
	});

	it('applies defaults for indexing and search', () => {
		expect(parse(IndexWikiSchema, {})).toEqual({ root: '.' });
		expect(parse(SearchWikiSchema, { query: 'agent' })).toEqual({
			query: 'agent',
			root: '.',
			limit: 10,
		});
	});
});
