import type { SQLOutputValue } from 'node:sqlite';
import { open_wiki_database, type WikiDatabase } from './database.js';
import { log_wiki_event } from './events.js';
import { resolve_page_path } from './pages.js';
import { resolve_wiki_root } from './paths.js';
import { show_wiki_chunk } from './search.js';
import type {
	Fact,
	FactWriteOptions,
	ShowChunkResult,
} from './types.js';

export type DerivedFactCandidate = Omit<
	FactWriteOptions,
	'root' | 'page' | 'source'
> & {
	line: number;
};

export function add_fact(fact: FactWriteOptions): Fact {
	const wiki_root = resolve_wiki_root(fact.root);
	const db = open_wiki_database(wiki_root);
	ensure_fact_provenance_columns(db);
	const source_chunk = fact.source
		? show_wiki_chunk(fact.source, wiki_root)
		: null;
	const page_path = fact.page
		? resolve_page_path(fact.page, wiki_root)
		: (source_chunk?.path ?? null);
	const page = page_path
		? (db
				.prepare('SELECT id FROM pages WHERE path = ?')
				.get(page_path) as { id: number } | undefined)
		: undefined;

	const result = db
		.prepare(
			`INSERT INTO facts (
				page_id, category, summary, body, confidence,
				source_path, source_heading, source_start_line, source_end_line, source_quote
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.run(
			page?.id ?? null,
			fact.category,
			fact.summary,
			fact.body ?? null,
			fact.confidence ?? 'unknown',
			source_chunk?.path ?? null,
			source_chunk?.heading ?? null,
			source_chunk?.start_line ?? null,
			source_chunk?.end_line ?? null,
			fact.source_quote ?? source_quote(source_chunk),
		);
	const inserted = select_fact_by_id(
		db,
		Number(result.lastInsertRowid),
	);
	db.close();
	log_wiki_event({
		root: wiki_root,
		operation: 'add_fact',
		summary: fact.summary,
		target: page_path ?? source_chunk?.path ?? undefined,
		details: {
			category: fact.category,
			confidence: inserted.confidence,
		},
	});
	return inserted;
}

export function list_facts(root = '.', category?: string): Fact[] {
	const db = open_wiki_database(root);
	ensure_fact_provenance_columns(db);
	const sql = `${fact_select_sql}
		${category ? 'WHERE facts.category = ?' : ''}
		ORDER BY facts.created_at DESC, facts.id DESC`;
	const rows = category
		? db.prepare(sql).all(category)
		: db.prepare(sql).all();
	db.close();
	return rows.map(fact_from_row);
}

export function derive_facts_from_markdown(
	markdown: string,
): DerivedFactCandidate[] {
	return markdown
		.split(/\n/u)
		.map((line, index) => ({
			line: line.trim(),
			line_number: index + 1,
		}))
		.filter(({ line }) =>
			/\b(should|must|required|requirement|decision|constraint|risk|assumption|fact)\b/iu.test(
				line,
			),
		)
		.slice(0, 20)
		.map(({ line, line_number }) => ({
			category: fact_category(line),
			summary: line.replace(/^[-*]\s*/u, '').slice(0, 240),
			body: `Derived from extracted source text line ${line_number}.`,
			confidence: 'low',
			source_quote: line,
			line: line_number,
		}));
}

function fact_category(line: string): string {
	if (/\b(decision)\b/iu.test(line)) return 'decision';
	if (/\b(risk)\b/iu.test(line)) return 'risk';
	if (/\b(assumption)\b/iu.test(line)) return 'assumption';
	if (
		/\b(constraint|must|required|requirement|should)\b/iu.test(line)
	) {
		return 'constraint';
	}
	return 'note';
}

const fact_select_sql = `SELECT facts.id, pages.path AS page_path, facts.category,
	facts.summary, facts.body, facts.confidence,
	facts.source_path, facts.source_heading, facts.source_start_line,
	facts.source_end_line, facts.source_quote, facts.created_at AS created_at
	FROM facts
	LEFT JOIN pages ON pages.id = facts.page_id`;

function select_fact_by_id(db: WikiDatabase, id: number): Fact {
	const row = db
		.prepare(`${fact_select_sql} WHERE facts.id = ?`)
		.get(id) as Record<string, SQLOutputValue>;
	return fact_from_row(row);
}

function fact_from_row(row: Record<string, SQLOutputValue>): Fact {
	return {
		id: Number(row.id),
		page_path: row.page_path === null ? null : String(row.page_path),
		category: String(row.category),
		summary: String(row.summary),
		body: row.body === null ? null : String(row.body),
		confidence: String(row.confidence) as Fact['confidence'],
		source_path:
			row.source_path === null ? null : String(row.source_path),
		source_heading:
			row.source_heading === null ? null : String(row.source_heading),
		source_start_line:
			row.source_start_line === null
				? null
				: Number(row.source_start_line),
		source_end_line:
			row.source_end_line === null
				? null
				: Number(row.source_end_line),
		source_quote:
			row.source_quote === null ? null : String(row.source_quote),
		created_at: String(row.created_at),
	};
}

function source_quote(
	source_chunk: ShowChunkResult | null,
): string | null {
	if (!source_chunk) return null;
	return source_chunk.body.slice(0, 1000);
}

function ensure_fact_provenance_columns(db: WikiDatabase): void {
	const columns = new Set(
		(
			db.prepare('PRAGMA table_info(facts)').all() as {
				name: string;
			}[]
		).map((column) => column.name),
	);
	const migrations: Record<string, string> = {
		source_path: 'ALTER TABLE facts ADD COLUMN source_path TEXT',
		source_heading:
			'ALTER TABLE facts ADD COLUMN source_heading TEXT',
		source_start_line:
			'ALTER TABLE facts ADD COLUMN source_start_line INTEGER',
		source_end_line:
			'ALTER TABLE facts ADD COLUMN source_end_line INTEGER',
		source_quote: 'ALTER TABLE facts ADD COLUMN source_quote TEXT',
	};
	for (const [column_name, sql] of Object.entries(migrations)) {
		if (!columns.has(column_name)) db.exec(sql);
	}
}
