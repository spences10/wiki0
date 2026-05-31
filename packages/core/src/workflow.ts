import {
	existsSync,
	readFileSync,
	readdirSync,
	statSync,
} from 'node:fs';
import { join } from 'node:path';
import { log_wiki_event } from './events.js';
import { index_wiki } from './indexer.js';
import { serialize_frontmatter } from './markdown.js';
import { create_page } from './pages.js';
import { page_file_path, resolve_wiki_root } from './paths.js';
import type {
	WikiBootstrapOptions,
	WikiBootstrapResult,
	WikiPlanOptions,
	WikiPlanPage,
	WikiPlanResult,
	WikiSourceIngestion,
	WikiSourceType,
} from './types.js';

export const wiki_building_workflow_markdown = `# Wiki building workflow

Use this workflow when a user asks to build, bootstrap, generate, or improve a wiki from source material. A codebase is one source type; the same workflow applies to docs, notes, research, transcripts, or any mixed knowledge corpus.

## Steps

1. Clarify the source scope only if it is ambiguous.
2. Inspect source material before writing pages.
3. Propose a small page plan with names, purposes, and review flags.
4. Create an index page that explains the corpus and links to major sections.
5. Create focused pages for concepts, workflows, decisions, sources, and open questions.
6. Use [[WikiLinks]] to connect related pages instead of duplicating context.
7. Use frontmatter for title, aliases, tags, status, and review markers.
8. Add structured facts for durable claims, decisions, or constraints.
9. Run index_wiki after page creation.
10. Run lint_wiki and fix unresolved links or duplicate names.
11. Run review_wiki and surface pages that still need human review.

## Quality bar

- Prefer many focused pages over one giant dump.
- Mark uncertain pages with needs-review instead of inventing confidence.
- Preserve citations or source paths when facts come from external material.
- Make the wiki navigable for humans and retrievable for agents.
`;

const common_pages: WikiPlanPage[] = [
	{
		title: 'Index',
		path: 'index',
		purpose:
			'Entry point that summarizes the wiki and links to major sections.',
		tags: ['index'],
	},
	{
		title: 'Sources',
		path: 'sources/index',
		purpose: 'Inventory of source material used to build the wiki.',
		tags: ['sources'],
	},
	{
		title: 'Concepts',
		path: 'concepts/index',
		purpose:
			'Stable concepts, glossary entries, and domain vocabulary.',
		tags: ['concepts'],
	},
	{
		title: 'Workflows',
		path: 'workflows/index',
		purpose:
			'Repeatable processes, how-tos, and operational playbooks.',
		tags: ['workflow'],
	},
	{
		title: 'Open questions',
		path: 'questions/open-questions',
		purpose:
			'Unknowns, contradictions, and items requiring human review.',
		tags: ['needs-review', 'questions'],
	},
];

const source_pages: Record<WikiSourceType, WikiPlanPage[]> = {
	general: [],
	codebase: [
		{
			title: 'Architecture overview',
			path: 'architecture/overview',
			purpose:
				'System shape, package boundaries, runtime flow, and key tradeoffs.',
			tags: ['architecture', 'needs-review'],
		},
		{
			title: 'Packages and modules',
			path: 'packages/index',
			purpose:
				'Map packages, modules, entry points, and ownership boundaries.',
			tags: ['package', 'codebase'],
		},
	],
	docs: [
		{
			title: 'Documentation map',
			path: 'docs/documentation-map',
			purpose:
				'Organize existing documentation by audience, topic, and freshness.',
			tags: ['documentation', 'needs-review'],
		},
	],
	research: [
		{
			title: 'Research findings',
			path: 'research/findings',
			purpose:
				'Summarize sourced claims, evidence, and confidence levels.',
			tags: ['research', 'needs-review'],
		},
	],
	notes: [
		{
			title: 'Note clusters',
			path: 'notes/clusters',
			purpose:
				'Group raw notes into themes and candidate durable pages.',
			tags: ['notes', 'needs-review'],
		},
	],
};

