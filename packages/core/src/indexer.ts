import { createHash } from 'node:crypto';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { open_wiki_database, wiki_db_path } from './database.js';
import {
	list_markdown_page_paths,
	read_page_by_path,
} from './pages.js';
import { resolve_wiki_root, wikilink_target_path } from './paths.js';
import type { IndexResult } from './types.js';

export function index_wiki(root = '.'): IndexResult {
	const wiki_root = resolve_wiki_root(root);
	const db_path = wiki_db_path(wiki_root);
	const db = open_wiki_database(wiki_root);
	let page_count = 0;
	let link_count = 0;

	const upsert_page = db.prepare(`
		INSERT INTO pages (path, title, body, content_hash, modified_at)
		VALUES (@path, @title, @body, @content_hash, @modified_at)
		ON CONFLICT(path) DO UPDATE SET
			title = excluded.title,
			body = excluded.body,
			content_hash = excluded.content_hash,
			modified_at = excluded.modified_at,
			updated_at = datetime('now')
	`);
	const page_id_query = db.prepare(
		'SELECT id FROM pages WHERE path = ?',
	);
	const delete_links = db.prepare(
		'DELETE FROM page_links WHERE from_page_id = ?',
	);
	const insert_link = db.prepare(`
		INSERT INTO page_links (from_page_id, to_path, raw_text, target, alias, embed, status)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`);
	const clear_fts = db.prepare('DELETE FROM fts_pages');
	const insert_fts = db.prepare(
		'INSERT INTO fts_pages (path, title, body) VALUES (?, ?, ?)',
	);
	const page_paths = list_markdown_page_paths(wiki_root);
	const known_paths = new Set(page_paths);
	const pages = page_paths.map((page_path) =>
		read_page_by_path(page_path, wiki_root),
	);
	const name_paths = new Map<string, string>();
	for (const page of pages) {
		const aliases = page.frontmatter.aliases;
		const alias_list = Array.isArray(aliases)
			? aliases
			: typeof aliases === 'string'
				? [aliases]
				: [];
		for (const name of [page.title, ...alias_list]) {
			const normalized_name = name.trim().toLowerCase();
			if (normalized_name) name_paths.set(normalized_name, page.path);
		}
	}

	const transaction = db.transaction(() => {
		clear_fts.run();
		for (const page of pages) {
			const file_path = join(wiki_root, 'wiki', page.path);
			const modified_at = statSync(file_path).mtime.toISOString();
			const content_hash = createHash('sha256')
				.update(page.body)
				.digest('hex');

			upsert_page.run({
				path: page.path,
				title: page.title,
				body: page.body,
				content_hash,
				modified_at,
			});
			const row = page_id_query.get(page.path) as { id: number };
			delete_links.run(row.id);
			for (const link of page.links) {
				const direct_path = wikilink_target_path(link.target);
				const target_name =
					link.target.split('#')[0]?.trim().toLowerCase() ?? '';
				const resolved_path = known_paths.has(direct_path)
					? direct_path
					: name_paths.get(target_name);
				const is_resolved = Boolean(resolved_path);
				insert_link.run(
					row.id,
					resolved_path ?? null,
					link.raw,
					link.target,
					link.alias ?? null,
					link.embed ? 1 : 0,
					is_resolved ? 'resolved' : 'unresolved',
				);
				link_count += 1;
			}
			insert_fts.run(page.path, page.title, page.content);
			page_count += 1;
		}

		const placeholders = [...known_paths].map(() => '?').join(', ');
		if (known_paths.size > 0) {
			db.prepare(
				`DELETE FROM pages WHERE path NOT IN (${placeholders})`,
			).run(...known_paths);
		} else {
			db.prepare('DELETE FROM pages').run();
		}
	});

	transaction();
	db.close();
	return {
		root: wiki_root,
		dbPath: db_path,
		pageCount: page_count,
		linkCount: link_count,
	};
}
