import {
	backlinks_for_page,
	check_docs,
	get_wiki_context,
	graph_wiki,
	index_status,
	index_wiki,
	lint_wiki,
	list_documents,
	resolve_project_root,
	search,
	show,
	type CheckResult,
} from '@wiki0/core';
import { defineCommand } from 'citty';
import { relative, resolve } from 'node:path';
import { print_json } from './actions.js';
import { skill_text } from './skill.js';
import { run_ui } from './ui.js';

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
				if (result.status_note) {
					console.log(`Status: ${result.status_note}`);
				}
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
					'Report link problems across all docs; after editing docs, run check',
			},
			args: { ...root_arg },
			run({ args }) {
				const result = lint_wiki(String(args.root));
				print_json(result);
				if (!result.ok) process.exitCode = 1;
			},
		}),
		check: defineCommand({
			meta: {
				description:
					'Run after editing docs: checks changed files for broken links, unknown IDs, repeated sections and additions-only changes',
			},
			args: {
				paths: {
					type: 'positional',
					required: false,
					description:
						'Documents to check (default: Markdown changed since --base)',
				},
				...root_arg,
				base: {
					type: 'string',
					description: 'git revision to compare with (default: HEAD)',
				},
				all: {
					type: 'boolean',
					description: 'Check every document, not just changed ones',
				},
				...json_arg,
			},
			async run({ args }) {
				const root = resolve_project_root(String(args.root));
				const paths = args._.map((path) =>
					relative(root, resolve(path)),
				);
				const result = await check_docs(root, {
					paths,
					base: args.base,
					all: args.all,
				});
				if (args.json) print_json(result);
				else console.log(format_check(result));
				if (!result.ok) process.exitCode = 1;
			},
		}),
		skill: defineCommand({
			meta: {
				description:
					'Print the agent skill for finding and writing docs; save it to .agents/skills/wiki0/SKILL.md',
			},
			run() {
				process.stdout.write(skill_text());
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
		ui: defineCommand({
			meta: {
				description:
					'Open the project docs in the browser; prints the URL and reuses a running server',
			},
			args: {
				...root_arg,
				host: {
					type: 'string',
					description: 'Host to bind (default: 127.0.0.1)',
				},
				port: {
					type: 'string',
					description:
						'Port (default: 4100 or WIKI0_UI_PORT; a busy port falls back)',
				},
				open: {
					type: 'boolean',
					description:
						'Open a browser (--no-open to only print the URL)',
					default: true,
				},
				detach: {
					type: 'boolean',
					description:
						'Run in the background and return (default when not in a terminal)',
				},
				foreground: {
					type: 'boolean',
					description: 'Stay in the foreground until Ctrl-C',
				},
				stop: {
					type: 'boolean',
					description: 'Stop the server for this project',
				},
			},
			async run({ args }) {
				await run_ui({
					root: String(args.root),
					host: args.host,
					port: args.port,
					open: args.open,
					detach: args.detach,
					foreground: args.foreground,
					stop: args.stop,
				});
			},
		}),
	},
});

function format_check(result: CheckResult): string {
	const lines = [
		result.files.length === 0
			? 'No changed documents to check.'
			: `Checked ${result.files.length} document${result.files.length === 1 ? '' : 's'}.`,
	];
	for (const warning of result.warnings) {
		lines.push(`Warning: ${warning}`);
	}
	for (const issue of result.issues) {
		const place =
			issue.line === null
				? issue.path
				: `${issue.path}:${issue.line}`;
		lines.push(
			`${place} ${issue.severity} ${issue.rule}: ${issue.message}`,
		);
	}
	if (result.files.length > 0 && result.issues.length === 0) {
		lines.push('No problems found.');
	}
	return lines.join('\n');
}
