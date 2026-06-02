import {
	add_fact,
	append_page,
	backlinks_for_page,
	create_page,
	get_wiki_context,
	graph_wiki,
	index_status,
	index_wiki,
	lint_wiki,
	list_facts,
	list_topic_threads,
	list_wiki_events,
	parse_document,
	parse_markdown,
	parse_wikilinks,
	plan_wiki,
	read_page,
	review_wiki,
	search_wiki,
	set_page_frontmatter,
	show_wiki_chunk,
	slugify_title,
	sync_documents,
	type WikiFrontmatter,
} from '@wiki0/core';
import { isAbsolute, resolve } from 'node:path';
import type { InferInput } from 'valibot';
import { wiki0_info } from './info.js';
import {
	json_response,
	text_response,
	with_tool_errors,
} from './responses.js';
import { assert_mcp_writable, mcp_root } from './safety.js';
import {
	AddFactSchema,
	AppendPageSchema,
	BacklinksForPageSchema,
	ContextWikiSchema,
	CreatePageSchema,
	GraphWikiSchema,
	IndexStatusSchema,
	IndexWikiSchema,
	LintWikiSchema,
	ListFactsSchema,
	ListTopicThreadsSchema,
	ListWikiEventsSchema,
	ParseDocumentSchema,
	ParseMarkdownSchema,
	ParseWikilinksSchema,
	PlanWikiSchema,
	ReadPageSchema,
	ReviewWikiSchema,
	SearchWikiSchema,
	SetPageFrontmatterSchema,
	ShowWikiChunkSchema,
	SlugifyTitleSchema,
	SyncDocumentsSchema,
	Wiki0InfoSchema,
} from './schemas.js';

type ParseWikilinksInput = InferInput<typeof ParseWikilinksSchema>;
type ParseMarkdownInput = InferInput<typeof ParseMarkdownSchema>;
type ParseDocumentInput = InferInput<typeof ParseDocumentSchema>;
type SlugifyTitleInput = InferInput<typeof SlugifyTitleSchema>;
type AddFactInput = InferInput<typeof AddFactSchema>;
type CreatePageInput = InferInput<typeof CreatePageSchema>;
type ReadPageInput = InferInput<typeof ReadPageSchema>;
type SetPageFrontmatterInput = InferInput<
	typeof SetPageFrontmatterSchema
>;
type IndexWikiInput = InferInput<typeof IndexWikiSchema>;
type IndexStatusInput = InferInput<typeof IndexStatusSchema>;
type SyncDocumentsInput = InferInput<typeof SyncDocumentsSchema>;
type GraphWikiInput = InferInput<typeof GraphWikiSchema>;
type LintWikiInput = InferInput<typeof LintWikiSchema>;
type ListFactsInput = InferInput<typeof ListFactsSchema>;
type ListWikiEventsInput = InferInput<typeof ListWikiEventsSchema>;
type ListTopicThreadsInput = InferInput<
	typeof ListTopicThreadsSchema
>;
type SearchWikiInput = InferInput<typeof SearchWikiSchema>;
type ContextWikiInput = InferInput<typeof ContextWikiSchema>;
type ShowWikiChunkInput = InferInput<typeof ShowWikiChunkSchema>;
type BacklinksForPageInput = InferInput<
	typeof BacklinksForPageSchema
