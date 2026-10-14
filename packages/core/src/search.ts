import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SQLOutputValue } from 'node:sqlite';
import { estimate_tokens } from './chunks.js';
import { index_status } from './indexer.js';
import { resolve_wiki_root } from './paths.js';
import { open_index_or_throw, type WikiDatabase } from './storage.js';
import type {
	BacklinkResult,
	ContextResult,
	ScoreParts,
	SearchHit,
	SearchOptions,
	SearchRelaxation,
	SearchResponse,
	ShowOptions,
	ShowResult,
} from './types.js';

const default_limit = 5;
const candidate_limit = 200;
const default_token_budget = 2000;
const snippet_tokens = 24;

const stop_words = new Set(
	(
		'a about am an and any are as at be been being but by can could did ' +
		'do does doing for from get got had has have how i if in into is it ' +
		'its me my of on or our should so than that the their them then ' +
		'there these they this those to us was we were what when where ' +
		'which while who whom why will with would you your'
	).split(' '),
);

const superseded_statuses = new Set([
	'superseded',
	'deprecated',
	'archived',
	'obsolete',
	'stale',
	'replaced',
]);
const trusted_statuses = new Set([
	'accepted',
	'approved',
	'verified',
	'active',
	'current',
	'canonical',
]);
const tentative_statuses = new Set([
	'draft',
	'proposed',
	'review',
	'wip',
	'rfc',
]);
const authoritative_types = new Set([
	'decision',
	'adr',
	'rule',
	'rules',
	'spec',
	'specification',
	'policy',
	'standard',
	'reference',
	'guide',
]);
const informal_types = new Set([
	'meeting',
	'meetings',
	'notes',
	'note',
	'communication',
	'email',
	'chat',
	'log',
	'journal',
]);

type Candidate = {
	chunk_id: number;
	path: string;
	title: string;
	heading: string | null;
	breadcrumb: string;
	start_line: number;
	end_line: number;
	status: string | null;
	doc_type: string | null;
	doc_date: string | null;
	priority: number;
	tags: string[];
	superseded_by: string | null;
	snippet: string;
	text_score: number;
	stage: number;
};

export function plain_text_terms(query: string): string[] {
	return query
		.split(/\s+/u)
		.map((term) =>
			term.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''),
		)
		.filter((term) => term.length > 0);
}

export function quote_fts_term(term: string): string {
	return `"${term.replace(/"/gu, '""')}"`;
}

// Searches the index and returns one cited section per document,
// ranked by text match and document authority.
export function search(
	query: string,
	root = '.',
	options: SearchOptions = {},
): SearchResponse {
	const limit = options.limit ?? default_limit;
	const project_root = resolve_wiki_root(root);
	const db = open_index_or_throw(project_root);
	try {
		const { candidates, relaxation } = collect_candidates(
			db,
			query,
			limit,
		);
		const inlinks = inlink_counts(db);
		const successors = successor_map(db);
		const hits = rank_candidates(candidates, inlinks, successors)
			.filter(
				(hit) =>
					options.include_superseded !== false || !hit.superseded,
			)
			.map((hit) => hit.result);
		const grouped = one_per_document(hits).slice(0, limit);
		return {
			query,
			relaxation: grouped.length > 0 ? relaxation : null,
			results: grouped.map((hit) => ({
				...hit,
				anchor: chunk_anchor(db, hit),
			})),
			warnings: stale_warnings(project_root),
		};
	} finally {
		db.close();
	}
}

