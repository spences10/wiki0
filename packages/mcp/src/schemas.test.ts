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
			wiki_dir: 'wiki',
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
			wiki_dir: 'wiki',
		});
		expect(parse(ListFactsSchema, {})).toEqual({
			root: '.',
			wiki_dir: 'wiki',
		});
		expect(parse(ListWikiEventsSchema, {})).toEqual({
			root: '.',
			wiki_dir: 'wiki',
			limit: 50,
		});
		expect(parse(ListTopicThreadsSchema, {})).toEqual({
			root: '.',
			wiki_dir: 'wiki',
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
				wiki_dir: 'wiki',
				sources: ['docs'],
				overwrite: false,
				index: true,
				derive_facts: true,
				propose_pages: false,
			},
		);
		expect(parse(IndexWikiSchema, {})).toEqual({
			root: '.',
			wiki_dir: 'wiki',
		});
		expect(parse(GraphWikiSchema, {})).toEqual({
			root: '.',
			wiki_dir: 'wiki',
		});
		expect(parse(LintWikiSchema, {})).toEqual({
			root: '.',
			wiki_dir: 'wiki',
		});
		expect(parse(SearchWikiSchema, { query: 'agent' })).toEqual({
			query: 'agent',
			root: '.',
			wiki_dir: 'wiki',
			limit: 10,
		});
	});
});
