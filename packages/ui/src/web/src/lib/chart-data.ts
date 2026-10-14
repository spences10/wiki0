import type {
	ChunkSummary,
	LintIssue,
	ScoreParts,
} from '@wiki0/core';

export type Bin = { label: string; start: number; end: number; count: number };

const default_edges = [0, 100, 200, 400, 800, 1600];

/**
 * Chunk token counts in bins with doubling widths, as sizes cluster
 * small with a long tail. The last bin is open ended.
 */
export function token_histogram(
	tokens: number[],
	edges: number[] = default_edges,
): Bin[] {
	const bins: Bin[] = edges.map((start, index) => {
		const end = edges[index + 1] ?? Number.POSITIVE_INFINITY;
		return {
			label: Number.isFinite(end) ? `${start}–${end}` : `${start}+`,
			start,
			end,
			count: 0,
		};
	});
	for (const value of tokens) {
		const bin = bins.findLast((candidate) => value >= candidate.start);
		if (bin) bin.count += 1;
	}
	return bins;
}

export type Count = { key: string; count: number };

// How many items have each value, most common first; missing values
// count as `none`.
export function count_by<T>(
	items: T[],
	key: (item: T) => string | null | undefined,
): Count[] {
	const counts = new Map<string, number>();
	for (const item of items) {
		const value = key(item) || 'none';
		counts.set(value, (counts.get(value) ?? 0) + 1);
	}
	return [...counts]
		.map(([value, count]) => ({ key: value, count }))
		.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

export type RuleCounts = {
	rule: string;
	error: number;
	warning: number;
	info: number;
	total: number;
};

export function lint_by_rule(issues: LintIssue[]): RuleCounts[] {
	const rules = new Map<string, RuleCounts>();
	for (const issue of issues) {
		const counts = rules.get(issue.rule) ?? {
			rule: issue.rule,
			error: 0,
			warning: 0,
			info: 0,
			total: 0,
		};
		counts[issue.severity] += 1;
		counts.total += 1;
		rules.set(issue.rule, counts);
	}
	return [...rules.values()].sort(
		(a, b) => b.total - a.total || a.rule.localeCompare(b.rule),
	);
}

export type ScorePart = {
	part: keyof ScoreParts;
	label: string;
	value: number;
	// Signed change from neutral: text match from 0, multipliers from 1.
	effect: number;
};

const score_labels: Record<keyof ScoreParts, string> = {
	text: 'Text match',
	status: 'Status',
	type: 'Type',
	inlinks: 'In-links',
	priority: 'Priority',
	recency: 'Recency',
};

/**
 * The parts of a search score as signed effects, so boosts and
 * penalties read either side of zero: the text match is the base,
 * the rest multiply it.
 */
export function score_breakdown(parts: ScoreParts): ScorePart[] {
	return (Object.keys(score_labels) as (keyof ScoreParts)[]).map(
		(part) => ({
			part,
			label: score_labels[part],
			value: parts[part],
			effect: part === 'text' ? parts[part] : parts[part] - 1,
		}),
	);
}

export type Tower = {
	path: string;
	title: string;
	position: number;
	tokens: number;
	citation: string;
	heading: string | null;
};

/**
 * Isometric skyline data: one row per document, its chunks standing
 * along the row in file order with height = tokens. The largest
 * documents by total tokens are kept so the chart stays readable.
 */
export function skyline(
	documents: { path: string; title: string; chunks: ChunkSummary[] }[],
	limit = 16,
): { towers: Tower[]; paths: string[]; positions: number[]; max: number } {
	const kept = [...documents]
		.map((document) => ({
			...document,
			total: document.chunks.reduce((sum, chunk) => sum + chunk.tokens, 0),
		}))
		.filter((document) => document.chunks.length > 0)
		.sort((a, b) => b.total - a.total || a.path.localeCompare(b.path))
		.slice(0, limit);
	const towers = kept.flatMap((document) =>
		document.chunks.map((chunk, position) => ({
			path: document.path,
			title: document.title,
			position,
			tokens: chunk.tokens,
			citation: chunk.citation,
			heading: chunk.heading,
		})),
	);
	const longest = Math.max(0, ...kept.map((document) => document.chunks.length));
	return {
		towers,
		paths: kept.map((document) => document.path),
		positions: Array.from({ length: longest }, (_, index) => index),
		max: Math.max(0, ...towers.map((tower) => tower.tokens)),
	};
}

export type SnippetPart = { text: string; match: boolean };

// Splits a search snippet at core's match ranges for highlighting.
export function snippet_parts(
	snippet: string,
	ranges: [number, number][],
): SnippetPart[] {
	const parts: SnippetPart[] = [];
	let cursor = 0;
	for (const [start, end] of [...ranges].sort((a, b) => a[0] - b[0])) {
		if (start < cursor || end <= start) continue;
		if (start > cursor) {
			parts.push({ text: snippet.slice(cursor, start), match: false });
		}
		parts.push({ text: snippet.slice(start, end), match: true });
		cursor = end;
	}
	if (cursor < snippet.length) {
		parts.push({ text: snippet.slice(cursor), match: false });
	}
	return parts;
}
