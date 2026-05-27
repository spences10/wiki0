#!/usr/bin/env node

import { ValibotJsonSchemaAdapter } from '@tmcp/adapter-valibot';
import { StdioTransport } from '@tmcp/transport-stdio';
import { parse_wikilinks, slugify_title } from '@wiki0/core';
import { McpServer } from 'tmcp';
import * as v from 'valibot';

const ParseWikilinksSchema = v.object({
	markdown: v.string(),
});

const SlugifyTitleSchema = v.object({
	title: v.string(),
});

const server = new McpServer(
	{
		name: 'wiki0',
		version: '0.0.0',
		description: 'Local-first Markdown wiki memory for humans and agents',
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
		description: 'Parse Obsidian-style [[WikiLinks]] from Markdown text',
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

const transport = new StdioTransport(server);
transport.listen();
console.error('wiki0 MCP server running on stdio');
