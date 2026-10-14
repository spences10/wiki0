// Runs once, when the page is prerendered: shapes the captured
// output (scripts/capture.ts) into what each scene draws, so the
// browser gets small data and no layout code.
import chunks from '#lib/data/chunks.json';
import documents from '#lib/data/documents.json';
import graph from '#lib/data/graph.json';
import index from '#lib/data/index.json';
import lint_example from '#lib/data/lint-example.json';
import search from '#lib/data/search.json';
import show from '#lib/data/show.json';
import type {
	GraphEdge,
	GraphNode,
	LintIssue,
	RankRow,
	Skyline,
	StoryChunk,
	StoryDocument,
	Tower,
} from '#lib/story.js';
import {
	forceCollide,
	forceLink,
	forceManyBody,
	forceSimulation,
	forceX,
	forceY,
	type SimulationLinkDatum,
	type SimulationNodeDatum,
} from 'd3-force';
import { highlight } from '#lib/highlight.server.js';
import type { PageServerLoad } from './$types';

const story_document = (path: string): StoryDocument => {
	const document = documents.find((entry) => entry.path === path);
	if (!document) throw new Error(`${path} was not captured`);
	return document;
};

const chunks_of = (path: string): StoryChunk[] =>
	(
		chunks.find((document) => document.path === path)?.chunks ?? []
	).map((chunk) => ({
		start_line: chunk.start_line,
		end_line: chunk.end_line,
		citation: chunk.citation,
		heading: chunk.heading,
		tokens: chunk.tokens,
	}));

// The text-only order comes from each result's text match; the final
// order is the order search returned.
function rank_rows(): RankRow[] {
	const by_text = [...search.results].sort(
		(a, b) => b.score_parts.text - a.score_parts.text,
	);
	return search.results.map((result, final_rank) => ({
		citation: result.citation,
		title: result.title,
		heading: result.heading,
		status: result.status,
		superseded_by: result.superseded_by,
		text: result.score_parts.text,
		score: result.score,
		parts: result.score_parts,
		text_rank: by_text.indexOf(result),
		final_rank,
	}));
}

const folder_of = (path: string) =>
	path.includes('/') ? path.slice(0, path.indexOf('/')) : '(root)';

function graph_layout(): {
	nodes: GraphNode[];
	edges: GraphEdge[];
	broken: number;
} {
	type Node = SimulationNodeDatum & { id: string };
	const nodes: Node[] = graph.nodes.map((node, position) => {
		// Fixed starting points and a fixed number of ticks, so every
		// build draws the same graph.
		const angle = position * 2.399963;
		const radius = 12 * Math.sqrt(position + 1);
		return {
			id: node.path,
			x: Math.cos(angle) * radius,
			y: Math.sin(angle) * radius,
		};
	});
	const ids = new Set(nodes.map((node) => node.id));
	const edges = graph.edges
		.filter((edge) => ids.has(edge.to))
		.map((edge) => ({ from: edge.from, to: edge.to }));
	const degree = new Map<string, number>();
	for (const edge of edges) {
		degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
		degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
	}
	forceSimulation(nodes)
		.force(
			'link',
			forceLink<Node, SimulationLinkDatum<Node>>(
				edges.map((edge) => ({ source: edge.from, target: edge.to })),
			)
				.id((node) => node.id)
				.distance(46)
				.strength(0.6),
		)
		.force('charge', forceManyBody<Node>().strength(-110))
		.force('collide', forceCollide<Node>(14))
		.force('x', forceX<Node>(0).strength(0.07))
		.force('y', forceY<Node>(0).strength(0.09))
		.stop()
		.tick(400);
	return {
		nodes: graph.nodes.map((node, position) => ({
			id: node.path,
			title: node.title,
			folder: folder_of(node.path),
			x: Math.round((nodes[position]?.x ?? 0) * 10) / 10,
			y: Math.round((nodes[position]?.y ?? 0) * 10) / 10,
			degree: degree.get(node.path) ?? 0,
			orphan: node.orphan,
		})),
		edges,
		broken: graph.edges.length - edges.length,
	};
}

