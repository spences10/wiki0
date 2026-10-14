import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import {
	chunk_markdown,
	chunk_plain_text,
	type DocumentChunk,
} from './chunks.js';
import { read_config } from './config.js';
import { document_kind, parse_document } from './documents.js';
import { log_wiki_event } from './events.js';
import { list_project_files } from './files.js';
import { parse_markdown, parse_wikilinks } from './markdown.js';
import { resolve_wiki_root } from './paths.js';
import { index_schema_version } from './schema.js';
import {
	open_index,
	open_index_readonly,
	resolve_index,
	type WikiDatabase,
} from './storage.js';
import type {
	IndexResult,
	IndexStatus,
	WikiFrontmatter,
	WikiLink,
} from './types.js';

export const current_index_schema_version = index_schema_version;
export const current_index_package_version = read_package_version();

type DocumentMeta = {
	status: string | null;
	doc_type: string | null;
	doc_date: string | null;
	priority: number;
	aliases: string[];
	tags: string[];
	supersedes: string[];
	superseded_by: string | null;
};

type IndexedDocument = {
	path: string;
	kind: string;
	title: string;
	text: string;
	content_hash: string;
	modified_at: string;
	meta: DocumentMeta;
	chunks: DocumentChunk[];
	links: WikiLink[];
};

