import {
	open_index_or_throw,
	resolve_project_root,
} from './storage.js';
import type { DocumentSummary } from './types.js';

// Every indexed document with its outline and link counts, ordered by
// path.
export function list_documents(root = '.'): DocumentSummary[] {
	const db = open_index_or_throw(resolve_project_root(root));
	try {
		const pages = db
			.prepare(
				`SELECT path, title, kind, status, doc_type, doc_date, aliases,
					supersedes, superseded_by, line_count
				FROM pages ORDER BY path`,
			)
			.all() as {
			path: string;
			title: string;
			kind: string;
			status: string | null;
			doc_type: string | null;
			doc_date: string | null;
			aliases: string;
			supersedes: string;
			superseded_by: string | null;
			line_count: number;
		}[];
		const headings = db
			.prepare(
				`SELECT path, slug, text, depth, line FROM anchors
				WHERE kind = 'heading' ORDER BY path, line`,
			)
			.all() as {
			path: string;
			slug: string;
			text: string;
			depth: number;
			line: number;
		}[];
		const count = (column: 'from_path' | 'to_path') =>
			new Map(
				(
					db
						.prepare(
							`SELECT ${column} AS path, COUNT(*) AS count FROM links
							WHERE status IN ('resolved', 'ambiguous')
								AND to_path IS NOT NULL AND to_path != from_path
							GROUP BY ${column}`,
						)
						.all() as { path: string; count: number }[]
				).map((row) => [row.path, row.count]),
			);
		const out_links = count('from_path');
		const in_links = count('to_path');
		const outline = new Map<string, DocumentSummary['headings']>();
		for (const heading of headings) {
			const list = outline.get(heading.path) ?? [];
			list.push({
				slug: heading.slug,
				text: heading.text,
				depth: heading.depth,
				line: heading.line,
			});
			outline.set(heading.path, list);
		}
		return pages.map((page) => ({
			path: page.path,
			title: page.title,
			kind: page.kind,
			status: page.status,
			doc_type: page.doc_type,
			date: page.doc_date,
			aliases: JSON.parse(page.aliases) as string[],
			supersedes: JSON.parse(page.supersedes) as string[],
			superseded_by: page.superseded_by,
			line_count: page.line_count,
			headings: outline.get(page.path) ?? [],
			in_link_count: in_links.get(page.path) ?? 0,
			out_link_count: out_links.get(page.path) ?? 0,
		}));
	} finally {
		db.close();
	}
}