// Every chunk of the largest documents, in file order, as tall as
// its tokens: the skyline the local UI draws.
function skyline(limit: number): Skyline {
	const kept = chunks
		.map((document) => ({
			path: document.path,
			total: document.chunks.reduce(
				(sum, chunk) => sum + chunk.tokens,
				0,
			),
			chunks: document.chunks,
		}))
		.filter((document) => document.chunks.length > 0)
		.sort((a, b) => b.total - a.total || a.path.localeCompare(b.path))
		.slice(0, limit);
	const towers: Tower[] = kept.flatMap((document) =>
		document.chunks.map((chunk, position) => ({
			path: document.path,
			position,
			tokens: chunk.tokens,
			citation: chunk.citation,
			heading: chunk.heading,
		})),
	);
	const longest = Math.max(
		...kept.map((document) => document.chunks.length),
	);
	return {
		towers,
		paths: kept.map((document) => document.path),
		positions: [...Array(longest).keys()],
		max: Math.max(...towers.map((tower) => tower.tokens)),
	};
}

const mcp_config = JSON.stringify(
	{
		mcpServers: {
			wiki0: { command: 'npx', args: ['-y', '@wiki0/mcp'] },
		},
	},
	null,
	2,
);

const cli_commands = [
	'# Index the project docs',
	'npx @wiki0/cli index',
	'',
	'# One cited section per document',
	'npx @wiki0/cli search "how do deploys work"',
	'',
	'# Read a cited section',
	'npx @wiki0/cli show docs/deploys.md:12-40',
	'',
	'# Broken links and anchors',
	'npx @wiki0/cli lint',
	'',
	'# Open the local docs browser',
	'npx @wiki0/cli ui',
].join('\n');

// The cited lines with a few lines of the file either side, numbered
// as in the file
function excerpt(document: StoryDocument, citation: string) {
	const [start, end] = (citation.split(':').at(-1) ?? '')
		.split('-')
		.map(Number) as [number, number];
	const lines = document.source.replace(/\n$/u, '').split('\n');
	const from = Math.max(1, start - 4);
	const to = Math.min(lines.length, end + 2);
	return {
		from,
		to,
		html: highlight(
			lines.slice(from - 1, to).join('\n'),
			'markdown',
			`showLineNumbers{${from}} {${start - from + 1}-${end - from + 1}}`,
		),
	};
}

// The first search result as the agent receives it, trimmed to the
// fields the page explains, with the lines each field spans
function first_result() {
	const [top, ...rest] = search.results;
	if (!top) throw new Error('the captured search has no results');
	const shown = {
		citation: top.citation,
		breadcrumb: top.breadcrumb,
		status: top.status,
		doc_type: top.doc_type,
		date: top.date,
		snippet: top.snippet,
		score: top.score,
		superseded_by: top.superseded_by,
	};
	const text = JSON.stringify(shown, null, 2);
	const lines = text.split('\n');
	const spans: Record<string, [number, number]> = {};
	for (const key of Object.keys(shown)) {
		const start = lines.findIndex((line) =>
			line.startsWith(`  "${key}"`),
		);
		let end = start;
		if (lines[start]?.trimEnd().endsWith('[')) {
			while (
				end < lines.length &&
				!lines[end]?.trim().startsWith(']')
			) {
				end += 1;
			}
		}
		spans[key] = [start + 1, end + 1];
	}
	return {
		query: search.query,
		html: highlight(text, 'json'),
		spans,
		rest: rest.map((result) => ({
			citation: result.citation,
			status: result.status,
			superseded_by: result.superseded_by,
		})),
	};
}

export const load: PageServerLoad = () => {
	const [superseded_path, current_path] = documents.map(
		(document) => document.path,
	);
	const superseded = story_document(superseded_path ?? '');
	const current = story_document(current_path ?? '');
	const link_graph = graph_layout();
	return {
		query: search.query,
		counts: {
			documents: index.page_count,
			chunks: index.chunk_count,
			links: index.link_count,
			broken: link_graph.broken,
		},
		superseded,
		current,
		current_chunks: chunks_of(current.path),
		answer: first_result(),
		rank: rank_rows(),
		show: {
			citation: show.citation,
			markdown: show.markdown,
			tokens: show.tokens,
			html: highlight(show.markdown, 'markdown'),
		},
		code: {
			hero: excerpt(current, show.citation),
			mcp: highlight(mcp_config, 'json'),
			mcp_text: mcp_config,
			cli: highlight(cli_commands, 'bash'),
			cli_text: cli_commands,
		},
		skyline: skyline(12),
		graph: { nodes: link_graph.nodes, edges: link_graph.edges },
		lint: {
			files: lint_example.files as Record<string, string>,
			issues: lint_example.lint.issues.filter(
				(issue) => issue.severity === 'error',
			) as LintIssue[],
		},
	};
};
