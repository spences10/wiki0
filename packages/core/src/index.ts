import {
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export type WikiConfig = {
	root: string;
	wikiDir?: string;
	dbPath?: string;
};

export type WikiLink = {
	raw: string;
	target: string;
	alias?: string;
	embed: boolean;
};

export type FrontmatterValue = string | number | boolean | string[];

export type WikiFrontmatter = Record<string, FrontmatterValue>;

export type ParsedMarkdown = {
	frontmatter: WikiFrontmatter;
	content: string;
};

export type WikiPage = {
	path: string;
	title: string;
	body: string;
	content: string;
	frontmatter: WikiFrontmatter;
	links: WikiLink[];
};

export type PageWriteOptions = {
	root?: string;
	overwrite?: boolean;
};

export function parse_wikilinks(markdown: string): WikiLink[] {
	const links: WikiLink[] = [];
	const pattern = /(!?)\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/gu;
	const searchable_markdown = strip_inline_code(
		strip_fenced_code_blocks(parse_markdown(markdown).content),
	);

	for (const match of searchable_markdown.matchAll(pattern)) {
		const [, embed_marker, target, alias] = match;
		links.push({
			raw: match[0],
			target: target.trim(),
			alias: alias?.trim(),
			embed: embed_marker === '!',
		});
	}

	return links;
}

export function strip_fenced_code_blocks(markdown: string): string {
	return markdown.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1\s*$/gmu, '');
}

export function strip_inline_code(markdown: string): string {
	return markdown.replace(/`[^`\n]*`/gu, '');
}

export function parse_markdown(markdown: string): ParsedMarkdown {
	if (
		!markdown.startsWith('---\n') &&
		!markdown.startsWith('---\r\n')
	) {
		return { frontmatter: {}, content: markdown };
	}

	const match = markdown.match(
		/^---\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/u,
	);
	if (!match) return { frontmatter: {}, content: markdown };

	return {
		frontmatter: parse_frontmatter(match[1] ?? ''),
		content: markdown.slice(match[0].length),
	};
}

export function parse_frontmatter(source: string): WikiFrontmatter {
	const frontmatter: WikiFrontmatter = {};
	let current_key: string | undefined;

	for (const raw_line of source.split(/\r?\n/u)) {
		const line = raw_line.trimEnd();
		if (line.trim().length === 0) continue;

		const list_match = line.match(/^\s*-\s+(.+)$/u);
		if (list_match && current_key) {
			const value = frontmatter[current_key];
			const values = Array.isArray(value)
				? value
				: value === undefined
					? []
					: [String(value)];
			values.push(
				String(parse_frontmatter_scalar(list_match[1] ?? '')),
			);
			frontmatter[current_key] = values;
			continue;
		}

		const pair_match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/u);
		if (!pair_match) continue;

		const [, key, value] = pair_match;
		current_key = key;
		frontmatter[key] =
			value.length > 0 ? parse_frontmatter_scalar(value) : [];
	}

	return frontmatter;
}

function parse_frontmatter_scalar(value: string): FrontmatterValue {
	const trimmed_value = value.trim();
	const unquoted_value = trimmed_value.replace(/^['"]|['"]$/gu, '');

	if (trimmed_value === 'true') return true;
	if (trimmed_value === 'false') return false;
	if (/^-?\d+(?:\.\d+)?$/u.test(trimmed_value))
		return Number(trimmed_value);
	if (trimmed_value.startsWith('[') && trimmed_value.endsWith(']')) {
		return trimmed_value
			.slice(1, -1)
			.split(',')
			.map((item) => item.trim().replace(/^['"]|['"]$/gu, ''))
			.filter((item) => item.length > 0);
	}
	return unquoted_value;
}

export function slugify_title(title: string): string {
	return title
		.trim()
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/gu, '')
		.replace(/[^a-z0-9]+/gu, '-')
		.replace(/^-+|-+$/gu, '');
}

export function page_title_from_markdown(
	markdown: string,
	fallback: string,
): string {
	const parsed_markdown = parse_markdown(markdown);
	const frontmatter_title = parsed_markdown.frontmatter.title;
	if (
		typeof frontmatter_title === 'string' &&
		frontmatter_title.length > 0
	) {
		return frontmatter_title;
	}

	const heading = parsed_markdown.content
		.match(/^#\s+(.+)$/mu)?.[1]
		?.trim();
	return heading && heading.length > 0 ? heading : fallback;
}

export function resolve_wiki_root(start_path = '.'): string {
	let current_path = resolve(start_path);

	while (true) {
		if (
			existsSync(join(current_path, '.wiki0')) ||
			existsSync(join(current_path, 'wiki'))
		) {
			return current_path;
		}

		const parent_path = dirname(current_path);
		if (parent_path === current_path) {
			return resolve(start_path);
		}
		current_path = parent_path;
	}
}

export function page_relative_path(title: string): string {
	const path_parts = title
		.split('/')
		.map((part) => slugify_title(part))
		.filter((part) => part.length > 0);

	if (path_parts.length === 0) {
		throw new Error(
			'Page title must include at least one slug character',
		);
	}

	return `${path_parts.join('/')}.md`;
}

export function page_file_path(title: string, root = '.'): string {
	return join(
		resolve_wiki_root(root),
		'wiki',
		page_relative_path(title),
	);
}

export function display_page_title(title: string): string {
	return title.split('/').filter(Boolean).at(-1)?.trim() ?? title;
}

export function create_page(
	title: string,
	body: string,
	options: PageWriteOptions = {},
): WikiPage {
	const file_path = page_file_path(title, options.root);
	const page_body = body.match(/^#\s+/mu)
		? body
		: `# ${display_page_title(title)}\n\n${body}`;

	mkdirSync(dirname(file_path), { recursive: true });
	writeFileSync(
		file_path,
		page_body.endsWith('\n') ? page_body : `${page_body}\n`,
		{
			flag: options.overwrite ? 'w' : 'wx',
		},
	);

	return read_page(title, options.root);
}

