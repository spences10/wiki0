import type { FactConfidence, WikiSourceType } from '@wiki0/core';
import {
	add_fact,
	append_page,
	backlinks_for_page,
	bootstrap_wiki,
	create_page,
	get_wiki_context,
	graph_wiki,
	index_status,
	index_wiki,
	ingest_documents,
	lint_wiki,
	list_facts,
	list_topic_threads,
	list_wiki_events,
	parse_document,
	plan_wiki,
	read_page,
	review_wiki,
	search_wiki,
	set_page_frontmatter,
	show_wiki_chunk,
} from '@wiki0/core';
import { defineCommand } from 'citty';
import { isAbsolute, resolve } from 'node:path';
import {
	init_workspace,
	parse_frontmatter_json,
	print_json,
	read_markdown_input,
} from './actions.js';

function parse_wiki_source_type(value: unknown): WikiSourceType {
	const source_type = typeof value === 'string' ? value : 'general';
	if (
		source_type === 'general' ||
		source_type === 'codebase' ||
		source_type === 'docs' ||
		source_type === 'research' ||
		source_type === 'notes'
	) {
		return source_type;
	}
	throw new Error(`Invalid wiki source type: ${source_type}`);
}

function parse_sources(value: unknown): string[] | undefined {
	if (typeof value !== 'string' || value.trim().length === 0) {
		return undefined;
	}
	return value
		.split(',')
		.map((source) => source.trim())
		.filter(Boolean);
}

function resolve_cli_source(root: string, source: string): string {
	return isAbsolute(source) ? source : resolve(root, source);
}

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
		extract: defineCommand({
			meta: {
				description:
					'Extract normalized text and metadata from a source document',
			},
			args: {
				source: {
					type: 'positional',
					required: true,
					description: 'Source document path',
				},
				root: {
					type: 'string',
					description: 'Wiki root path for relative sources',
					default: '.',
				},
			},
			async run({ args }) {
				print_json(
					await parse_document(
						resolve_cli_source(
							String(args.root ?? '.'),
							String(args.source),
						),
					),
				);
			},
		}),
		bootstrap: defineCommand({
			meta: {
				description:
					'Create starter wiki pages from a deterministic wiki-building plan',
			},
			args: {
				root: {
					type: 'string',
					description: 'Wiki root path',
					default: '.',
				},
				source_type: {
					type: 'string',
					description: 'general, codebase, docs, research, or notes',
					default: 'general',
				},
				scope: {
					type: 'string',
					description: 'Source scope description',
				},
				overwrite: {
					type: 'boolean',
					description: 'Overwrite existing starter pages',
				},
				ingest_sources: {
					type: 'boolean',
					description:
						'Create source note pages for detected sources',
				},
				sources: {
					type: 'string',
					description: 'Comma-separated source paths or URLs',
				},
			},
			run({ args }) {
				print_json(
					bootstrap_wiki({
						root: String(args.root ?? '.'),
						source_type: parse_wiki_source_type(args.source_type),
						scope: args.scope ? String(args.scope) : undefined,
						overwrite: Boolean(args.overwrite),
						ingest_sources: Boolean(args.ingest_sources),
						sources: parse_sources(args.sources),
					}),
				);
			},
		}),
		ingest: defineCommand({
			meta: {
				description:
					'Ingest source documents into wiki source pages, then index the wiki',
			},
			args: {
				sources: {
					type: 'positional',
					required: true,
					description: 'Comma-separated source paths or directories',
				},
				root: {
					type: 'string',
					description: 'Wiki root path',
					default: '.',
				},
				overwrite: {
					type: 'boolean',
					description: 'Overwrite existing ingested source pages',
				},
				noIndex: {
					type: 'boolean',
					description:
						'Skip rebuilding the SQLite index after ingest',
				},
			},
			async run({ args }) {
				print_json(
					await ingest_documents({
						root: String(args.root ?? '.'),
						sources: parse_sources(args.sources) ?? [],
						overwrite: Boolean(args.overwrite),
						index: !args.noIndex,
					}),
				);
			},
		}),
		plan: defineCommand({
			meta: {
				description:
					'Print a deterministic workflow and starter page plan for building a wiki',
			},
			args: {
				source_type: {
					type: 'string',
					description: 'general, codebase, docs, research, or notes',
					default: 'general',
				},
				scope: {
					type: 'string',
					description: 'Source scope description',
				},
				sources: {
					type: 'string',
					description: 'Comma-separated source paths or URLs',
				},
			},
			run({ args }) {
				print_json(
					plan_wiki({
						source_type: parse_wiki_source_type(args.source_type),
						scope: args.scope ? String(args.scope) : undefined,
						sources: parse_sources(args.sources),
					}),
				);
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
						source: {
							type: 'string',
							description:
								'Source page or page:line target for provenance',
						},
						sourceQuote: {
							type: 'string',
							description: 'Exact source quote for provenance',
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
								source: args.source ? String(args.source) : undefined,
								source_quote: args.sourceQuote
									? String(args.sourceQuote)
									: undefined,
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
		events: defineCommand({
			meta: { description: 'List recent wiki operation log events' },
			args: {
				root: {
					type: 'string',
					description: 'Wiki root path',
					default: '.',
				},
				limit: {
					type: 'string',
					description: 'Maximum number of events',
					default: '50',
				},
			},
			run({ args }) {
				print_json(
					list_wiki_events(
						String(args.root ?? '.'),
						Number(args.limit ?? 50),
					),
				);
			},
		}),
		topics: defineCommand({
			meta: {
				description:
					'List lightweight topic threads from indexed chunks',
			},
			args: {
				root: {
					type: 'string',
					description: 'Wiki root path',
					default: '.',
				},
				limit: {
					type: 'string',
					description: 'Maximum number of topics',
					default: '50',
				},
			},
			run({ args }) {
				print_json(
					list_topic_threads(
						String(args.root ?? '.'),
						Number(args.limit ?? 50),
					),
				);
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
		status: defineCommand({
			meta: { description: 'Show index freshness and schema status' },
			args: {
				root: {
					type: 'string',
					description: 'Wiki root path',
					default: '.',
				},
			},
			run({ args }) {
				print_json(index_status(String(args.root ?? '.')));
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
		show: defineCommand({
			meta: {
				description:
					'Show the indexed wiki chunk for a page or page:line target',
			},
			args: {
				target: {
					type: 'positional',
					required: true,
					description: 'Page path/title, optionally with :line',
				},
				root: {
					type: 'string',
					description: 'Wiki root path',
					default: '.',
				},
				json: {
					type: 'boolean',
					description: 'Output structured JSON instead of Markdown',
				},
			},
			run({ args }) {
				const result = show_wiki_chunk(
					String(args.target),
					String(args.root ?? '.'),
				);
				if (args.json) print_json(result);
				else console.log(result?.body ?? 'No indexed chunk found.');
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
