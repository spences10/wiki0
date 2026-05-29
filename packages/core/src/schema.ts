import { readFileSync } from 'node:fs';

export const schema_sql = readFileSync(
	new URL('./schema.sql', import.meta.url),
	'utf-8',
);
