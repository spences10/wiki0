import { open_wiki_database } from './database.js';
import { wikilink_target_path } from './paths.js';
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
	const rows = db
		.prepare(
			`SELECT path, title,
				snippet(fts_pages, 2, '[', ']', '…', 12) AS snippet,
				bm25(fts_pages) AS rank
			FROM fts_pages
			WHERE fts_pages MATCH ?
			ORDER BY rank
			LIMIT ?`,
		)
		.all(query, limit) as SearchResult[];
	db.close();
	return rows;
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
	const page_path = wikilink_target_path(title);
	const rows = db
		.prepare(
			`SELECT pages.path, pages.title, page_links.raw_text AS rawText,
				page_links.alias, page_links.embed
			FROM page_links
			JOIN pages ON pages.id = page_links.from_page_id
			WHERE page_links.to_path = ?
			ORDER BY pages.path`,
		)
		.all(page_path) as BacklinkResult[];
	db.close();
	return rows.map((row) => ({ ...row, embed: Boolean(row.embed) }));
}