export function read_page(title: string, root = '.'): WikiPage {
	const file_path = page_file_path(title, root);
	const body = readFileSync(file_path, 'utf-8');
	const parsed_markdown = parse_markdown(body);

	return {
		path: page_relative_path(title),
		title: page_title_from_markdown(body, display_page_title(title)),
		body,
		content: parsed_markdown.content,
		frontmatter: parsed_markdown.frontmatter,
		links: parse_wikilinks(body),
	};
}

export function append_page(
	title: string,
	body: string,
	root = '.',
): WikiPage {
	const file_path = page_file_path(title, root);
	const append_body = body.startsWith('\n') ? body : `\n${body}`;
	writeFileSync(
		file_path,
		append_body.endsWith('\n') ? append_body : `${append_body}\n`,
		{
			flag: 'a',
		},
	);
	return read_page(title, root);
}

export const schema_sql = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS pages (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	path TEXT NOT NULL UNIQUE,
	title TEXT NOT NULL,
	body TEXT NOT NULL,
	content_hash TEXT NOT NULL,
	modified_at TEXT NOT NULL,
	created_at TEXT DEFAULT (datetime('now')),
	updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS page_links (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	from_page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
	to_path TEXT,
	raw_text TEXT NOT NULL,
	target TEXT NOT NULL,
	alias TEXT,
	embed INTEGER NOT NULL DEFAULT 0,
	status TEXT NOT NULL DEFAULT 'unresolved',
	created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS facts (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	page_id INTEGER REFERENCES pages(id) ON DELETE SET NULL,
	category TEXT NOT NULL,
	summary TEXT NOT NULL,
	body TEXT,
	confidence TEXT NOT NULL DEFAULT 'unknown',
	created_at TEXT DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE IF NOT EXISTS fts_pages USING fts5(path, title, body);
`;
