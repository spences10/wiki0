import { describe, expect, it } from 'vitest';
import { schema_sql } from './schema.js';

describe('schema_sql', () => {
	it('loads the colocated SQL schema file', () => {
		expect(schema_sql).toContain('CREATE TABLE IF NOT EXISTS pages');
		expect(schema_sql).toContain(
			'CREATE VIRTUAL TABLE IF NOT EXISTS fts_pages',
		);
	});
});
