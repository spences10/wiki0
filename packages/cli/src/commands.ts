import {
	backlinks_for_page,
	get_wiki_context,
	graph_wiki,
	index_status,
	index_wiki,
	lint_wiki,
	list_documents,
	search,
	show,
} from '@wiki0/core';
import { defineCommand } from 'citty';
import { print_json } from './actions.js';

const root_arg = {
	root: {
		type: 'string',
		description: 'Project root (default: nearest folder with .git)',
		default: '.',
	},
} as const;

const json_arg = {
	json: {
		type: 'boolean',
		description: 'Output JSON instead of Markdown',
	},
} as const;

export const main = defineCommand({
	meta: {
		name: 'wiki0',
		description:
			'Search a project’s docs and get the right section with a path:line citation',
	},
	subCommands: {
		index: defineCommand({
			meta: { description: 'Index the project docs' },
			args: { ...root_arg },
			async run({ args }) {
				print_json(await index_wiki(String(args.root)));
			},
		}),
		status: defineCommand({
			meta: {
				description:
					'Show where the index is and whether it is stale',
			},
			args: { ...root_arg },
			run({ args }) {
				print_json(index_status(String(args.root)));
			},
		}),
		search: defineCommand({
			meta: {
				description:
					'Search the docs; one cited section per document, most authoritative first',
			},
			args: {
				query: { type: 'positional', required: true },
				...root_arg,
				limit: {
					type: 'string',
					description: 'Maximum number of documents',
					default: '5',
				},
				includeSuperseded: {
					type: 'boolean',
					description: 'Keep superseded documents in results',
					default: true,
				},
			},
			run({ args }) {
				print_json(
					search(String(args.query), String(args.root), {
						limit: Number(args.limit),
						include_superseded: args.includeSuperseded !== false,
					}),
				);
			},
		}),
		show: defineCommand({
			meta: {
				description:
					'Show a cited section: path:line, path:start-end, path#heading, path or title',
			},
			args: {
				target: { type: 'positional', required: true },
				...root_arg,
				tokens: {
					type: 'string',
					description: 'Token budget for the returned text',
					default: '2000',
				},
				neighbours: {
					type: 'string',
					description: 'Also include this many sections either side',
					default: '0',
				},
				...json_arg,
			},
			run({ args }) {
				const result = show(String(args.target), String(args.root), {
					token_budget: Number(args.tokens),
					neighbours: Number(args.neighbours),
				});
				if (args.json) {
					print_json(result);
					return;
				}
				if (!result) {
					console.log('No indexed section found.');
					process.exitCode = 1;
					return;
				}
				console.log(`Source: ${result.citation}`);
				for (const warning of result.warnings) {
					console.log(`Warning: ${warning}`);
				}
				if (result.superseded_by) {
					console.log(`Superseded by: ${result.superseded_by}`);
				}
				console.log('');
				console.log(result.markdown);
				if (result.next) {
					console.log(`\nMore: wiki0 show ${result.next}`);
				}
			},
		}),
		context: defineCommand({
			meta: {
				description:
					'Search and return the top sections as cited Markdown',
			},
			args: {
				query: { type: 'positional', required: true },
				...root_arg,
				limit: {
					type: 'string',
					description: 'Maximum number of sections',
					default: '3',
				},
				...json_arg,
			},
			run({ args }) {
				const result = get_wiki_context(
					String(args.query),
					String(args.root),
					Number(args.limit),
				);
				console.log(
					args.json
						? JSON.stringify(result, null, 2)
						: result.markdown,
				);
			},
		}),
		lint: defineCommand({
			meta: {
				description:
					'Report broken links, missing headings and other link problems',
			},
			args: { ...root_arg },
			run({ args }) {
				const result = lint_wiki(String(args.root));
				print_json(result);
				if (!result.ok) process.exitCode = 1;
			},
		}),
		graph: defineCommand({
			meta: { description: 'Output the document link graph' },
			args: { ...root_arg },
			run({ args }) {
				print_json(graph_wiki(String(args.root)));
			},
		}),
		documents: defineCommand({
			meta: {
				description:
					'List indexed documents with outlines and link counts',
			},
			args: { ...root_arg },
			run({ args }) {
				print_json(list_documents(String(args.root)));
			},
		}),
		backlinks: defineCommand({
			meta: { description: 'List documents that link to a document' },
			args: {
				target: { type: 'positional', required: true },
				...root_arg,
			},
			run({ args }) {
				print_json(
					backlinks_for_page(String(args.target), String(args.root)),
				);
			},
		}),
	},
});
