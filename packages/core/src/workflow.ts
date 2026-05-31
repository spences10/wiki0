import type {
	WikiPlanOptions,
	WikiPlanPage,
	WikiPlanResult,
	WikiSourceType,
} from './types.js';

export const wiki_building_workflow_markdown = `# Wiki building workflow

Use this workflow when a user asks to plan, sync, generate, or improve a wiki from source material. A codebase is one source type; the same workflow applies to docs, notes, research, transcripts, or any mixed knowledge corpus.

## Steps

1. Clarify the source scope only if it is ambiguous.
2. Inspect source material before writing pages.
3. Propose a small page plan with names, purposes, and review flags.
4. Create an index page that explains the corpus and links to major sections.
5. Create focused pages for concepts, workflows, decisions, sources, and open questions.
6. Use [[WikiLinks]] to connect related pages instead of duplicating context.
7. Use frontmatter for title, aliases, tags, status, and review markers.
8. Add structured facts for durable claims, decisions, or constraints.
9. Run sync after source discovery, then index_wiki after page creation.
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
