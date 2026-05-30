import type { FactConfidence } from '@wiki0/core';
import {
	add_fact,
	append_page,
	backlinks_for_page,
	create_page,
	get_wiki_context,
	graph_wiki,
	index_wiki,
	lint_wiki,
	list_facts,
	read_page,
	review_wiki,
	search_wiki,
	set_page_frontmatter,
} from '@wiki0/core';
import { defineCommand } from 'citty';
import {
	init_workspace,
	parse_frontmatter_json,
	print_json,
	read_markdown_input,
} from './actions.js';

function parse_fact_confidence(value: unknown): FactConfidence {
	const confidence = typeof value === 'string' ? value : 'unknown';
	if (
		confidence === 'unknown' ||
		confidence === 'low' ||
		confidence === 'medium' ||
		confidence === 'high' ||
		confidence === 'verified'
	) {
		return confidence;
	}
	throw new Error(`Invalid fact confidence: ${confidence}`);
}

export const main = defineCommand({
	meta: {
		name: 'wiki0',
		description:
			'Local-first Markdown wiki memory for humans and agents',
	},
	subCommands: {
		init: defineCommand({
			meta: { description: 'Create a wiki0 folder structure' },
			args: {
				path: {
					type: 'positional',
					description: 'Wiki root path',
					default: '.',
				},
			},
			run({ args }) {
				console.log(init_workspace(String(args.path ?? '.')));
			},
		}),
		page: defineCommand({
			meta: {
				description: 'Create, read, append, and tag wiki pages',
			},
			subCommands: {
				create: defineCommand({
					meta: { description: 'Create a wiki page' },
					args: {
						title: {
							type: 'positional',
							required: true,
							description: 'Page title or path',
						},
						body: { type: 'string', description: 'Markdown body' },
						file: {
							type: 'string',
							description: 'Read Markdown body from a file',
						},
						root: {
							type: 'string',
							description: 'Wiki root path',
							default: '.',
						},
						overwrite: {
							type: 'boolean',
							description: 'Overwrite an existing page',
						},
					},
					run({ args }) {
						const page = create_page(
							String(args.title),
							read_markdown_input(args),
							{
								root: String(args.root ?? '.'),
								overwrite: Boolean(args.overwrite),
							},
						);
						print_json(page);
					},
				}),
				read: defineCommand({
					meta: { description: 'Read a wiki page' },
					args: {
						title: {
							type: 'positional',
							required: true,
							description: 'Page title or path',
						},
						root: {
							type: 'string',
							description: 'Wiki root path',
							default: '.',
						},
					},
					run({ args }) {
						print_json(
							read_page(String(args.title), String(args.root ?? '.')),
						);
					},
				}),
				frontmatter: defineCommand({
					meta: {
						description: 'Set YAML frontmatter on a wiki page',
					},
					args: {
						title: {
							type: 'positional',
							required: true,
							description: 'Page title or path',
						},
						data: {
							type: 'string',
							required: true,
							description: 'Frontmatter as a JSON object',
						},
						root: {
							type: 'string',
							description: 'Wiki root path',
							default: '.',
						},
						merge: {
							type: 'boolean',
							description: 'Merge with existing frontmatter',
						},
					},
					run({ args }) {
						const page = set_page_frontmatter(
							String(args.title),
							parse_frontmatter_json(args.data),
							{
								root: String(args.root ?? '.'),
								merge: Boolean(args.merge),
							},
						);
						print_json(page);
					},
				}),
				append: defineCommand({
					meta: { description: 'Append Markdown to a wiki page' },
					args: {
						title: {
							type: 'positional',
							required: true,
							description: 'Page title or path',
						},
						body: {
							type: 'string',
							description: 'Markdown body to append',
						},
						file: {
							type: 'string',
							description: 'Read Markdown body from a file',
						},
						root: {
							type: 'string',
							description: 'Wiki root path',
							default: '.',
						},
					},
					run({ args }) {
						const page = append_page(
							String(args.title),
							read_markdown_input(args),
							String(args.root ?? '.'),
						);
						print_json(page);
					},
				}),
			},
		}),
		facts: defineCommand({
			meta: { description: 'Add and list structured wiki facts' },
			subCommands: {
				add: defineCommand({
					meta: { description: 'Add a structured wiki fact' },
					args: {
						summary: { type: 'positional', required: true },
						category: {
							type: 'string',
							description: 'Fact category',
							default: 'note',
						},
						body: { type: 'string', description: 'Fact details' },
						confidence: {
							type: 'string',
							description: 'unknown, low, medium, high, or verified',
							default: 'unknown',
						},
						page: {
							type: 'string',
							description: 'Related page title or path',
						},
						root: {
							type: 'string',
							description: 'Wiki root path',
							default: '.',
						},
					},
					run({ args }) {
						print_json(
							add_fact({
								root: String(args.root ?? '.'),
								page: args.page ? String(args.page) : undefined,
								category: String(args.category ?? 'note'),
								summary: String(args.summary),
								body: args.body ? String(args.body) : undefined,
								confidence: parse_fact_confidence(args.confidence),
							}),
						);
					},
				}),
				list: defineCommand({
					meta: { description: 'List structured wiki facts' },
					args: {
						category: {
							type: 'string',
							description: 'Filter by category',
						},
						root: {
							type: 'string',
							description: 'Wiki root path',
							default: '.',
						},
					},
					run({ args }) {
						print_json(
							list_facts(
								String(args.root ?? '.'),
								args.category ? String(args.category) : undefined,
							),
						);
					},
				}),
			},
		}),
		index: defineCommand({
			meta: { description: 'Index Markdown pages into SQLite' },
			args: {
				root: {
					type: 'string',
					description: 'Wiki root path',
					default: '.',
				},
			},
			run({ args }) {
				print_json(index_wiki(String(args.root ?? '.')));
			},
		}),
		search: defineCommand({
			meta: { description: 'Search indexed wiki pages' },
			args: {
				query: { type: 'positional', required: true },
				root: {
					type: 'string',
					description: 'Wiki root path',
					default: '.',
				},
				limit: {
					type: 'string',
					description: 'Maximum number of results',
					default: '10',
				},
			},
			run({ args }) {
				print_json(
					search_wiki(
						String(args.query),
						String(args.root ?? '.'),
						Number(args.limit ?? 10),
					),
				);
			},
		}),
		context: defineCommand({
			meta: {
				description: 'Retrieve indexed context with citations',
			},
			args: {
				query: { type: 'positional', required: true },
				root: {
					type: 'string',
					description: 'Wiki root path',
					default: '.',
				},
				limit: {
					type: 'string',
					description: 'Maximum number of context results',
					default: '5',
				},
				json: {
					type: 'boolean',
					description: 'Output structured JSON instead of Markdown',
				},
			},
			run({ args }) {
				const result = get_wiki_context(
					String(args.query),
					String(args.root ?? '.'),
					Number(args.limit ?? 5),
				);
				console.log(
					args.json
						? JSON.stringify(result, null, 2)
						: result.markdown,
				);
			},
		}),
		graph: defineCommand({
			meta: { description: 'Output indexed wiki graph data' },
			args: {
				root: {
					type: 'string',
					description: 'Wiki root path',
					default: '.',
				},
			},
			run({ args }) {
				print_json(graph_wiki(String(args.root ?? '.')));
			},
		}),
		lint: defineCommand({
			meta: { description: 'Lint wiki links and duplicate names' },
			args: {
				root: {
					type: 'string',
					description: 'Wiki root path',
					default: '.',
				},
			},
			run({ args }) {
				const result = lint_wiki(String(args.root ?? '.'));
				print_json(result);
				if (!result.ok) process.exitCode = 1;
			},
		}),
		backlinks: defineCommand({
			meta: { description: 'List resolved backlinks for a page' },
			args: {
				title: { type: 'positional', required: true },
				root: {
					type: 'string',
					description: 'Wiki root path',
					default: '.',
				},
			},
			run({ args }) {
				print_json(
					backlinks_for_page(
						String(args.title),
						String(args.root ?? '.'),
					),
				);
			},
		}),
		review: defineCommand({
			meta: {
				description: 'List pages marked for review',
			},
			args: {
				root: {
					type: 'string',
					description: 'Wiki root path',
					default: '.',
				},
			},
			run({ args }) {
				print_json(review_wiki(String(args.root ?? '.')));
			},
		}),
	},
});
