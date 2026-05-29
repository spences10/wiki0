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
