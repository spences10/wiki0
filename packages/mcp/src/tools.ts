import {
	add_fact,
	append_page,
	backlinks_for_page,
	bootstrap_wiki,
	create_page,
	get_wiki_context,
	graph_wiki,
	index_wiki,
	lint_wiki,
	list_facts,
	parse_markdown,
	parse_wikilinks,
	plan_wiki,
	read_page,
	review_wiki,
	search_wiki,
	set_page_frontmatter,
	slugify_title,
	type WikiFrontmatter,
} from '@wiki0/core';
import type { InferInput } from 'valibot';
import { wiki0_info } from './info.js';
import {
	json_response,
	text_response,
	with_tool_errors,
} from './responses.js';
import {
	AddFactSchema,
	AppendPageSchema,
	BacklinksForPageSchema,
	BootstrapWikiSchema,
	ContextWikiSchema,
	CreatePageSchema,
	GraphWikiSchema,
	IndexWikiSchema,
	LintWikiSchema,
	ListFactsSchema,
	ParseMarkdownSchema,
	ParseWikilinksSchema,
	PlanWikiSchema,
	ReadPageSchema,
	ReviewWikiSchema,
	SearchWikiSchema,
	SetPageFrontmatterSchema,
	SlugifyTitleSchema,
	Wiki0InfoSchema,
} from './schemas.js';

type ParseWikilinksInput = InferInput<typeof ParseWikilinksSchema>;
type ParseMarkdownInput = InferInput<typeof ParseMarkdownSchema>;
type SlugifyTitleInput = InferInput<typeof SlugifyTitleSchema>;
type AddFactInput = InferInput<typeof AddFactSchema>;
type CreatePageInput = InferInput<typeof CreatePageSchema>;
type ReadPageInput = InferInput<typeof ReadPageSchema>;
type SetPageFrontmatterInput = InferInput<
	typeof SetPageFrontmatterSchema
>;
type IndexWikiInput = InferInput<typeof IndexWikiSchema>;
type GraphWikiInput = InferInput<typeof GraphWikiSchema>;
type LintWikiInput = InferInput<typeof LintWikiSchema>;
type ListFactsInput = InferInput<typeof ListFactsSchema>;
type SearchWikiInput = InferInput<typeof SearchWikiSchema>;
type ContextWikiInput = InferInput<typeof ContextWikiSchema>;
type BacklinksForPageInput = InferInput<
	typeof BacklinksForPageSchema
>;
type ReviewWikiInput = InferInput<typeof ReviewWikiSchema>;
type AppendPageInput = InferInput<typeof AppendPageSchema>;
type PlanWikiInput = InferInput<typeof PlanWikiSchema>;
type BootstrapWikiInput = InferInput<typeof BootstrapWikiSchema>;

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
			description:
				'Return wiki0 MCP server version, capabilities, and feature flags',
			schema: Wiki0InfoSchema,
		},
		async () => json_response(wiki0_info()),
	);

	tool(
		{
			name: 'parse_wikilinks',
			description:
				'Parse Obsidian-style [[WikiLinks]] from Markdown text',
			schema: ParseWikilinksSchema,
		},
		async ({ markdown }: ParseWikilinksInput) =>
			json_response(parse_wikilinks(markdown)),
	);

	tool(
		{
			name: 'parse_markdown',
			description:
				'Parse optional YAML frontmatter and Markdown content',
			schema: ParseMarkdownSchema,
		},
		async ({ markdown }: ParseMarkdownInput) =>
			json_response(parse_markdown(markdown)),
	);

	tool(
		{
			name: 'slugify_title',
			description: 'Convert a page title into a wiki0 slug',
			schema: SlugifyTitleSchema,
		},
		async ({ title }: SlugifyTitleInput) =>
			text_response(slugify_title(title)),
	);

	tool(
		{
			name: 'create_page',
			description: 'Create a Markdown page in a wiki0 wiki',
			schema: CreatePageSchema,
		},
		async ({ title, body, root, overwrite }: CreatePageInput) =>
			json_response(create_page(title, body, { root, overwrite })),
	);

	tool(
		{
			name: 'read_page',
			description: 'Read a Markdown page from a wiki0 wiki',
			schema: ReadPageSchema,
		},
		async ({ title, root }: ReadPageInput) =>
			json_response(read_page(title, root)),
	);

	tool(
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

	tool(
		{
			name: 'add_fact',
			description: 'Add a structured fact to the wiki0 fact index',
			schema: AddFactSchema,
		},
		async (input: AddFactInput) => json_response(add_fact(input)),
	);

	tool(
		{
			name: 'list_facts',
			description: 'List structured facts from the wiki0 fact index',
			schema: ListFactsSchema,
		},
		async ({ root, category }: ListFactsInput) =>
			json_response(list_facts(root, category)),
	);

	tool(
		{
			name: 'index_wiki',
			description: 'Rebuild the SQLite index for a wiki0 wiki',
			schema: IndexWikiSchema,
		},
		async ({ root }: IndexWikiInput) =>
			json_response(index_wiki(root)),
	);

	tool(
		{
			name: 'graph_wiki',
			description: 'Return indexed wiki graph nodes and edges',
			schema: GraphWikiSchema,
		},
		async ({ root }: GraphWikiInput) =>
			json_response(graph_wiki(root)),
	);

	tool(
		{
			name: 'lint_wiki',
			description: 'Lint wiki links and duplicate names',
			schema: LintWikiSchema,
		},
		async ({ root }: LintWikiInput) => json_response(lint_wiki(root)),
	);

	tool(
		{
			name: 'search_wiki',
			description: 'Search indexed wiki0 pages with SQLite FTS',
			schema: SearchWikiSchema,
		},
		async ({ query, root, limit }: SearchWikiInput) =>
			json_response(search_wiki(query, root, limit)),
	);

	tool(
		{
			name: 'get_wiki_context',
			description: 'Retrieve indexed wiki0 context with citations',
			schema: ContextWikiSchema,
		},
		async ({ query, root, limit }: ContextWikiInput) =>
			json_response(get_wiki_context(query, root, limit)),
	);

	tool(
		{
			name: 'backlinks_for_page',
			description: 'List resolved backlinks for a wiki0 page',
			schema: BacklinksForPageSchema,
		},
		async ({ title, root }: BacklinksForPageInput) =>
			json_response(backlinks_for_page(title, root)),
	);

	tool(
		{
			name: 'review_wiki',
			description: 'List wiki0 pages marked for review',
			schema: ReviewWikiSchema,
		},
		async ({ root }: ReviewWikiInput) =>
			json_response(review_wiki(root)),
	);

	tool(
		{
			name: 'append_page',
			description: 'Append Markdown to a page in a wiki0 wiki',
			schema: AppendPageSchema,
		},
		async ({ title, body, root }: AppendPageInput) =>
			json_response(append_page(title, body, root)),
	);

	tool(
		{
			name: 'plan_wiki',
			description:
				'Return a deterministic workflow and starter page plan for building a wiki from source material',
			schema: PlanWikiSchema,
		},
		async ({ sourceType, scope }: PlanWikiInput) =>
			json_response(plan_wiki({ sourceType, scope })),
	);

	tool(
		{
			name: 'bootstrap_wiki',
			description:
				'Create starter wiki pages from the deterministic wiki-building plan, then index the wiki',
			schema: BootstrapWikiSchema,
		},
		async ({
			root,
			sourceType,
			scope,
			overwrite,
		}: BootstrapWikiInput) =>
			json_response(
				bootstrap_wiki({ root, sourceType, scope, overwrite }),
			),
	);
}
