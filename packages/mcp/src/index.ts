#!/usr/bin/env node

import { ValibotJsonSchemaAdapter } from '@tmcp/adapter-valibot';
import { StdioTransport } from '@tmcp/transport-stdio';
import {
	append_page,
	backlinks_for_page,
	create_page,
	get_wiki_context,
	index_wiki,
	parse_markdown,
	parse_wikilinks,
	read_page,
	search_wiki,
	set_page_frontmatter,
	slugify_title,
	type WikiFrontmatter,
} from '@wiki0/core';
import { McpServer } from 'tmcp';
import * as v from 'valibot';

const ParseWikilinksSchema = v.object({
	markdown: v.string(),
});

const ParseMarkdownSchema = v.object({
	markdown: v.string(),
});

const SlugifyTitleSchema = v.object({
	title: v.string(),
});

const CreatePageSchema = v.object({
	title: v.string(),
	body: v.string(),
	root: v.optional(v.string(), '.'),
	overwrite: v.optional(v.boolean(), false),
});

const ReadPageSchema = v.object({
	title: v.string(),
	root: v.optional(v.string(), '.'),
});

const SetPageFrontmatterSchema = v.object({
	title: v.string(),
	frontmatter: v.record(v.string(), v.unknown()),
	root: v.optional(v.string(), '.'),
	merge: v.optional(v.boolean(), false),
});

const IndexWikiSchema = v.object({
	root: v.optional(v.string(), '.'),
});

const SearchWikiSchema = v.object({
	query: v.string(),
	root: v.optional(v.string(), '.'),
	limit: v.optional(v.number(), 10),
});

const ContextWikiSchema = v.object({
	query: v.string(),
	root: v.optional(v.string(), '.'),
	limit: v.optional(v.number(), 5),
});

const BacklinksForPageSchema = v.object({
	title: v.string(),
	root: v.optional(v.string(), '.'),
});

const AppendPageSchema = v.object({
	title: v.string(),
	body: v.string(),
	root: v.optional(v.string(), '.'),
});

const server = new McpServer(
	{
		name: 'wiki0',
		version: '0.0.0',
		description:
			'Local-first Markdown wiki memory for humans and agents',
	},
	{
		adapter: new ValibotJsonSchemaAdapter(),
		capabilities: {
			tools: { listChanged: true },
		},
	},
);

server.tool<typeof ParseWikilinksSchema>(
	{
		name: 'parse_wikilinks',
		description:
			'Parse Obsidian-style [[WikiLinks]] from Markdown text',
		schema: ParseWikilinksSchema,
	},
	async ({ markdown }) => ({
		content: [
			{
				type: 'text' as const,
				text: JSON.stringify(parse_wikilinks(markdown), null, 2),
			},
		],
	}),
);

server.tool<typeof ParseMarkdownSchema>(
	{
		name: 'parse_markdown',
		description:
			'Parse optional YAML frontmatter and Markdown content',
		schema: ParseMarkdownSchema,
	},
	async ({ markdown }) => ({
		content: [
			{
				type: 'text' as const,
				text: JSON.stringify(parse_markdown(markdown), null, 2),
			},
		],
	}),
);

server.tool<typeof SlugifyTitleSchema>(
	{
		name: 'slugify_title',
		description: 'Convert a page title into a wiki0 slug',
		schema: SlugifyTitleSchema,
	},
	async ({ title }) => ({
		content: [
			{
				type: 'text' as const,
				text: slugify_title(title),
			},
		],
	}),
);

server.tool<typeof CreatePageSchema>(
	{
		name: 'create_page',
		description: 'Create a Markdown page in a wiki0 wiki',
		schema: CreatePageSchema,
	},
	async ({ title, body, root, overwrite }) => ({
		content: [
			{
				type: 'text' as const,
				text: JSON.stringify(
					create_page(title, body, { root, overwrite }),
					null,
					2,
				),
			},
		],
	}),
);

server.tool<typeof ReadPageSchema>(
	{
		name: 'read_page',
		description: 'Read a Markdown page from a wiki0 wiki',
		schema: ReadPageSchema,
	},
	async ({ title, root }) => ({
		content: [
			{
				type: 'text' as const,
				text: JSON.stringify(read_page(title, root), null, 2),
			},
		],
	}),
);

server.tool<typeof SetPageFrontmatterSchema>(
	{
		name: 'set_page_frontmatter',
		description: 'Set or merge YAML frontmatter on a wiki page',
		schema: SetPageFrontmatterSchema,
	},
	async ({ title, frontmatter, root, merge }) => ({
		content: [
			{
				type: 'text' as const,
				text: JSON.stringify(
					set_page_frontmatter(
						title,
						frontmatter as WikiFrontmatter,
						{ root, merge },
					),
					null,
					2,
				),
			},
		],
	}),
);

server.tool<typeof IndexWikiSchema>(
	{
		name: 'index_wiki',
		description: 'Rebuild the SQLite index for a wiki0 wiki',
		schema: IndexWikiSchema,
	},
	async ({ root }) => ({
		content: [
			{
				type: 'text' as const,
				text: JSON.stringify(index_wiki(root), null, 2),
			},
		],
	}),
);

server.tool<typeof SearchWikiSchema>(
	{
		name: 'search_wiki',
		description: 'Search indexed wiki0 pages with SQLite FTS',
		schema: SearchWikiSchema,
	},
	async ({ query, root, limit }) => ({
		content: [
			{
				type: 'text' as const,
				text: JSON.stringify(
					search_wiki(query, root, limit),
					null,
					2,
				),
			},
		],
	}),
);

server.tool<typeof ContextWikiSchema>(
	{
		name: 'get_wiki_context',
		description: 'Retrieve indexed wiki0 context with citations',
		schema: ContextWikiSchema,
	},
	async ({ query, root, limit }) => ({
		content: [
			{
				type: 'text' as const,
				text: JSON.stringify(
					get_wiki_context(query, root, limit),
					null,
					2,
				),
			},
		],
	}),
);

server.tool<typeof BacklinksForPageSchema>(
	{
		name: 'backlinks_for_page',
		description: 'List resolved backlinks for a wiki0 page',
		schema: BacklinksForPageSchema,
	},
	async ({ title, root }) => ({
		content: [
			{
				type: 'text' as const,
				text: JSON.stringify(
					backlinks_for_page(title, root),
					null,
					2,
				),
			},
		],
	}),
);

server.tool<typeof AppendPageSchema>(
	{
		name: 'append_page',
		description: 'Append Markdown to a page in a wiki0 wiki',
		schema: AppendPageSchema,
	},
	async ({ title, body, root }) => ({
		content: [
			{
				type: 'text' as const,
				text: JSON.stringify(append_page(title, body, root), null, 2),
			},
		],
	}),
);

const transport = new StdioTransport(server);
transport.listen();
console.error('wiki0 MCP server running on stdio');
