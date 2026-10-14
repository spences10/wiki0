import * as v from 'valibot';

const root = v.optional(
	v.pipe(
		v.string(),
		v.description(
			'Project root; defaults to the nearest folder with .git or wiki0.toml',
		),
	),
	'.',
);

export const Wiki0InfoSchema = v.object({});

export const RootSchema = v.object({ root });

export const SearchDocsSchema = v.object({
	query: v.pipe(
		v.string(),
		v.description('Plain words; punctuation is treated as text'),
	),
	root,
	limit: v.optional(
		v.pipe(v.number(), v.description('Maximum number of documents')),
		5,
	),
	include_superseded: v.optional(
		v.pipe(
			v.boolean(),
			v.description(
				'Keep superseded documents (ranked low, with superseded_by)',
			),
		),
		true,
	),
});

export const ShowSectionSchema = v.object({
	target: v.pipe(
		v.string(),
		v.description(
			'A citation from search (path:start-end), path:line, path#heading, path or title',
		),
	),
	root,
	token_budget: v.optional(
		v.pipe(
			v.number(),
			v.description('Approximate token limit for the returned text'),
		),
		2000,
	),
	neighbours: v.optional(
		v.pipe(
			v.number(),
			v.description('Also include this many sections either side'),
		),
		0,
	),
});

export const GetContextSchema = v.object({
	query: v.string(),
	root,
	limit: v.optional(
		v.pipe(v.number(), v.description('Maximum number of sections')),
		3,
	),
});

export const BacklinksSchema = v.object({
	target: v.pipe(v.string(), v.description('Document path or title')),
	root,
});