export async function index_wiki(root = '.'): Promise<IndexResult> {
	const project_root = resolve_wiki_root(root);
	const config = read_config(project_root);
	const warnings: string[] = [];
	const documents: IndexedDocument[] = [];
	for (const path of list_project_files(project_root, config)) {
		const document = await read_project_document(
			project_root,
			path,
			warnings,
		);
		if (document) documents.push(document);
	}

	const db_path = resolve_index(project_root).index_path;
	const db = open_index(project_root);
	const indexed_at = new Date().toISOString();
	let link_count = 0;
	let chunk_count = 0;
	db.exec('BEGIN');
	try {
		// The index is a cache, so each run rebuilds it from the files.
		db.exec(
			'DELETE FROM fts_pages; DELETE FROM fts_page_chunks; DELETE FROM page_chunks; DELETE FROM page_links; DELETE FROM pages;',
		);
		const resolve_link = link_resolver(documents);
		const insert_page = db.prepare(`
			INSERT INTO pages (
				path, title, body, content_hash, modified_at, kind, status,
				doc_type, doc_date, priority, aliases, tags, supersedes,
				superseded_by
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);
		const insert_link = db.prepare(`
			INSERT INTO page_links (from_page_id, to_path, raw_text, target, alias, embed, status)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`);
		const insert_fts = db.prepare(
			'INSERT INTO fts_pages (path, title, body) VALUES (?, ?, ?)',
		);
		const insert_chunk = db.prepare(`
			INSERT INTO page_chunks (
				page_id, path, title, heading, depth, breadcrumb, body,
				start_line, end_line, sequence, page_priority, page_status,
				page_tags
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);
		const insert_chunk_fts = db.prepare(
			'INSERT INTO fts_page_chunks (chunk_id, path, title, heading, body, breadcrumb, aliases) VALUES (?, ?, ?, ?, ?, ?, ?)',
		);

		for (const document of documents) {
			const { meta } = document;
			const page_id = insert_page.run(
				document.path,
				document.title,
				document.text,
				document.content_hash,
				document.modified_at,
				document.kind,
				meta.status,
				meta.doc_type,
				meta.doc_date,
				meta.priority,
				JSON.stringify(meta.aliases),
				JSON.stringify(meta.tags),
				JSON.stringify(meta.supersedes),
				meta.superseded_by,
			).lastInsertRowid;
			insert_fts.run(document.path, document.title, document.text);

			for (const link of document.links) {
				const to_path = resolve_link(link.target);
				insert_link.run(
					page_id,
					to_path,
					link.raw,
					link.target,
					link.alias ?? null,
					link.embed ? 1 : 0,
					to_path ? 'resolved' : 'unresolved',
				);
				link_count += 1;
			}

			for (const chunk of document.chunks) {
				const breadcrumb = chunk.breadcrumb.join(' > ');
				const chunk_id = insert_chunk.run(
					page_id,
					document.path,
					document.title,
					chunk.heading,
					chunk.depth,
					breadcrumb,
					chunk.body,
					chunk.start_line,
					chunk.end_line,
					chunk.sequence,
					meta.priority,
					meta.status,
					JSON.stringify(meta.tags),
				).lastInsertRowid;
				insert_chunk_fts.run(
					chunk_id,
					document.path,
					document.title,
					chunk.heading,
					chunk.body,
					breadcrumb,
					meta.aliases.join(' '),
				);
				chunk_count += 1;
			}
		}

		set_meta(db, 'indexed_at', indexed_at);
		set_meta(db, 'schema_version', String(index_schema_version));
		set_meta(db, 'package_version', current_index_package_version);
		db.exec('COMMIT');
	} catch (error) {
		db.exec('ROLLBACK');
		throw error;
	} finally {
		db.close();
	}

	log_wiki_event({
		root: project_root,
		operation: 'index_wiki',
		summary: `Indexed ${documents.length} documents and ${link_count} links`,
		target: project_root,
		details: {
			page_count: documents.length,
			chunk_count,
			link_count,
			schema_version: index_schema_version,
		},
	});
	return {
		root: project_root,
		db_path,
		page_count: documents.length,
		chunk_count,
		link_count,
		warnings,
		indexed_at,
		schema_version: index_schema_version,
		package_version: current_index_package_version,
	};
}

async function read_project_document(
	root: string,
	path: string,
	warnings: string[],
): Promise<IndexedDocument | null> {
	const kind = document_kind(path);
	if (kind === 'unsupported') {
		warnings.push(`${path}: unsupported file type, skipped`);
		return null;
	}
	const absolute_path = join(root, path);
	const bytes = readFileSync(absolute_path);
	const content_hash = createHash('sha256')
		.update(bytes)
		.digest('hex');
	const modified_at = statSync(absolute_path).mtime.toISOString();
	const fallback_title = basename(path, extname(path));

	if (kind === 'markdown') {
		const source = bytes.toString('utf-8').replace(/\r\n?/gu, '\n');
		let frontmatter: WikiFrontmatter = {};
		let content = source;
		try {
			const parsed = parse_markdown(source);
			frontmatter = parsed.frontmatter;
			content = parsed.content;
		} catch (error) {
			warnings.push(`${path}: ${(error as Error).message}`);
			const block = source.match(/^---\n[\s\S]*?\n---[ \t]*\n?/u);
			if (block) content = source.slice(block[0].length);
		}
		const line_offset = count_lines_before(source, content);
		const chunks_without_title = chunk_markdown(
			content,
			'',
			line_offset,
		);
		const title =
			string_value(frontmatter.title) ??
			first_h1(chunks_without_title) ??
			fallback_title;
		return {
			path,
			kind,
			title,
			text: content,
			content_hash,
			modified_at,
			meta: document_meta(frontmatter),
			chunks: chunk_markdown(content, title, line_offset),
			links: parse_wikilinks(content),
		};
	}

	const parsed = await parse_document(absolute_path);
	warnings.push(
		...parsed.warnings.map((warning) => `${path}: ${warning}`),
	);
	const title = parsed.title ?? fallback_title;
	return {
		path,
		kind,
		title,
		text: parsed.text,
		content_hash,
		modified_at,
		meta: document_meta({}),
		chunks: chunk_plain_text(parsed.text, title),
		links: [],
	};
}

// Resolves a wikilink target to an indexed path: exact path, unique
// path suffix, then title or alias.
function link_resolver(
	documents: IndexedDocument[],
): (target: string) => string | null {
	const paths = new Set(documents.map((document) => document.path));
	const names = new Map<string, string>();
	for (const document of documents) {
		for (const name of [document.title, ...document.meta.aliases]) {
			const key = name.trim().toLowerCase();
			if (key && !names.has(key)) names.set(key, document.path);
		}
	}
	return (raw_target) => {
		const target = raw_target.split('#')[0]?.trim() ?? '';
		if (!target) return null;
		const with_extension = target.endsWith('.md')
			? target
			: `${target}.md`;
		if (paths.has(with_extension)) return with_extension;
		const suffix_matches = [...paths].filter((path) =>
			path.endsWith(`/${with_extension}`),
		);
		if (suffix_matches.length === 1) return suffix_matches[0] ?? null;
		return names.get(target.toLowerCase()) ?? null;
	};
}

function document_meta(frontmatter: WikiFrontmatter): DocumentMeta {
	return {
		status: string_value(frontmatter.status)?.toLowerCase() ?? null,
		doc_type: string_value(frontmatter.type)?.toLowerCase() ?? null,
		doc_date: string_value(frontmatter.date),
		priority:
			typeof frontmatter.priority === 'number' &&
			Number.isFinite(frontmatter.priority)
				? frontmatter.priority
				: 0,
		aliases: string_list(frontmatter.aliases),
		tags: string_list(frontmatter.tags),
		supersedes: string_list(frontmatter.supersedes),
		superseded_by: string_value(frontmatter.superseded_by),
	};
}

function first_h1(chunks: DocumentChunk[]): string | null {
	return chunks.find((chunk) => chunk.depth === 1)?.heading ?? null;
}

function count_lines_before(source: string, content: string): number {
	const prefix = source.slice(0, source.length - content.length);
	return prefix.split('\n').length - 1;
}

function string_value(value: unknown): string | null {
	return typeof value === 'string' && value.trim().length > 0
		? value.trim()
		: null;
}

function string_list(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value.filter(
			(item): item is string =>
				typeof item === 'string' && item.trim().length > 0,
		);
	}
	const single = string_value(value);
	return single ? [single] : [];
}