function collect_candidates(
	db: WikiDatabase,
	query: string,
	limit: number,
): { candidates: Candidate[]; relaxation: SearchRelaxation | null } {
	const terms = plain_text_terms(query);
	if (terms.length === 0) return { candidates: [], relaxation: null };
	const wanted = Math.min(3, limit);
	const content_terms = terms.filter(
		(term) => !stop_words.has(term.toLowerCase()),
	);
	const stages: { relaxation: SearchRelaxation; match: string }[] = [
		{
			relaxation: 'all-terms',
			match: terms.map(quote_fts_term).join(' '),
		},
	];
	if (
		content_terms.length > 0 &&
		content_terms.length < terms.length
	) {
		stages.push({
			relaxation: 'without-stopwords',
			match: content_terms.map(quote_fts_term).join(' '),
		});
	}
	// Terms that appear nowhere can never match. After that, OR lets
	// bm25 weigh the rare terms and reward chunks that match more terms.
	const present = content_terms.filter(
		(term) => term_frequency(db, term) > 0,
	);
	if (present.length > 0 && present.length < content_terms.length) {
		stages.push({
			relaxation: 'dropped-terms',
			match: present.map(quote_fts_term).join(' '),
		});
	}
	if (present.length > 1) {
		stages.push({
			relaxation: 'any-term',
			match: present.map(quote_fts_term).join(' OR '),
		});
	}

	const seen = new Set<number>();
	const candidates: Candidate[] = [];
	let relaxation: SearchRelaxation | null = null;
	for (const [stage_index, stage] of stages.entries()) {
		const rows = match_chunks(db, stage.match);
		for (const row of rows) {
			if (seen.has(row.chunk_id)) continue;
			seen.add(row.chunk_id);
			candidates.push({ ...row, stage: stage_index });
		}
		if (rows.length > 0) relaxation ??= stage.relaxation;
		if (distinct_paths(candidates) >= wanted) break;
	}
	return { candidates, relaxation };
}

function match_chunks(
	db: WikiDatabase,
	match: string,
): Omit<Candidate, 'stage'>[] {
	const rows = db
		.prepare(
			`SELECT c.id AS chunk_id, c.path, c.title, c.heading, c.breadcrumb,
				c.start_line, c.end_line, p.status, p.doc_type, p.doc_date,
				p.priority, p.tags, p.superseded_by,
				snippet(fts_chunks, 6, char(2), char(3), '…', ${snippet_tokens}) AS snippet,
				rank
			FROM fts_chunks
			JOIN page_chunks c ON c.id = fts_chunks.chunk_id
			JOIN pages p ON p.id = c.page_id
			WHERE fts_chunks MATCH ?
			ORDER BY rank
			LIMIT ${candidate_limit}`,
		)
		.all(match) as Record<string, SQLOutputValue>[];
	return rows.map((row) => ({
		chunk_id: Number(row.chunk_id),
		path: String(row.path),
		title: String(row.title),
		heading: row.heading === null ? null : String(row.heading),
		breadcrumb: String(row.breadcrumb),
		start_line: Number(row.start_line),
		end_line: Number(row.end_line),
		status: row.status === null ? null : String(row.status),
		doc_type: row.doc_type === null ? null : String(row.doc_type),
		doc_date: row.doc_date === null ? null : String(row.doc_date),
		priority: Number(row.priority ?? 0),
		tags: JSON.parse(String(row.tags ?? '[]')) as string[],
		superseded_by:
			row.superseded_by === null ? null : String(row.superseded_by),
		snippet: String(row.snippet),
		// bm25 is negative; larger magnitude is a better match.
		text_score: -Number(row.rank),
	}));
}

function term_frequency(db: WikiDatabase, term: string): number {
	const row = db
		.prepare(
			'SELECT COUNT(*) AS count FROM fts_chunks WHERE fts_chunks MATCH ?',
		)
		.get(quote_fts_term(term)) as { count: number };
	return row.count;
}

function distinct_paths(candidates: Candidate[]): number {
	return new Set(candidates.map((candidate) => candidate.path)).size;
}

type RankedHit = {
	result: Omit<SearchHit, 'anchor'>;
	superseded: boolean;
};