export function plan_wiki(
	options: WikiPlanOptions = {},
): WikiPlanResult {
	const source_type = options.source_type ?? 'general';
	const scope = options.scope ?? 'user-provided source material';
	const pages = [...common_pages, ...source_pages[source_type]];

	return {
		source_type: source_type,
		scope,
		workflow: wiki_building_workflow_markdown,
		pages,
		next_steps: [
			'Inspect the source material and adjust this plan before writing pages.',
			'Create or update the index page first so later pages have a navigation target.',
			'Create focused pages with frontmatter and wikilinks.',
			'Run index_wiki, lint_wiki, and review_wiki before handing off.',
		],
	};
}

export function bootstrap_wiki(
	options: WikiBootstrapOptions = {},
): WikiBootstrapResult {
	const root = resolve_wiki_root(options.root);
	const plan = plan_wiki(options);
	const created: string[] = [];
	const skipped: string[] = [];

	const detected_sources = detect_source_inventory(
		root,
		plan.source_type,
		options.sources,
		plan.scope,
	);

	for (const page of plan.pages) {
		if (
			!options.overwrite &&
			existsSync(page_file_path(page.path, root))
		) {
			skipped.push(page.path);
			continue;
		}
		create_page(
			page.path,
			page_template(page, plan, detected_sources),
			{
				root,
				overwrite: options.overwrite,
			},
		);
		created.push(page.path);
	}

	const ingested_sources = options.ingest_sources
		? ingest_sources(
				root,
				detected_sources,
				options.overwrite,
				created,
				skipped,
			)
		: [];

	const indexed = index_wiki(root);
	log_wiki_event({
		root,
		operation: 'bootstrap_wiki',
		summary: `Bootstrapped ${created.length} pages and ${ingested_sources.length} sources`,
		target: root,
		details: { created, skipped, ingested_sources },
	});
	return {
		root,
		plan,
		created,
		skipped,
		ingested_sources: ingested_sources,
		indexed,
	};
}

function page_template(
	page: WikiPlanPage,
	plan: WikiPlanResult,
	detected_sources: string[],
): string {
	if (page.path === 'index') return index_template(page, plan);
	const frontmatter = serialize_frontmatter({
		title: page.title,
		tags: page.tags,
	});
	if (page.path === 'sources/index') {
		return `${frontmatter}# ${page.title}\n\n${page.purpose}\n\n## Source scope\n\n${plan.scope}\n\n## Detected sources\n\n${format_source_inventory(detected_sources)}\n\n## Ingestion notes\n\n- Record source paths, URLs, owners, and freshness before extracting durable facts.\n`;
	}
	if (page.path === 'questions/open-questions') {
		return `${frontmatter}# ${page.title}\n\n${page.purpose}\n\n## Source scope\n\n${plan.scope}\n\n## Questions\n\n- What source material has not been inspected yet?\n- Which claims need citations or owner confirmation?\n- Which pages should move from needs-review to verified?\n`;
	}
	return `${frontmatter}# ${page.title}\n\n${page.purpose}\n\n## Source scope\n\n${plan.scope}\n\n## Evidence\n\n- Add source-backed details here with citations or file paths.\n\n## Candidate facts\n\n- Add durable claims here before promoting them with add_fact.\n`;
}

function index_template(
	page: WikiPlanPage,
	plan: WikiPlanResult,
): string {
	const frontmatter = serialize_frontmatter({
		title: page.title,
		tags: page.tags,
	});
	const links = plan.pages
		.filter((planned_page) => planned_page.path !== page.path)
		.map(
			(planned_page) =>
				`- [[${planned_page.path}|${planned_page.title}]] — ${planned_page.purpose}`,
		)
		.join('\n');
	return `${frontmatter}# ${page.title}\n\nWiki for ${plan.scope}.\n\n## Start here\n\n${links}\n\n## Workflow\n\nUse [[workflows/index|Workflows]] to capture repeatable processes, [[sources/index|Sources]] to track inspected material, and [[questions/open-questions|Open questions]] for uncertain claims.\n`;
}

function detect_source_inventory(
	root: string,
	source_type: WikiSourceType,
	explicit_sources: string[] = [],
	scope = '',
): string[] {
	const candidates = ['README.md', 'package.json', 'docs'];
	if (source_type === 'codebase') candidates.push('packages');
	const sources: string[] = [
		...explicit_sources,
		...extract_urls(scope),
	];
	for (const candidate of candidates) {
		const candidate_path = join(root, candidate);
		if (!existsSync(candidate_path)) continue;
		if (candidate === 'packages') {
			for (const entry of readdirSync(candidate_path, {
				withFileTypes: true,
			})) {
				if (entry.isDirectory()) {
					sources.push(`packages/${entry.name}/package.json`);
				}
			}
			continue;
		}
		sources.push(candidate);
	}
	return [...new Set(sources)];
}

