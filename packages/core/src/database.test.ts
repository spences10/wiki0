import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { open_wiki_database, wiki_db_path } from './database.js';
import { make_wiki_root } from './test-utils.js';

describe('wiki database', () => {
	it('resolves and initializes the SQLite database under .wiki0', () => {
		const root = make_wiki_root();

		expect(wiki_db_path(root)).toBe(
			join(root, '.wiki0', 'wiki0.sqlite'),
		);

		const db = open_wiki_database(root);
		const page_table = db
			.prepare(
				"SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'pages'",
			)
			.get();
		db.close();

		expect(page_table).toEqual({ name: 'pages' });
		expect(existsSync(wiki_db_path(root))).toBe(true);
	});
});
