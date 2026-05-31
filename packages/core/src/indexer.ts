import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { open_wiki_database, wiki_db_path } from './database.js';
import {
	list_markdown_page_paths,
	read_page_by_path,
} from './pages.js';
import { resolve_wiki_root, wikilink_target_path } from './paths.js';
import type { IndexResult, IndexStatus } from './types.js';

export const current_index_schema_version = 2;
export const current_index_package_version = read_package_version();

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
	const clear_chunks = db.prepare('DELETE FROM page_chunks');
	const clear_chunk_fts = db.prepare('DELETE FROM fts_page_chunks');
	const insert_fts = db.prepare(
		'INSERT INTO fts_pages (path, title, body) VALUES (?, ?, ?)',
	);
	const insert_chunk = db.prepare(`
		INSERT INTO page_chunks (page_id, path, title, heading, body, start_line, end_line, sequence)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`);
	const insert_chunk_fts = db.prepare(
		'INSERT INTO fts_page_chunks (chunk_id, path, title, heading, body) VALUES (?, ?, ?, ?, ?)',
	);
	const set_meta = db.prepare(`
		INSERT INTO wiki_meta (key, value, updated_at)
		VALUES (?, ?, datetime('now'))
		ON CONFLICT(key) DO UPDATE SET
			value = excluded.value,
			updated_at = datetime('now')
	`);
	const page_paths = list_markdown_page_paths(wiki_root);
	const known_paths = new Set(page_paths);
	const pages = page_paths.map((page_path) =>
		read_page_by_path(page_path, wiki_root),
	);
	const name_paths = new Map<string, string>();
	for (const page of pages) {
		const aliases = page.frontmatter.aliases;
		const alias_list = Array.isArray(aliases)
			? aliases.filter((alias) => typeof alias === 'string')
			: typeof aliases === 'string'
				? [aliases]
				: [];
		for (const name of [page.title, ...alias_list]) {
			const normalized_name = name.trim().toLowerCase();
			if (normalized_name) name_paths.set(normalized_name, page.path);
		}
	}

	let indexed_at = new Date().toISOString();
	db.exec('BEGIN');
	try {
		indexed_at = new Date().toISOString();
		clear_fts.run();
		clear_chunks.run();
		clear_chunk_fts.run();
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
			for (const chunk of chunk_page_body(page.body)) {
				const chunk_result = insert_chunk.run(
					row.id,
					page.path,
					page.title,
					chunk.heading,
					chunk.body,
					chunk.startLine,
					chunk.endLine,
					chunk.sequence,
				);
				insert_chunk_fts.run(
					chunk_result.lastInsertRowid,
					page.path,
					page.title,
					chunk.heading,
					chunk.body,
				);
			}
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
		set_meta.run('indexed_at', indexed_at);
		set_meta.run(
			'schema_version',
			String(current_index_schema_version),
		);
		set_meta.run('package_version', current_index_package_version);
		db.exec('COMMIT');
	} catch (error) {
		db.exec('ROLLBACK');
		throw error;
	}
	db.close();
	return {
		root: wiki_root,
		dbPath: db_path,
		pageCount: page_count,
		linkCount: link_count,
		indexedAt: indexed_at,
		schemaVersion: current_index_schema_version,
		packageVersion: current_index_package_version,
	};
}

type PageChunk = {
	heading: string | null;
	body: string;
	startLine: number;
	endLine: number;
	sequence: number;
};

export function chunk_page_body(body: string): PageChunk[] {
	const lines = body.split(/\r?\n/u);
	const heading_lines = lines
		.map((line, index) => ({ line, index }))
		.filter(({ line }) => /^#{1,6}\s+\S/u.test(line));

	if (heading_lines.length === 0) {
		return [
			{
				heading: null,
				body: body.trim(),
				startLine: 1,
				endLine: Math.max(lines.length, 1),
				sequence: 0,
			},
		];
	}

	return heading_lines.map((heading, sequence) => {
		const next_heading = heading_lines[sequence + 1];
		const end_index = next_heading
			? next_heading.index - 1
			: lines.length - 1;
		return {
			heading: heading.line.replace(/^#{1,6}\s+/u, '').trim(),
			body: lines
				.slice(heading.index, end_index + 1)
				.join('\n')
				.trim(),
			startLine: heading.index + 1,
			endLine: end_index + 1,
			sequence,
		};
	});
}

export function index_status(root = '.'): IndexStatus {
	const wiki_root = resolve_wiki_root(root);
	const db_path = wiki_db_path(wiki_root);
	const page_paths = list_markdown_page_paths(wiki_root);
	const reasons: string[] = [];
	if (!existsSync(db_path)) {
		return {
			root: wiki_root,
			dbPath: db_path,
			exists: false,
			indexedAt: null,
			schemaVersion: null,
			currentSchemaVersion: current_index_schema_version,
			packageVersion: null,
			currentPackageVersion: current_index_package_version,
			pageCount: page_paths.length,
			indexedPageCount: 0,
			stale: true,
			reasons: ['missing-index'],
		};
	}

	const db = open_wiki_database(wiki_root);
	const meta_rows = db
		.prepare('SELECT key, value FROM wiki_meta')
		.all() as { key: string; value: string }[];
	const meta = new Map(meta_rows.map((row) => [row.key, row.value]));
	const indexed_at = meta.get('indexed_at') ?? null;
	const schema_version = Number(meta.get('schema_version') ?? NaN);
	const package_version = meta.get('package_version') ?? null;
	const indexed_page_count = (
		db.prepare('SELECT COUNT(*) AS count FROM pages').get() as {
			count: number;
		}
	).count;
	const indexed_pages = db
		.prepare('SELECT path, content_hash AS contentHash FROM pages')
		.all() as { path: string; contentHash: string }[];
	db.close();

	if (!indexed_at) reasons.push('never-indexed');
	if (schema_version !== current_index_schema_version) {
		reasons.push('schema-version-mismatch');
	}
	if (package_version !== current_index_package_version) {
		reasons.push('package-version-mismatch');
	}
	if (indexed_page_count !== page_paths.length) {
		reasons.push('page-count-changed');
	}

	const current_paths = new Set(page_paths);
	const indexed_hashes = new Map(
		indexed_pages.map((page) => [page.path, page.contentHash]),
	);
	for (const page of indexed_pages) {
		if (!current_paths.has(page.path)) reasons.push('deleted-pages');
	}
	for (const page_path of page_paths) {
		const page = read_page_by_path(page_path, wiki_root);
		const current_hash = createHash('sha256')
			.update(page.body)
			.digest('hex');
		const indexed_hash = indexed_hashes.get(page_path);
		if (!indexed_hash) reasons.push('new-pages');
		else if (indexed_hash !== current_hash)
			reasons.push('modified-pages');
	}

	return {
		root: wiki_root,
		dbPath: db_path,
		exists: true,
		indexedAt: indexed_at,
		schemaVersion: Number.isNaN(schema_version)
			? null
			: schema_version,
		currentSchemaVersion: current_index_schema_version,
		packageVersion: package_version,
		currentPackageVersion: current_index_package_version,
		pageCount: page_paths.length,
		indexedPageCount: indexed_page_count,
		stale: reasons.length > 0,
		reasons: [...new Set(reasons)],
	};
}

function read_package_version(): string {
	try {
		const package_json = JSON.parse(
			readFileSync(
				new URL('../package.json', import.meta.url),
				'utf-8',
			),
		) as { version?: string };
		return package_json.version ?? '0.0.0';
	} catch {
		return '0.0.0';
	}
}
