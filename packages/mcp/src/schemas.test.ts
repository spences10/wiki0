import { parse } from 'valibot';
import { describe, expect, it } from 'vitest';
import {
	AddFactSchema,
	CreatePageSchema,
	GraphWikiSchema,
	IndexWikiSchema,
	LintWikiSchema,
	ListFactsSchema,
	ListTopicThreadsSchema,
	ListWikiEventsSchema,
	ParseDocumentSchema,
	SearchWikiSchema,
	SyncDocumentsSchema,
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

	it('applies defaults for facts', () => {
		expect(
			parse(AddFactSchema, {
				category: 'decision',
				summary: 'Local first',
			}),
		).toEqual({
			category: 'decision',
			summary: 'Local first',
			confidence: 'unknown',
			root: '.',
		});
		expect(parse(ListFactsSchema, {})).toEqual({ root: '.' });
		expect(parse(ListWikiEventsSchema, {})).toEqual({
			root: '.',
			limit: 50,
		});
		expect(parse(ListTopicThreadsSchema, {})).toEqual({
			root: '.',
			limit: 50,
		});
	});

	it('applies defaults for document parsing', () => {
		expect(
			parse(ParseDocumentSchema, { source_path: 'docs/a.pdf' }),
		).toEqual({
			source_path: 'docs/a.pdf',
			root: '.',
		});
	});

	it('applies defaults for indexing and search', () => {
		expect(parse(SyncDocumentsSchema, { sources: ['docs'] })).toEqual(
			{
				root: '.',
				sources: ['docs'],
				overwrite: false,
				index: true,
			},
		);
		expect(parse(IndexWikiSchema, {})).toEqual({ root: '.' });
		expect(parse(GraphWikiSchema, {})).toEqual({ root: '.' });
		expect(parse(LintWikiSchema, {})).toEqual({ root: '.' });
		expect(parse(SearchWikiSchema, { query: 'agent' })).toEqual({
			query: 'agent',
			root: '.',
			limit: 10,
		});
	});
});
