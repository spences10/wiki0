import type { SQLOutputValue } from 'node:sqlite';
import { open_wiki_database, type WikiDatabase } from './database.js';
import { resolve_wiki_root } from './paths.js';
import type { WikiEvent } from './types.js';

export function log_wiki_event(options: {
	root?: string;
	operation: string;
	summary: string;
	target?: string;
	details?: unknown;
}): WikiEvent {
	const wiki_root = resolve_wiki_root(options.root);
	const db = open_wiki_database(wiki_root);
	ensure_events_table(db);
	const result = db
		.prepare(
			`INSERT INTO wiki_events (operation, summary, target, details)
			VALUES (?, ?, ?, ?)`,
		)
		.run(
			options.operation,
			options.summary,
			options.target ?? null,
			options.details === undefined
				? null
				: JSON.stringify(options.details),
		);
	const event = select_event_by_id(
		db,
		Number(result.lastInsertRowid),
	);
	db.close();
	return event;
}

export function list_wiki_events(
	root = '.',
	limit = 50,
): WikiEvent[] {
	const db = open_wiki_database(root);
	ensure_events_table(db);
	const rows = db
		.prepare(
			`SELECT id, operation, summary, target, details, created_at
			FROM wiki_events
			ORDER BY id DESC
			LIMIT ?`,
		)
		.all(limit) as Record<string, SQLOutputValue>[];
	db.close();
	return rows.map(event_from_row);
}

function select_event_by_id(db: WikiDatabase, id: number): WikiEvent {
	const row = db
		.prepare(
			`SELECT id, operation, summary, target, details, created_at
			FROM wiki_events WHERE id = ?`,
		)
		.get(id) as Record<string, SQLOutputValue>;
	return event_from_row(row);
}

function event_from_row(
	row: Record<string, SQLOutputValue>,
): WikiEvent {
	return {
		id: Number(row.id),
		operation: String(row.operation),
		summary: String(row.summary),
		target: row.target === null ? null : String(row.target),
		details: row.details === null ? null : String(row.details),
		created_at: String(row.created_at),
	};
}

function ensure_events_table(db: WikiDatabase): void {
	db.exec(`CREATE TABLE IF NOT EXISTS wiki_events (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		operation TEXT NOT NULL,
		summary TEXT NOT NULL,
		target TEXT,
		details TEXT,
		created_at TEXT DEFAULT (datetime('now'))
	)`);
}
