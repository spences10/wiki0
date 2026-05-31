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

CREATE TABLE IF NOT EXISTS page_chunks (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
	path TEXT NOT NULL,
	title TEXT NOT NULL,
	heading TEXT,
	body TEXT NOT NULL,
	start_line INTEGER NOT NULL,
	end_line INTEGER NOT NULL,
	sequence INTEGER NOT NULL,
	page_priority INTEGER NOT NULL DEFAULT 0,
	page_status TEXT,
	page_tags TEXT,
	created_at TEXT DEFAULT (datetime('now')),
	UNIQUE(page_id, sequence)
);

CREATE TABLE IF NOT EXISTS facts (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	page_id INTEGER REFERENCES pages(id) ON DELETE SET NULL,
	category TEXT NOT NULL,
	summary TEXT NOT NULL,
	body TEXT,
	confidence TEXT NOT NULL DEFAULT 'unknown',
	source_path TEXT,
	source_heading TEXT,
	source_start_line INTEGER,
	source_end_line INTEGER,
	source_quote TEXT,
	created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wiki_meta (
	key TEXT PRIMARY KEY,
	value TEXT NOT NULL,
	updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wiki_events (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	operation TEXT NOT NULL,
	summary TEXT NOT NULL,
	target TEXT,
	details TEXT,
	created_at TEXT DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE IF NOT EXISTS fts_pages USING fts5(path, title, body);
CREATE VIRTUAL TABLE IF NOT EXISTS fts_page_chunks USING fts5(chunk_id UNINDEXED, path, title, heading, body);