function rank_candidates(
	candidates: Candidate[],
	inlinks: Map<string, number>,
	successors: Map<string, string>,
): RankedHit[] {
	// Normalise per relaxation stage so scores are comparable; each
	// later stage is worth a little less than an exact-terms match.
	const stage_max = new Map<number, number>();
	for (const candidate of candidates) {
		stage_max.set(
			candidate.stage,
			Math.max(
				stage_max.get(candidate.stage) ?? 0,
				candidate.text_score,
			),
		);
	}
	return candidates
		.map((candidate) => {
			const doc_type =
				candidate.doc_type ?? inferred_type(candidate.path);
			const superseded_by =
				candidate.superseded_by ??
				successors.get(candidate.path) ??
				null;
			const superseded =
				superseded_by !== null ||
				superseded_statuses.has(candidate.status ?? '') ||
				candidate.tags.some((tag) =>
					superseded_statuses.has(tag.toLowerCase()),
				);
			const max = stage_max.get(candidate.stage) || 1;
			const parts: ScoreParts = {
				text: (candidate.text_score / max) * 0.9 ** candidate.stage,
				status: status_factor(candidate.status, superseded),
				type: type_factor(doc_type),
				inlinks:
					1 + 0.1 * Math.log(1 + (inlinks.get(candidate.path) ?? 0)),
				recency: recency_factor(doc_type, candidate.doc_date),
				priority: Math.min(
					1.5,
					Math.max(0.5, 1 + 0.05 * candidate.priority),
				),
			};
			const score =
				parts.text *
				parts.status *
				parts.type *
				parts.inlinks *
				parts.recency *
				parts.priority;
			return {
				superseded,
				result: {
					path: candidate.path,
					start_line: candidate.start_line,
					end_line: candidate.end_line,
					citation: `${candidate.path}:${candidate.start_line}-${candidate.end_line}`,
					breadcrumb: candidate.breadcrumb
						.split(' > ')
						.filter(Boolean),
					title: candidate.title,
					heading: candidate.heading,
					status: candidate.status,
					doc_type,
					date: candidate.doc_date,
					...plain_snippet(candidate.snippet),
					score: Number(score.toFixed(4)),
					score_parts: round_parts(parts),
					superseded_by,
					more_in_doc: 0,
				},
			};
		})
		.sort((a, b) => b.result.score - a.result.score);
}

function one_per_document(
	hits: Omit<SearchHit, 'anchor'>[],
): Omit<SearchHit, 'anchor'>[] {
	const best = new Map<string, Omit<SearchHit, 'anchor'>>();
	const counts = new Map<string, number>();
	for (const hit of hits) {
		counts.set(hit.path, (counts.get(hit.path) ?? 0) + 1);
		if (!best.has(hit.path)) best.set(hit.path, hit);
	}
	return [...best.values()].map((hit) => ({
		...hit,
		more_in_doc: (counts.get(hit.path) ?? 1) - 1,
	}));
}

function status_factor(
	status: string | null,
	superseded: boolean,
): number {
	if (superseded) return 0.3;
	if (trusted_statuses.has(status ?? '')) return 1.15;
	if (tentative_statuses.has(status ?? '')) return 0.85;
	return 1;
}

function type_factor(doc_type: string | null): number {
	if (authoritative_types.has(doc_type ?? '')) return 1.2;
	if (informal_types.has(doc_type ?? '')) return 0.8;
	if (doc_type === 'changelog') return 0.7;
	return 1;
}

// Only informal documents lose weight with age; a decision stays true
// until it is superseded.
function recency_factor(
	doc_type: string | null,
	date: string | null,
): number {
	if (!informal_types.has(doc_type ?? '') || !date) return 1;
	const time = Date.parse(date);
	if (Number.isNaN(time)) return 1;
	const age_days = Math.max(0, (Date.now() - time) / 86_400_000);
	return 0.5 + 0.5 * Math.exp(-age_days / 365);
}

