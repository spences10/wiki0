import { readFileSync } from 'node:fs';

export const schema_sql = readFileSync(
	new URL('./schema.sql', import.meta.url),
	'utf-8',
);

// Bump when schema.sql changes; older indexes are rebuilt.
export const index_schema_version = 10;
