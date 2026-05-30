import * as v from 'valibot';

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

export const IndexWikiSchema = v.object({
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