// Used when frontmatter has no `type`.
function inferred_type(path: string): string | null {
	const lower = path.toLowerCase();
	const name = lower.split('/').at(-1) ?? '';
	if (name.startsWith('changelog')) return 'changelog';
	if (/(^|\/)(adrs?|decisions?)\//u.test(lower)) return 'decision';
	if (/(^|\/)(rules|policies|specs?)\//u.test(lower)) return 'spec';
	if (/(^|\/)(meetings?|notes|minutes|journal)\//u.test(lower)) {
		return 'notes';
	}
	return null;
}

function plain_snippet(marked: string): {
	snippet: string;
	match_ranges: [number, number][];
} {
	const ranges: [number, number][] = [];
	let snippet = '';
	let start = -1;
	for (const character of marked.replace(/\s+/gu, ' ').trim()) {
		if (character === '\u0002') start = snippet.length;
		else if (character === '\u0003') {
			if (start >= 0) ranges.push([start, snippet.length]);
			start = -1;
		} else snippet += character;
	}
	return { snippet, match_ranges: ranges };
}

function round_parts(parts: ScoreParts): ScoreParts {
	return Object.fromEntries(
		Object.entries(parts).map(([key, value]) => [
			key,
			Number(value.toFixed(3)),
		]),
	) as ScoreParts;
}

function inlink_counts(db: WikiDatabase): Map<string, number> {
	const rows = db
		.prepare(
			`SELECT to_path, COUNT(DISTINCT from_path) AS count
			FROM links
			WHERE status IN ('resolved', 'ambiguous') AND to_path != from_path
			GROUP BY to_path`,
		)
		.all() as { to_path: string; count: number }[];
	return new Map(rows.map((row) => [row.to_path, row.count]));
}

// Old path -> newer path, from `supersedes` and `superseded_by`
// frontmatter on either side.
function successor_map(db: WikiDatabase): Map<string, string> {
	const rows = db
		.prepare('SELECT path, supersedes, superseded_by FROM pages')
		.all() as {
		path: string;
		supersedes: string;
		superseded_by: string | null;
	}[];
	const successors = new Map<string, string>();
	for (const row of rows) {
		for (const old of JSON.parse(row.supersedes) as string[]) {
			const old_path = find_indexed_path(db, old);
			if (old_path) successors.set(old_path, row.path);
		}
		if (row.superseded_by) {
			const next = find_indexed_path(db, row.superseded_by);
			successors.set(row.path, next ?? row.superseded_by);
		}
	}
	return successors;
}

function chunk_anchor(
	db: WikiDatabase,
	hit: Omit<SearchHit, 'anchor'>,
): string | null {
	if (!hit.heading) return null;
	const row = db
		.prepare(
			`SELECT slug FROM anchors
			WHERE path = ? AND kind = 'heading' AND text = ?
				AND line BETWEEN ? AND ?
			ORDER BY line LIMIT 1`,
		)
		.get(hit.path, hit.heading, hit.start_line, hit.end_line) as
		| { slug: string }
		| undefined;
	return row ? `${hit.path}#${row.slug}` : null;
}

function stale_warnings(root: string): string[] {
	const status = index_status(root);
	return status.stale
		? [
				`Index is stale (${status.reasons.join(', ')}); run \`wiki0 index\` before relying on these results.`,
			]
		: [];
}

// Returns a cited section. Targets: `path:12`, `path:12-30`,
// `path#heading`, `path` or a title. Text is read from the file so it
// is current; a warning says when the file changed since indexing.
export function show(
	target: string,
	root = '.',
	options: ShowOptions = {},
): ShowResult | null {
	const budget = options.token_budget ?? default_token_budget;
	const project_root = resolve_wiki_root(root);
	const db = open_index_or_throw(project_root);
	try {
		const parsed = parse_show_target(target);
		const path = find_indexed_path(db, parsed.page);
		if (!path) return null;
		const page = db
			.prepare(
				'SELECT title, content_hash, line_count, superseded_by FROM pages WHERE path = ?',
			)
			.get(path) as {
			title: string;
			content_hash: string;
			line_count: number;
			superseded_by: string | null;
		};
		const range = resolve_range(
			db,
			path,
			parsed,
			options.neighbours ?? 0,
		);
		if (!range) return null;
		const file_path = join(project_root, path);
		const warnings: string[] = [];
		if (!existsSync(file_path)) {
			return null;
		}
		const bytes = readFileSync(file_path);
		if (
			createHash('sha256').update(bytes).digest('hex') !==
			page.content_hash
		) {
			warnings.push(
				`${path} changed since it was indexed; line numbers may have moved. Run \`wiki0 index\`.`,
			);
		}
		const lines = bytes
			.toString('utf-8')
			.replace(/\r\n?/gu, '\n')
			.split('\n');
		const selected: string[] = [];
		let tokens = 0;
		let end_line = range.start_line - 1;
		for (
			let line = range.start_line;
			line <= range.end_line;
			line += 1
		) {
			const text = lines[line - 1] ?? '';
			const cost = estimate_tokens(text) + 1;
			if (selected.length > 0 && tokens + cost > budget) break;
			selected.push(text);
			tokens += cost;
			end_line = line;
		}
		const truncated = end_line < range.end_line;
		return {
			path,
			start_line: range.start_line,
			end_line,
			citation: `${path}:${range.start_line}-${end_line}`,
			title: page.title,
			breadcrumb: range.breadcrumb,
			markdown: selected.join('\n').trimEnd(),
			tokens,
			truncated,
			next: truncated
				? `${path}:${end_line + 1}-${range.end_line}`
				: null,
			superseded_by:
				page.superseded_by ?? successor_map(db).get(path) ?? null,
			warnings,
		};
	} finally {
		db.close();
	}
}

type ShowTarget = {
	page: string;
	start: number | null;
	end: number | null;
	anchor: string | null;
};

function parse_show_target(target: string): ShowTarget {
	const trimmed = target.trim();
	const lines = trimmed.match(/^(.*?):(\d+)(?:-(\d+))?$/u);
	if (lines) {
		return {
			page: lines[1] ?? '',
			start: Number(lines[2]),
			end: lines[3] ? Number(lines[3]) : null,
			anchor: null,
		};
	}
	const [page = '', ...anchor] = trimmed.split('#');
	return {
		page,
		start: null,
		end: null,
		anchor: anchor.length > 0 ? anchor.join('#') : null,
	};
}

function resolve_range(
	db: WikiDatabase,
	path: string,
	target: ShowTarget,
	neighbours: number,
): {
	start_line: number;
	end_line: number;
	breadcrumb: string[];
} | null {
	const chunks = db
		.prepare(
			'SELECT start_line, end_line, breadcrumb FROM page_chunks WHERE path = ? ORDER BY sequence',
		)
		.all(path) as {
		start_line: number;
		end_line: number;
		breadcrumb: string;
	}[];
	if (chunks.length === 0) return null;
	const breadcrumb_of = (index: number) =>
		(chunks[index]?.breadcrumb ?? '').split(' > ').filter(Boolean);

	if (target.start !== null && target.end !== null) {
		const index = chunks.findIndex(
			(chunk) => chunk.end_line >= (target.start ?? 0),
		);
		return {
			start_line: target.start,
			end_line: target.end,
			breadcrumb: breadcrumb_of(Math.max(0, index)),
		};
	}

	let line = target.start;
	if (line === null && target.anchor) {
		const anchor = db
			.prepare(
				`SELECT line FROM anchors WHERE path = ?
				AND (slug = ? OR lower(slug) = lower(?) OR lower(text) = lower(?))
				ORDER BY line LIMIT 1`,
			)
			.get(path, target.anchor, target.anchor, target.anchor) as
			| { line: number }
			| undefined;
		if (!anchor) return null;
		line = anchor.line;
	}
	if (line === null) {
		// Whole document.
		return {
			start_line: chunks[0]?.start_line ?? 1,
			end_line: chunks.at(-1)?.end_line ?? 1,
			breadcrumb: breadcrumb_of(0),
		};
	}
	const index = chunks.findIndex(
		(chunk) =>
			chunk.start_line <= (line ?? 0) &&
			chunk.end_line >= (line ?? 0),
	);
	if (index < 0) return null;
	const first = chunks[Math.max(0, index - neighbours)];
	const last =
		chunks[Math.min(chunks.length - 1, index + neighbours)];
	return {
		start_line: first?.start_line ?? 1,
		end_line: last?.end_line ?? 1,
		breadcrumb: breadcrumb_of(index),
	};
}

// Search plus the full text of the top sections, as Markdown for an
// agent, within one token budget.
export function get_wiki_context(
	query: string,
	root = '.',
	limit = 3,
	token_budget = default_token_budget * 2,
): ContextResult {
	const response = search(query, root, { limit });
	const lines = [`# wiki0 context: ${query}`, ''];
	if (response.warnings.length > 0) {
		lines.push(
			'## Warnings',
			'',
			...response.warnings.map((warning) => `- ${warning}`),
			'',
		);
	}
	if (response.results.length === 0) {
		lines.push('No matching sections.');
	}
	let remaining = token_budget;
	for (const [index, hit] of response.results.entries()) {
		const section = show(hit.citation, root, {
			token_budget: Math.max(
				200,
				Math.floor(remaining / (response.results.length - index)),
			),
		});
		if (!section) continue;
		remaining -= section.tokens;
		lines.push(
			`## ${index + 1}. ${hit.breadcrumb.join(' > ')}`,
			`Source: \`${section.citation}\``,
		);
		if (hit.superseded_by) {
			lines.push(`Superseded by: \`${hit.superseded_by}\``);
		}
		if (section.next) lines.push(`More: \`${section.next}\``);
		lines.push('', section.markdown, '');
	}
	return {
		query,
		relaxation: response.relaxation,
		results: response.results,
		warnings: response.warnings,
		markdown: `${lines.join('\n').trimEnd()}\n`,
	};
}

// Finds an indexed document by path, path without extension, unique
// path suffix, or title/alias.
export function find_indexed_path(
	db: WikiDatabase,
	target: string,
): string | null {
	const clean = target.split('#')[0]?.trim() ?? '';
	if (!clean) return null;
	const with_extension = /\.[a-z0-9]+$/iu.test(clean)
		? clean
		: `${clean}.md`;
	const rows = db
		.prepare('SELECT path, title, aliases FROM pages')
		.all() as { path: string; title: string; aliases: string }[];
	const exact = rows.find(
		(row) => row.path === clean || row.path === with_extension,
	);
	if (exact) return exact.path;
	const suffix = rows.filter((row) =>
		row.path.endsWith(`/${with_extension}`),
	);
	if (suffix.length === 1) return suffix[0]?.path ?? null;
	const name = clean.toLowerCase();
	const named = rows.find(
		(row) =>
			row.title.toLowerCase() === name ||
			(JSON.parse(row.aliases) as string[]).some(
				(alias) => alias.toLowerCase() === name,
			),
	);
	return named?.path ?? null;
}

export function backlinks_for_page(
	title: string,
	root = '.',
): BacklinkResult[] {
	const db = open_index_or_throw(root);
	try {
		const page_path = find_indexed_path(db, title);
		const rows = db
			.prepare(
				`SELECT pages.path, pages.title, links.line, links.kind,
					links.raw_text AS raw_text, links.alias
				FROM links
				JOIN pages ON pages.id = links.from_page_id
				WHERE links.to_path = ? AND links.status IN ('resolved', 'ambiguous')
				ORDER BY pages.path, links.line`,
			)
			.all(page_path) as Record<string, SQLOutputValue>[];
		return rows.map((row) => ({
			path: String(row.path),
			title: String(row.title),
			line: Number(row.line),
			kind: String(row.kind),
			raw_text: String(row.raw_text),
			alias: row.alias === null ? null : String(row.alias),
			embed: row.kind === 'embed',
		}));
	} finally {
		db.close();
	}
}
