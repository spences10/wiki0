import { schema_sql, type WikiFrontmatter } from '@wiki0/core';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function init_workspace(root: string): string {
	for (const dir of [
		'wiki/inbox',
		'wiki/decisions',
		'wiki/people',
		'wiki/projects',
		'wiki/topics',
		'.wiki0',
	]) {
		mkdirSync(join(root, dir), { recursive: true });
	}

	writeFileSync(
		join(root, 'wiki/index.md'),
		'# Wiki0\n\nStart here. Link pages with `[[topics/example]]`.\n',
		{ flag: 'wx' },
	);
	writeFileSync(join(root, '.wiki0/schema.sql'), schema_sql);
	return `Created wiki0 workspace at ${root}`;
}

export function read_markdown_input(options: {
	file?: string;
	body?: string;
}): string {
	return options.file
		? readFileSync(options.file, 'utf-8')
		: (options.body ?? '');
}

export function parse_frontmatter_json(
	data: string,
): WikiFrontmatter {
	return JSON.parse(data) as WikiFrontmatter;
}

export function print_json(value: unknown): void {
	console.log(JSON.stringify(value, null, 2));
}
