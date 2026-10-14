PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS pages (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	path TEXT NOT NULL UNIQUE,
	title TEXT NOT NULL,
	body TEXT NOT NULL,
	content_hash TEXT NOT NULL,
	modified_at TEXT NOT NULL,
	line_count INTEGER NOT NULL DEFAULT 0,
	kind TEXT NOT NULL DEFAULT 'markdown',
	status TEXT,
	doc_type TEXT,
	doc_date TEXT,
	priority INTEGER NOT NULL DEFAULT 0,
	aliases TEXT NOT NULL DEFAULT '[]',
	tags TEXT NOT NULL DEFAULT '[]',
	supersedes TEXT NOT NULL DEFAULT '[]',
	superseded_by TEXT,
	created_at TEXT DEFAULT (datetime('now')),
	updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS links (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	from_page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
	from_path TEXT NOT NULL,
	line INTEGER NOT NULL,
	kind TEXT NOT NULL,
	raw_text TEXT NOT NULL,
	target TEXT NOT NULL,
	alias TEXT,
	to_path TEXT,
	to_anchor TEXT,
	status TEXT NOT NULL,
	quality TEXT,
	candidates TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS links_to_path ON links(to_path);

CREATE TABLE IF NOT EXISTS anchors (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
	path TEXT NOT NULL,
	kind TEXT NOT NULL,
	slug TEXT NOT NULL,
	text TEXT NOT NULL,
	depth INTEGER NOT NULL,
	line INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS page_chunks (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
	path TEXT NOT NULL,
	title TEXT NOT NULL,
	heading TEXT,
	depth INTEGER NOT NULL DEFAULT 0,
	breadcrumb TEXT NOT NULL DEFAULT '',
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

-- porter stems English words. Hyphens and underscores split tokens so
-- `remote-functions-testing` matches "remote functions"; a quoted
-- query still matches `x-api-key` as a phrase.
CREATE VIRTUAL TABLE IF NOT EXISTS fts_chunks USING fts5(
	chunk_id UNINDEXED,
	path,
	title,
	heading,
	breadcrumb,
	aliases,
	body,
	tokenize = "porter unicode61 remove_diacritics 2"
);

-- Column weights: path 2, title 4, heading 4, breadcrumb 2, aliases 5,
-- body 1. Stored so ORDER BY rank uses them.
INSERT INTO fts_chunks (fts_chunks, rank)
VALUES ('rank', 'bm25(0.0, 2.0, 4.0, 4.0, 2.0, 5.0, 1.0)');