function set_meta(
	db: WikiDatabase,
	key: string,
	value: string,
): void {
	db.prepare(
		`INSERT INTO wiki_meta (key, value, updated_at)
		VALUES (?, ?, datetime('now'))
		ON CONFLICT(key) DO UPDATE SET
			value = excluded.value,
			updated_at = datetime('now')`,
	).run(key, value);
}

export function index_status(root = '.'): IndexStatus {
	const project_root = resolve_wiki_root(root);
	const db_path = resolve_index(project_root).index_path;
	const file_paths = list_project_files(
		project_root,
		read_config(project_root),
	).filter((path) => document_kind(path) !== 'unsupported');
	const db = open_index_readonly(project_root);
	if (!db) {
		return {
			root: project_root,
			db_path,
			exists: existsSync(db_path),
			indexed_at: null,
			schema_version: null,
			current_schema_version: index_schema_version,
			package_version: null,
			current_package_version: current_index_package_version,
			page_count: file_paths.length,
			indexed_page_count: 0,
			stale: true,
			reasons: [
				existsSync(db_path)
					? 'schema-version-mismatch'
					: 'missing-index',
			],
		};
	}

	const meta = new Map(
		(
			db.prepare('SELECT key, value FROM wiki_meta').all() as {
				key: string;
				value: string;
			}[]
		).map((row) => [row.key, row.value]),
	);
	const indexed_hashes = new Map(
		(
			db.prepare('SELECT path, content_hash FROM pages').all() as {
				path: string;
				content_hash: string;
			}[]
		).map((row) => [row.path, row.content_hash]),
	);
	db.close();

	const indexed_at = meta.get('indexed_at') ?? null;
	const package_version = meta.get('package_version') ?? null;
	const reasons: string[] = [];
	if (!indexed_at) reasons.push('never-indexed');
	if (package_version !== current_index_package_version) {
		reasons.push('package-version-mismatch');
	}
	const current_paths = new Set(file_paths);
	for (const path of indexed_hashes.keys()) {
		if (!current_paths.has(path)) reasons.push('deleted-pages');
	}
	for (const path of file_paths) {
		const indexed_hash = indexed_hashes.get(path);
		if (!indexed_hash) {
			reasons.push('new-pages');
			continue;
		}
		const current_hash = createHash('sha256')
			.update(readFileSync(join(project_root, path)))
			.digest('hex');
		if (current_hash !== indexed_hash) reasons.push('modified-pages');
	}

	return {
		root: project_root,
		db_path,
		exists: true,
		indexed_at,
		schema_version: index_schema_version,
		current_schema_version: index_schema_version,
		package_version,
		current_package_version: current_index_package_version,
		page_count: file_paths.length,
		indexed_page_count: indexed_hashes.size,
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
