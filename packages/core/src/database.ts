import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { resolve_wiki_root } from './paths.js';
import { schema_sql } from './schema.js';

export function wiki_db_path(root = '.'): string {
	return join(resolve_wiki_root(root), '.wiki0', 'wiki0.sqlite');
}

export function open_wiki_database(root = '.'): Database.Database {
	const wiki_root = resolve_wiki_root(root);
	const db_path = wiki_db_path(wiki_root);
	mkdirSync(dirname(db_path), { recursive: true });
	const db = new Database(db_path);
	db.exec(schema_sql);
	return db;
}