function ingest_sources(
	root: string,
	sources: string[],
	overwrite: boolean | undefined,
	created: string[],
	skipped: string[],
): WikiSourceIngestion[] {
	const ingested: WikiSourceIngestion[] = [];
	for (const source of sources) {
		const source_page = `sources/detected/${source_slug(source)}`;
		if (!overwrite && existsSync(page_file_path(source_page, root))) {
			skipped.push(source_page);
			continue;
		}
		const source_kind = source.startsWith('http')
			? 'url'
			: existsSync(join(root, source))
				? 'file'
				: 'missing';
		create_page(
			source_page,
			source_template(root, source, source_kind),
			{
				root,
				overwrite,
			},
		);
		created.push(source_page);
		ingested.push({
			source,
			page: `${source_page}.md`,
			kind: source_kind,
		});
	}
	return ingested;
}

function source_template(
	root: string,
	source: string,
	kind: WikiSourceIngestion['kind'],
): string {
	const frontmatter = serialize_frontmatter({
		title: `Source: ${source}`,
		tags: ['source', kind],
		status: kind === 'missing' ? 'review' : 'draft',
	});
	const source_path = join(root, source);
	const excerpt = kind === 'file' ? source_excerpt(source_path) : '';
	const candidate_facts =
		kind === 'file' ? source_candidate_facts(source_path) : [];
	const evidence =
		kind === 'file'
			? `## Extracted excerpt\n\n${excerpt}\n\n`
			: kind === 'url'
				? '## Extraction\n\n- URL ingestion is registered; fetch and summarize this source before promoting facts.\n\n'
				: '## Extraction\n\n- Source was listed but not found locally; confirm the path or URL.\n\n';
	return `${frontmatter}# Source: ${source}\n\nSource kind: ${kind}\n\n${evidence}## Candidate facts\n\n${format_candidate_facts(candidate_facts)}\n\n## Open questions\n\n- What claims from this source should become stable wiki pages?\n- What needs citation, owner confirmation, or freshness review?\n`;
}

function source_excerpt(file_path: string): string {
	const stats = statSync(file_path);
	if (stats.isDirectory())
		return '- Directory source; inspect child files before extracting facts.';
	const content = readFileSync(file_path, 'utf-8')
		.slice(0, 2000)
		.trim();
	return content.length > 0
		? `\`\`\`\n${content}\n\`\`\``
		: '- Source file is empty.';
}

function source_candidate_facts(file_path: string): string[] {
	const stats = statSync(file_path);
	if (stats.isDirectory()) return [];
	const lines = readFileSync(file_path, 'utf-8').split(/\r?\n/u);
	return lines
		.map((line, index) => ({
			line: line.trim(),
			line_number: index + 1,
		}))
		.filter(({ line }) =>
			/\b(should|must|required|requirement|decision|constraint|risk|assumption|fact)\b/iu.test(
				line,
			),
		)
		.slice(0, 10)
		.map(
			({ line, line_number }) =>
				`- Candidate from line ${line_number}: ${line}`,
		);
}

function format_candidate_facts(candidate_facts: string[]): string {
	return candidate_facts.length > 0
		? candidate_facts.join('\n')
		: '- Review this source and promote durable claims with add_fact.';
}

function source_slug(source: string): string {
	return (
		source
			.replace(/^https?:\/\//u, '')
			.replace(/[^A-Za-z0-9]+/gu, '-')
			.replace(/^-+|-+$/gu, '')
			.toLowerCase() || 'source'
	);
}

function extract_urls(scope: string): string[] {
	return scope.match(/https?:\/\/[^\s)]+/gu) ?? [];
}

function format_source_inventory(sources: string[]): string {
	if (sources.length === 0) {
		return '- No local sources detected automatically; add source paths or URLs here.';
	}
	return sources.map((source) => `- \`${source}\``).join('\n');
}