>;
type ReviewWikiInput = InferInput<typeof ReviewWikiSchema>;
type AppendPageInput = InferInput<typeof AppendPageSchema>;
type PlanWikiInput = InferInput<typeof PlanWikiSchema>;

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
			name: 'parse_document',
			description:
				'Extract normalized text and metadata from a source document',
			schema: ParseDocumentSchema,
		},
		async ({ source_path, root }: ParseDocumentInput) => {
			const safe_root = mcp_root(root);
			return json_response(
				await parse_document(
					isAbsolute(source_path)
						? source_path
						: resolve(safe_root, source_path),
				),
			);
		},
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
			description:
				'Create a Markdown page in the content folder (default wiki/; set wiki_dir to docs for project docs)',
			schema: CreatePageSchema,
		},
		async ({
			title,
			body,
			root,
			wiki_dir,
			overwrite,
		}: CreatePageInput) => {
			assert_mcp_writable('create_page');
			return json_response(
				create_page(title, body, {
					root: mcp_root(root),
					wiki_dir,
					overwrite,
				}),
			);
		},
	);

	tool(
		{
			name: 'read_page',
			description: 'Read a Markdown page from a wiki0 wiki',
			schema: ReadPageSchema,
		},
		async ({ title, root, wiki_dir }: ReadPageInput) =>
			json_response(read_page(title, mcp_root(root), wiki_dir)),
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
			wiki_dir,
			merge,
		}: SetPageFrontmatterInput) => {
			assert_mcp_writable('set_page_frontmatter');
			return json_response(
				set_page_frontmatter(title, frontmatter as WikiFrontmatter, {
					root: mcp_root(root),
					wiki_dir,
					merge,
				}),
			);
		},
	);

	tool(
		{
			name: 'add_fact',
			description: 'Add a structured fact to the wiki0 fact index',
			schema: AddFactSchema,
		},
		async (input: AddFactInput) => {
			assert_mcp_writable('add_fact');
			return json_response(
				add_fact({ ...input, root: mcp_root(input.root) }),
			);
		},
	);

	tool(
		{
			name: 'list_facts',
			description: 'List structured facts from the wiki0 fact index',
			schema: ListFactsSchema,
		},
		async ({ root, category }: ListFactsInput) =>
			json_response(list_facts(mcp_root(root), category)),
	);

	tool(
		{
			name: 'list_wiki_events',
			description: 'List recent wiki0 operation log events',
			schema: ListWikiEventsSchema,
		},
		async ({ root, limit }: ListWikiEventsInput) =>
			json_response(list_wiki_events(mcp_root(root), limit)),
	);

	tool(
		{
			name: 'list_topic_threads',
			description:
				'List lightweight topic threads from indexed wiki chunks',
			schema: ListTopicThreadsSchema,
		},
		async ({ root, limit }: ListTopicThreadsInput) =>
			json_response(list_topic_threads(mcp_root(root), limit)),
	);

	tool(
		{
			name: 'index_wiki',
			description: 'Rebuild the SQLite index for a wiki0 wiki',
			schema: IndexWikiSchema,
		},
		async ({ root, wiki_dir }: IndexWikiInput) => {
			assert_mcp_writable('index_wiki');
			return json_response(index_wiki(mcp_root(root), wiki_dir));
		},
	);

	tool(
		{
			name: 'index_status',
			description: 'Show index freshness and schema status',
			schema: IndexStatusSchema,
		},
		async ({ root, wiki_dir }: IndexStatusInput) =>
			json_response(index_status(mcp_root(root), wiki_dir)),
	);

	tool(
		{
			name: 'graph_wiki',
			description: 'Return indexed wiki graph nodes and edges',
			schema: GraphWikiSchema,
		},
		async ({ root }: GraphWikiInput) =>
			json_response(graph_wiki(mcp_root(root))),
	);

	tool(
		{
			name: 'lint_wiki',
			description: 'Lint wiki links and duplicate names',
			schema: LintWikiSchema,
		},
		async ({ root, wiki_dir }: LintWikiInput) =>
			json_response(lint_wiki(mcp_root(root), wiki_dir)),
	);

	tool(
		{
			name: 'search_wiki',
			description: 'Search indexed wiki0 pages with SQLite FTS',
			schema: SearchWikiSchema,
		},
		async ({ query, root, limit }: SearchWikiInput) =>
			json_response(search_wiki(query, mcp_root(root), limit)),
	);

	tool(
		{
			name: 'get_wiki_context',
			description: 'Retrieve indexed wiki0 context with citations',
			schema: ContextWikiSchema,
		},
		async ({ query, root, limit, wiki_dir }: ContextWikiInput) =>
			json_response(
				get_wiki_context(query, mcp_root(root), limit, wiki_dir),
			),
	);

	tool(
		{
			name: 'show_wiki_chunk',
			description:
				'Return the indexed wiki chunk for a page path/title, optionally with :line',
			schema: ShowWikiChunkSchema,
		},
		async ({ target, root, wiki_dir }: ShowWikiChunkInput) =>
			json_response(
				show_wiki_chunk(target, mcp_root(root), wiki_dir),
			),
	);

	tool(
		{
			name: 'backlinks_for_page',
			description: 'List resolved backlinks for a wiki0 page',
			schema: BacklinksForPageSchema,
		},
		async ({ title, root, wiki_dir }: BacklinksForPageInput) =>
			json_response(
				backlinks_for_page(title, mcp_root(root), wiki_dir),
			),
	);

	tool(
		{
			name: 'review_wiki',
			description: 'List wiki0 pages marked for review',
			schema: ReviewWikiSchema,
		},
		async ({ root, wiki_dir }: ReviewWikiInput) =>
			json_response(review_wiki(mcp_root(root), wiki_dir)),
	);

	tool(
		{
			name: 'append_page',
			description: 'Append Markdown to a page in a wiki0 wiki',
			schema: AppendPageSchema,
		},
		async ({ title, body, root, wiki_dir }: AppendPageInput) => {
			assert_mcp_writable('append_page');
			return json_response(
				append_page(title, body, mcp_root(root), wiki_dir),
			);
		},
	);

	tool(
		{
			name: 'sync_documents',
			description:
				'Sync source documents into generated source pages, then index them (default wiki/; set wiki_dir to docs for project docs)',
			schema: SyncDocumentsSchema,
		},
		async ({
			root,
			wiki_dir,
			sources,
			overwrite,
			index,
			include,
			ignore,
			derive_facts,
			propose_pages,
		}: SyncDocumentsInput) => {
			assert_mcp_writable('sync_documents');
			return json_response(
				await sync_documents({
					root: mcp_root(root),
					wiki_dir,
					sources,
					overwrite,
					index,
					include,
					ignore,
					derive_facts,
					propose_pages,
				}),
			);
		},
	);

	tool(
		{
			name: 'plan_wiki',
			description:
				'Return a deterministic workflow and starter page plan for building a wiki from source material',
			schema: PlanWikiSchema,
		},
		async ({ source_type, scope, sources }: PlanWikiInput) =>
			json_response(plan_wiki({ source_type, scope, sources })),
	);
}
