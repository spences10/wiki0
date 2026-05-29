import {
	append_page,
	backlinks_for_page,
	create_page,
	get_wiki_context,
	index_wiki,
	parse_markdown,
	parse_wikilinks,
	read_page,
	review_wiki,
	search_wiki,
	set_page_frontmatter,
	slugify_title,
	type WikiFrontmatter,
} from '@wiki0/core';
import type { InferInput } from 'valibot';
import { json_response, text_response } from './responses.js';
import {
	AppendPageSchema,
	BacklinksForPageSchema,
	ContextWikiSchema,
	CreatePageSchema,
	IndexWikiSchema,
	ParseMarkdownSchema,
	ParseWikilinksSchema,
	ReadPageSchema,
	ReviewWikiSchema,
	SearchWikiSchema,
	SetPageFrontmatterSchema,
	SlugifyTitleSchema,
} from './schemas.js';

type ParseWikilinksInput = InferInput<typeof ParseWikilinksSchema>;
type ParseMarkdownInput = InferInput<typeof ParseMarkdownSchema>;
type SlugifyTitleInput = InferInput<typeof SlugifyTitleSchema>;
type CreatePageInput = InferInput<typeof CreatePageSchema>;
type ReadPageInput = InferInput<typeof ReadPageSchema>;
type SetPageFrontmatterInput = InferInput<
	typeof SetPageFrontmatterSchema
>;
type IndexWikiInput = InferInput<typeof IndexWikiSchema>;
type SearchWikiInput = InferInput<typeof SearchWikiSchema>;
type ContextWikiInput = InferInput<typeof ContextWikiSchema>;
type BacklinksForPageInput = InferInput<
	typeof BacklinksForPageSchema
>;
type ReviewWikiInput = InferInput<typeof ReviewWikiSchema>;
type AppendPageInput = InferInput<typeof AppendPageSchema>;

export function register_wiki_tools(server: {
	tool: (...args: any[]) => void;
}): void {
	server.tool(
		{
			name: 'parse_wikilinks',
			description:
				'Parse Obsidian-style [[WikiLinks]] from Markdown text',
			schema: ParseWikilinksSchema,
		},
		async ({ markdown }: ParseWikilinksInput) =>
			json_response(parse_wikilinks(markdown)),
	);

	server.tool(
		{
			name: 'parse_markdown',
			description:
				'Parse optional YAML frontmatter and Markdown content',
			schema: ParseMarkdownSchema,
		},
		async ({ markdown }: ParseMarkdownInput) =>
			json_response(parse_markdown(markdown)),
	);

	server.tool(
		{
			name: 'slugify_title',
			description: 'Convert a page title into a wiki0 slug',
			schema: SlugifyTitleSchema,
		},
		async ({ title }: SlugifyTitleInput) =>
			text_response(slugify_title(title)),
	);

	server.tool(
		{
			name: 'create_page',
			description: 'Create a Markdown page in a wiki0 wiki',
			schema: CreatePageSchema,
		},
		async ({ title, body, root, overwrite }: CreatePageInput) =>
			json_response(create_page(title, body, { root, overwrite })),
	);

	server.tool(
		{
			name: 'read_page',
			description: 'Read a Markdown page from a wiki0 wiki',
			schema: ReadPageSchema,
		},
		async ({ title, root }: ReadPageInput) =>
			json_response(read_page(title, root)),
	);

	server.tool(
		{
			name: 'set_page_frontmatter',
			description: 'Set or merge YAML frontmatter on a wiki page',
			schema: SetPageFrontmatterSchema,
		},
		async ({
			title,
			frontmatter,
			root,
			merge,
		}: SetPageFrontmatterInput) =>
			json_response(
				set_page_frontmatter(title, frontmatter as WikiFrontmatter, {
					root,
					merge,
				}),
			),
	);

	server.tool(
		{
			name: 'index_wiki',
			description: 'Rebuild the SQLite index for a wiki0 wiki',
			schema: IndexWikiSchema,
		},
		async ({ root }: IndexWikiInput) =>
			json_response(index_wiki(root)),
	);

	server.tool(
		{
			name: 'search_wiki',
			description: 'Search indexed wiki0 pages with SQLite FTS',
			schema: SearchWikiSchema,
		},
		async ({ query, root, limit }: SearchWikiInput) =>
			json_response(search_wiki(query, root, limit)),
	);

	server.tool(
		{
			name: 'get_wiki_context',
			description: 'Retrieve indexed wiki0 context with citations',
			schema: ContextWikiSchema,
		},
		async ({ query, root, limit }: ContextWikiInput) =>
			json_response(get_wiki_context(query, root, limit)),
	);

	server.tool(
		{
			name: 'backlinks_for_page',
			description: 'List resolved backlinks for a wiki0 page',
			schema: BacklinksForPageSchema,
		},
		async ({ title, root }: BacklinksForPageInput) =>
			json_response(backlinks_for_page(title, root)),
	);

	server.tool(
		{
			name: 'review_wiki',
			description: 'List wiki0 pages marked for review',
			schema: ReviewWikiSchema,
		},
		async ({ root }: ReviewWikiInput) =>
			json_response(review_wiki(root)),
	);

	server.tool(
		{
			name: 'append_page',
			description: 'Append Markdown to a page in a wiki0 wiki',
			schema: AppendPageSchema,
		},
		async ({ title, body, root }: AppendPageInput) =>
			json_response(append_page(title, body, root)),
	);
}
