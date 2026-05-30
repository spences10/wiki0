import { open_wiki_database } from './database.js';
import { resolve_page_path } from './pages.js';
import { resolve_wiki_root } from './paths.js';
import type { Fact, FactWriteOptions } from './types.js';

export function add_fact(fact: FactWriteOptions): Fact {
	const wiki_root = resolve_wiki_root(fact.root);
	const db = open_wiki_database(wiki_root);
	const page_path = fact.page
		? resolve_page_path(fact.page, wiki_root)
		: null;
	const page = page_path
		? (db
				.prepare('SELECT id FROM pages WHERE path = ?')
				.get(page_path) as { id: number } | undefined)
		: undefined;

	const result = db
		.prepare(
			`INSERT INTO facts (page_id, category, summary, body, confidence)
			VALUES (?, ?, ?, ?, ?)`,
		)
		.run(
			page?.id ?? null,
			fact.category,
			fact.summary,
			fact.body ?? null,
			fact.confidence ?? 'unknown',
		);
	const inserted = db
		.prepare(
			`SELECT facts.id, pages.path AS pagePath, facts.category,
				facts.summary, facts.body, facts.confidence, facts.created_at AS createdAt
			FROM facts
			LEFT JOIN pages ON pages.id = facts.page_id
			WHERE facts.id = ?`,
		)
		.get(result.lastInsertRowid) as Fact;
	db.close();
	return inserted;
}

export function list_facts(root = '.', category?: string): Fact[] {
	const db = open_wiki_database(root);
	const sql = `SELECT facts.id, pages.path AS pagePath, facts.category,
		facts.summary, facts.body, facts.confidence, facts.created_at AS createdAt
		FROM facts
		LEFT JOIN pages ON pages.id = facts.page_id
		${category ? 'WHERE facts.category = ?' : ''}
		ORDER BY facts.created_at DESC, facts.id DESC`;
	const rows = category
		? db.prepare(sql).all(category)
		: db.prepare(sql).all();
	db.close();
	return rows as Fact[];
}
