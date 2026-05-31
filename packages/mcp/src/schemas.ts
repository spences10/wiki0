import * as v from 'valibot';

export const Wiki0InfoSchema = v.object({});

export const ParseWikilinksSchema = v.object({
	markdown: v.string(),
});

export const ParseMarkdownSchema = v.object({
	markdown: v.string(),
});

export const SlugifyTitleSchema = v.object({
	title: v.string(),
});

export const CreatePageSchema = v.object({
	title: v.string(),
	body: v.string(),
	root: v.optional(v.string(), '.'),
	overwrite: v.optional(v.boolean(), false),
});

export const ReadPageSchema = v.object({
	title: v.string(),
	root: v.optional(v.string(), '.'),
});

export const SetPageFrontmatterSchema = v.object({
	title: v.string(),
	frontmatter: v.record(v.string(), v.unknown()),
	root: v.optional(v.string(), '.'),
	merge: v.optional(v.boolean(), false),
});

export const AddFactSchema = v.object({
	category: v.string(),
	summary: v.string(),
	body: v.optional(v.string()),
	confidence: v.optional(
		v.picklist(['unknown', 'low', 'medium', 'high', 'verified']),
		'unknown',
	),
	page: v.optional(v.string()),
	source: v.optional(v.string()),
	source_quote: v.optional(v.string()),
	root: v.optional(v.string(), '.'),
});

export const ListFactsSchema = v.object({
	root: v.optional(v.string(), '.'),
	category: v.optional(v.string()),
});

export const ListWikiEventsSchema = v.object({
	root: v.optional(v.string(), '.'),
	limit: v.optional(v.number(), 50),
});

export const ListTopicThreadsSchema = v.object({
	root: v.optional(v.string(), '.'),
	limit: v.optional(v.number(), 50),
});

export const IndexWikiSchema = v.object({
	root: v.optional(v.string(), '.'),
});

export const IndexStatusSchema = v.object({
	root: v.optional(v.string(), '.'),
});

export const SearchWikiSchema = v.object({
	query: v.string(),
	root: v.optional(v.string(), '.'),
	limit: v.optional(v.number(), 10),
});

export const ContextWikiSchema = v.object({
	query: v.string(),
	root: v.optional(v.string(), '.'),
	limit: v.optional(v.number(), 5),
});

export const ShowWikiChunkSchema = v.object({
	target: v.string(),
	root: v.optional(v.string(), '.'),
});

export const GraphWikiSchema = v.object({
	root: v.optional(v.string(), '.'),
});

export const LintWikiSchema = v.object({
	root: v.optional(v.string(), '.'),
});

export const BacklinksForPageSchema = v.object({
	title: v.string(),
	root: v.optional(v.string(), '.'),
});

export const ReviewWikiSchema = v.object({
	root: v.optional(v.string(), '.'),
});

export const AppendPageSchema = v.object({
	title: v.string(),
	body: v.string(),
	root: v.optional(v.string(), '.'),
});

export const PlanWikiSchema = v.object({
	source_type: v.optional(
		v.picklist(['general', 'codebase', 'docs', 'research', 'notes']),
		'general',
	),
	scope: v.optional(v.string()),
	sources: v.optional(v.array(v.string())),
});

export const IngestDocumentsSchema = v.object({
	root: v.optional(v.string(), '.'),
	sources: v.array(v.string()),
	overwrite: v.optional(v.boolean(), false),
	index: v.optional(v.boolean(), true),
});

export const BootstrapWikiSchema = v.object({
	root: v.optional(v.string(), '.'),
	source_type: v.optional(
		v.picklist(['general', 'codebase', 'docs', 'research', 'notes']),
		'general',
	),
	scope: v.optional(v.string()),
	sources: v.optional(v.array(v.string())),
	overwrite: v.optional(v.boolean(), false),
	ingest_sources: v.optional(v.boolean(), false),
});
