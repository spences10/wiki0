import {
	backlinks_for_page,
	check_docs,
	get_wiki_context,
	graph_wiki,
	index_status,
	index_wiki,
	lint_wiki,
	list_documents,
	search,
	show,
} from '@wiki0/core';
import type { InferInput } from 'valibot';
import { wiki0_info } from './info.js';
import { json_response, with_tool_errors } from './responses.js';
import { assert_mcp_writable, mcp_root } from './safety.js';
import {
	BacklinksSchema,
	CheckDocsSchema,
	GetContextSchema,
	RootSchema,
	SearchDocsSchema,
	ShowSectionSchema,
	Wiki0InfoSchema,
} from './schemas.js';

type RootInput = InferInput<typeof RootSchema>;
type SearchDocsInput = InferInput<typeof SearchDocsSchema>;
type ShowSectionInput = InferInput<typeof ShowSectionSchema>;
type GetContextInput = InferInput<typeof GetContextSchema>;
type BacklinksInput = InferInput<typeof BacklinksSchema>;
type CheckDocsInput = InferInput<typeof CheckDocsSchema>;

export function register_wiki_tools(server: {
	tool: (...args: any[]) => void;
}): void {
	const tool = (
		definition: Parameters<typeof server.tool>[0],
		handler: Parameters<typeof server.tool>[1],
	) => server.tool(definition, with_tool_errors(handler));

	tool(
		{
			name: 'wiki0_info',
			description: 'Report wiki0 version, tools and safety settings',
			schema: Wiki0InfoSchema,
		},
		async () => json_response(wiki0_info()),
	);

	tool(
		{
			name: 'index_docs',
			description:
				'Index the project docs. Run when index_status says the index is missing or stale.',
			schema: RootSchema,
		},
		async ({ root }: RootInput) => {
			assert_mcp_writable('index_docs');
			return json_response(await index_wiki(mcp_root(root)));
		},
	);

	tool(
		{
			name: 'index_status',
			description:
				'Report the index path and whether it is stale compared with the files',
			schema: RootSchema,
		},
		async ({ root }: RootInput) =>
			json_response(index_status(mcp_root(root))),
	);

	tool(
		{
			name: 'search_docs',
			description:
				'Search the project docs. Returns one cited section per document (path:start-end), current and authoritative docs first. Read a result with show_section.',
			schema: SearchDocsSchema,
		},
		async ({
			query,
			root,
			limit,
			include_superseded,
		}: SearchDocsInput) =>
			json_response(
				search(query, mcp_root(root), { limit, include_superseded }),
			),
	);

	tool(
		{
			name: 'show_section',
			description:
				'Return a section from the current file by citation, path:line, path#heading, path or title. When truncated, call again with `next`.',
			schema: ShowSectionSchema,
		},
		async ({
			target,
			root,
			token_budget,
			neighbours,
		}: ShowSectionInput) =>
			json_response(
				show(target, mcp_root(root), { token_budget, neighbours }),
			),
	);

	tool(
		{
			name: 'get_context',
			description:
				'Search and return the top sections as cited Markdown in one call',
			schema: GetContextSchema,
		},
		async ({ query, root, limit }: GetContextInput) =>
			json_response(get_wiki_context(query, mcp_root(root), limit)),
	);

	tool(
		{
			name: 'lint_docs',
			description:
				'Report broken links, missing headings, ambiguous wikilinks and other link problems with path:line. After editing docs, use check_docs.',
			schema: RootSchema,
		},
		async ({ root }: RootInput) =>
			json_response(lint_wiki(mcp_root(root))),
	);

	tool(
		{
			name: 'check_docs',
			description:
				'Run after editing docs. Re-indexes, then reports problems in changed files with path:line: broken links, IDs that match no document, sections repeated in another file, and changes that only add lines.',
			schema: CheckDocsSchema,
		},
		async ({ root, paths, base, all }: CheckDocsInput) => {
			assert_mcp_writable('check_docs');
			return json_response(
				await check_docs(mcp_root(root), { paths, base, all }),
			);
		},
	);

	tool(
		{
			name: 'link_graph',
			description: 'Return documents and the links between them',
			schema: RootSchema,
		},
		async ({ root }: RootInput) =>
			json_response(graph_wiki(mcp_root(root))),
	);

	tool(
		{
			name: 'list_documents',
			description:
				'List indexed documents with headings, status, type and link counts',
			schema: RootSchema,
		},
		async ({ root }: RootInput) =>
			json_response(list_documents(mcp_root(root))),
	);

	tool(
		{
			name: 'backlinks',
			description: 'List documents that link to a document',
			schema: BacklinksSchema,
		},
		async ({ target, root }: BacklinksInput) =>
			json_response(backlinks_for_page(target, mcp_root(root))),
	);
}
