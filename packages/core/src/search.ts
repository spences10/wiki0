import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { SQLOutputValue } from 'node:sqlite';
import { open_wiki_database } from './database.js';
import { index_status } from './indexer.js';
import { resolve_page_path } from './pages.js';
import { resolve_wiki_root } from './paths.js';
import type {
	BacklinkResult,
	ChunkSearchResult,
	ContextResult,
	SearchResult,
	ShowChunkResult,
} from './types.js';

export function search_wiki(
	query: string,
	root = '.',
	limit = 10,
): SearchResult[] {
	const db = open_wiki_database(root);
	const statement = db.prepare(
		`SELECT path, title,
			snippet(fts_pages, 2, '[', ']', '…', 12) AS snippet,
			bm25(fts_pages) AS rank
		FROM fts_pages
		WHERE fts_pages MATCH ?
		ORDER BY rank
		LIMIT ?`,
	);
	const fts_query = plain_text_fts_query(query);
	if (!fts_query) {
		db.close();
		return [];
	}

	try {
		const rows = statement.all(fts_query, limit) as SearchResult[];
		if (rows.length > 0) return rows;

		const relaxed_query = relaxed_plain_text_fts_query(query);
		if (!relaxed_query || relaxed_query === fts_query) return rows;
		return statement.all(relaxed_query, limit) as SearchResult[];
	} catch (error) {
		throw new Error(`Invalid wiki search query: ${query}`, {
			cause: error,
		});
	} finally {
		db.close();
	}
}

const stop_words = new Set([
	'a',
	'an',
	'and',
	'are',
	'as',
	'at',
	'be',
	'by',
	'did',
	'do',
	'does',
	'for',
	'from',
	'how',
	'in',
	'is',
	'it',
	'of',
	'on',
	'or',
	'that',
	'the',
	'this',
	'to',
	'was',
	'we',
	'what',
	'when',
	'where',
	'who',
	'why',
	'with',
]);

export function plain_text_fts_query(query: string): string {
	return plain_text_terms(query).map(quote_fts_term).join(' ');
}

export function relaxed_plain_text_fts_query(query: string): string {
	return plain_text_terms(query)
		.filter((term) => !stop_words.has(term.toLowerCase()))
		.map(quote_fts_term)
		.join(' OR ');
}

function plain_text_terms(query: string): string[] {
	return query
		.split(/\s+/u)
		.map((term) => term.replace(/^\W+|\W+$/gu, ''))
		.filter((term) => term.length > 0);
}

function quote_fts_term(term: string): string {
	return `"${term.replace(/"/gu, '""')}"`;
}

export function search_wiki_chunks(
	query: string,
	root = '.',
	limit = 10,
): ChunkSearchResult[] {
	const db = open_wiki_database(root);
	const statement = db.prepare(
		`SELECT fts_page_chunks.chunk_id AS chunk_id,
			fts_page_chunks.path,
			fts_page_chunks.title,
			page_chunks.heading,
			page_chunks.body,
			page_chunks.start_line AS start_line,
			page_chunks.end_line AS end_line,
			snippet(fts_page_chunks, 4, '[', ']', '…', 12) AS snippet,
			bm25(fts_page_chunks) AS rank
		FROM fts_page_chunks
		JOIN page_chunks ON page_chunks.id = fts_page_chunks.chunk_id
		WHERE fts_page_chunks MATCH ?
		ORDER BY rank
		LIMIT ?`,
	);
	const fts_query = plain_text_fts_query(query);
	if (!fts_query) {
		db.close();
		return [];
	}

	try {
		const rows = statement.all(
			fts_query,
			limit,
		) as ChunkSearchResult[];
		if (rows.length > 0) return rows;

		const relaxed_query = relaxed_plain_text_fts_query(query);
		if (!relaxed_query || relaxed_query === fts_query) return rows;
		return statement.all(relaxed_query, limit) as ChunkSearchResult[];
	} catch (error) {
		throw new Error(`Invalid wiki chunk search query: ${query}`, {
			cause: error,
		});
	} finally {
		db.close();
	}
}

export function show_wiki_chunk(
	target: string,
	root = '.',
): ShowChunkResult | null {
	const { path, line } = parse_chunk_target(target, root);
	const db = open_wiki_database(root);
	const row = db
		.prepare(
			`SELECT id AS chunk_id, path, title, heading, body,
				start_line AS start_line, end_line AS end_line,
				body AS snippet, 0 AS rank
			FROM page_chunks
			WHERE path = ? AND (? IS NULL OR (start_line <= ? AND end_line >= ?))
			ORDER BY sequence
			LIMIT 1`,
		)
		.get(path, line, line, line) as ShowChunkResult | undefined;
	db.close();
	return row ?? null;
}

function parse_chunk_target(
	target: string,
	root: string,
): { path: string; line: number | null } {
	const match = target.match(/^(.*?)(?::(\d+))?$/u);
	const title = match?.[1]?.trim() ?? target;
	const line = match?.[2] ? Number(match[2]) : null;
	const wiki_root = resolve_wiki_root(root);
	const direct_path = title.endsWith('.md') ? title : `${title}.md`;
	if (existsSync(join(wiki_root, 'wiki', direct_path))) {
		return { path: direct_path, line };
	}
	return { path: resolve_page_path(title, root), line };
}

export function get_wiki_context(
	query: string,
	root = '.',
	limit = 5,
): ContextResult {
	const status = index_status(root);
	const warnings = status.stale
		? [
				`Index is stale (${status.reasons.join(', ')}); run index_wiki before relying on these results.`,
			]
		: [];
	const results = search_wiki_chunks(query, root, limit);
	return {
		query,
		results,
		warnings,
		markdown: format_context_markdown(query, results, warnings),
	};
}

export function format_context_markdown(
	query: string,
	results: ChunkSearchResult[],
	warnings: string[] = [],
): string {
	const lines = [`# wiki0 context: ${query}`, ''];

	if (warnings.length > 0) {
		lines.push(
			'## Warnings',
			'',
			...warnings.map((warning) => `- ${warning}`),
			'',
		);
	}

	if (results.length === 0) {
		lines.push('No indexed wiki context found.');
		return `${lines.join('\n')}\n`;
	}

	for (const [index, result] of results.entries()) {
		const line_range = `${result.start_line}-${result.end_line}`;
		lines.push(
			`## ${index + 1}. ${result.title}`,
			`Source: \`wiki/${result.path}:${line_range}\``,
			result.heading ? `Heading: ${result.heading}` : '',
			'',
			result.body.trim(),
			'',
		);
	}

	return `${lines.join('\n').trimEnd()}\n`;
}

export function backlinks_for_page(
	title: string,
	root = '.',
): BacklinkResult[] {
	const db = open_wiki_database(root);
	const page_path = resolve_page_path(title, root);
	const rows = db
		.prepare(
			`SELECT pages.path, pages.title, page_links.raw_text AS raw_text,
				page_links.alias, page_links.embed
			FROM page_links
			JOIN pages ON pages.id = page_links.from_page_id
			WHERE page_links.to_path = ?
			ORDER BY pages.path`,
		)
		.all(page_path) as Record<string, SQLOutputValue>[];
	db.close();
	return rows.map(backlink_from_row);
}

function backlink_from_row(
	row: Record<string, SQLOutputValue>,
): BacklinkResult {
	return {
		path: String(row.path),
		title: String(row.title),
		raw_text: String(row.raw_text),
		alias: row.alias === null ? null : String(row.alias),
		embed: Boolean(row.embed),
	};
}
