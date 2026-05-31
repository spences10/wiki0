import type { SQLOutputValue } from 'node:sqlite';
import { open_wiki_database } from './database.js';
import { resolve_page_path } from './pages.js';
import type {
	BacklinkResult,
	ContextResult,
	SearchResult,
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

export function get_wiki_context(
	query: string,
	root = '.',
	limit = 5,
): ContextResult {
	const results = search_wiki(query, root, limit);
	return {
		query,
		results,
		markdown: format_context_markdown(query, results),
	};
}

export function format_context_markdown(
	query: string,
	results: SearchResult[],
): string {
	const lines = [`# wiki0 context: ${query}`, ''];

	if (results.length === 0) {
		lines.push('No indexed wiki context found.');
		return `${lines.join('\n')}\n`;
	}

	for (const [index, result] of results.entries()) {
		lines.push(
			`## ${index + 1}. ${result.title}`,
			`Source: \`wiki/${result.path}\``,
			'',
			result.snippet.replace(/\s+/gu, ' ').trim(),
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
			`SELECT pages.path, pages.title, page_links.raw_text AS rawText,
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
		rawText: String(row.rawText),
		alias: row.alias === null ? null : String(row.alias),
		embed: Boolean(row.embed),
	};
}
