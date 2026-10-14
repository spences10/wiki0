import {
	open_index_or_throw,
	resolve_project_root,
} from './storage.js';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { estimate_tokens } from './chunks.js';
import { link_issues } from './lint.js';
import { parse_markdown } from './markdown.js';
import { find_indexed_path } from './search.js';
import type {
	ChunkSummary,
	DocumentContent,
	DocumentLink,
	DocumentSummary,
	WikiFrontmatter,
} from './types.js';

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

// The chunks stored in the index for one document, in order. Returns
// null when the target is not an indexed document.
export function list_chunks(
	target: string,
	root = '.',
): ChunkSummary[] | null {
	const db = open_index_or_throw(resolve_project_root(root));
	try {
		const path = find_indexed_path(db, target);
		if (!path) return null;
		const rows = db
			.prepare(
				`SELECT start_line, end_line, heading, depth, breadcrumb, body
				FROM page_chunks WHERE path = ? ORDER BY sequence`,
			)
			.all(path) as {
			start_line: number;
			end_line: number;
			heading: string | null;
			depth: number;
			breadcrumb: string;
			body: string;
		}[];
		return rows.map((row) => ({
			start_line: row.start_line,
			end_line: row.end_line,
			citation: `${path}:${row.start_line}-${row.end_line}`,
			heading: row.heading,
			depth: row.depth,
			breadcrumb: row.breadcrumb.split(' > ').filter(Boolean),
			tokens: estimate_tokens(row.body),
		}));
	} finally {
		db.close();
	}
}

// The whole current file for an indexed document, with frontmatter
// split off. Returns null when the target is not indexed or the file
// is gone.
export function read_document(
	target: string,
	root = '.',
): DocumentContent | null {
	const project_root = resolve_project_root(root);
	const db = open_index_or_throw(project_root);
	let page:
		| {
				path: string;
				title: string;
				kind: string;
				content_hash: string;
				status: string | null;
				doc_type: string | null;
				doc_date: string | null;
				superseded_by: string | null;
				body: string;
		  }
		| undefined;
	try {
		const path = find_indexed_path(db, target);
		page = path
			? (db
					.prepare(
						`SELECT path, title, kind, content_hash, status, doc_type,
							doc_date, superseded_by, body
						FROM pages WHERE path = ?`,
					)
					.get(path) as typeof page)
			: undefined;
	} finally {
		db.close();
	}
	if (!page) return null;
	const file_path = join(project_root, page.path);
	if (!existsSync(file_path)) return null;
	const bytes = readFileSync(file_path);
	const warnings: string[] = [];
	if (
		createHash('sha256').update(bytes).digest('hex') !==
		page.content_hash
	) {
		warnings.push(
			`${page.path} changed since it was indexed. Run \`wiki0 index\`.`,
		);
	}
	// Non-Markdown documents return their extracted text from the index.
	if (page.kind !== 'markdown') {
		return {
			...document_fields(page),
			source: page.body,
			markdown: page.body,
			body_start_line: 1,
			frontmatter: {},
			warnings,
		};
	}
	const source = bytes.toString('utf-8').replace(/\r\n?/gu, '\n');
	let frontmatter: WikiFrontmatter = {};
	let markdown = source;
	try {
		const parsed = parse_markdown(source);
		frontmatter = parsed.frontmatter;
		markdown = parsed.content;
	} catch {
		const block = source.match(/^---\n[\s\S]*?\n---[ \t]*\n?/u);
		if (block) markdown = source.slice(block[0].length);
	}
	const prefix = source.slice(0, source.length - markdown.length);
	return {
		...document_fields(page),
		source,
		markdown,
		body_start_line: prefix.split('\n').length,
		frontmatter,
		warnings,
	};
}

function document_fields(page: {
	path: string;
	title: string;
	kind: string;
	status: string | null;
	doc_type: string | null;
	doc_date: string | null;
	superseded_by: string | null;
}) {
	return {
		path: page.path,
		title: page.title,
		kind: page.kind,
		status: page.status,
		doc_type: page.doc_type,
		date: page.doc_date,
		superseded_by: page.superseded_by,
	};
}

// One document's links in source order, with the lint rule for any
// link that has a problem. Returns null when the target is not indexed.
export function list_links(
	target: string,
	root = '.',
): DocumentLink[] | null {
	const db = open_index_or_throw(resolve_project_root(root));
	try {
		const path = find_indexed_path(db, target);
		if (!path) return null;
		const rows = db
			.prepare(
				`SELECT from_path, line, kind, raw_text, target, alias, to_path,
					to_anchor, status, quality, candidates
				FROM links WHERE from_path = ? ORDER BY line, id`,
			)
			.all(path) as {
			from_path: string;
			line: number;
			kind: string;
			raw_text: string;
			target: string;
			alias: string | null;
			to_path: string | null;
			to_anchor: string | null;
			status: string;
			quality: string | null;
			candidates: string;
		}[];
		return rows.map((row) => {
			const candidates = JSON.parse(row.candidates) as string[];
			const [issue] = link_issues({ ...row, candidates });
			return {
				line: row.line,
				kind: row.kind,
				raw_text: row.raw_text,
				target: row.target,
				alias: row.alias,
				embed: row.kind === 'embed',
				to: row.to_path,
				to_anchor: row.to_anchor,
				link_status: row.status,
				rule: issue?.rule ?? null,
				message: issue?.message ?? null,
				suggestions: issue?.suggestions ?? candidates,
			};
		});
	} finally {
		db.close();
	}
}
