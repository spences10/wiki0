import { parse } from 'valibot';
import { describe, expect, it } from 'vite-plus/test';
import {
	CheckDocsSchema,
	GetContextSchema,
	RootSchema,
	SearchDocsSchema,
	ShowSectionSchema,
} from './schemas.js';

describe('MCP schemas', () => {
	it('applies defaults', () => {
		expect(parse(RootSchema, {})).toEqual({ root: '.' });
		expect(parse(SearchDocsSchema, { query: 'deploys' })).toEqual({
			query: 'deploys',
			root: '.',
			limit: 5,
			include_superseded: true,
		});
		expect(parse(ShowSectionSchema, { target: 'a.md:3' })).toEqual({
			target: 'a.md:3',
			root: '.',
			token_budget: 2000,
			neighbours: 0,
		});
		expect(parse(CheckDocsSchema, {})).toEqual({
			root: '.',
			all: false,
		});
		expect(parse(GetContextSchema, { query: 'x' })).toEqual({
			query: 'x',
			root: '.',
			limit: 3,
		});
	});
});
