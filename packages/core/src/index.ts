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

export type WikiPage = {
	path: string;
	title: string;
	body: string;
	links: WikiLink[];
};

export function parse_wikilinks(markdown: string): WikiLink[] {
	const links: WikiLink[] = [];
	const pattern = /(!?)\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/gu;

	for (const match of markdown.matchAll(pattern)) {
		const [, embedMarker, target, alias] = match;
		links.push({
			raw: match[0],
			target: target.trim(),
			alias: alias?.trim(),
			embed: embedMarker === '!',
		});
	}

	return links;
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

export function page_title_from_markdown(markdown: string, fallback: string): string {
	const heading = markdown.match(/^#\s+(.+)$/mu)?.[1]?.trim();
	return heading && heading.length > 0 ? heading : fallback;
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
