import { schema_sql, type WikiFrontmatter } from '@wiki0/core';
import {
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

export function init_workspace(
	root: string,
	wiki_dir = 'wiki',
): string {
	for (const dir of [
		`${wiki_dir}/inbox`,
		`${wiki_dir}/decisions`,
		`${wiki_dir}/people`,
		`${wiki_dir}/projects`,
		`${wiki_dir}/topics`,
		'.wiki0',
	]) {
		mkdirSync(join(root, dir), { recursive: true });
	}

	writeFileSync(
		join(root, wiki_dir, 'index.md'),
		'# Wiki0\n\nStart here. Link pages with `[[topics/example]]`.\n',
		{ flag: 'wx' },
	);
	writeFileSync(join(root, '.wiki0/schema.sql'), schema_sql);
	ensure_gitignore_ignores_index(root);
	return `Created wiki0 workspace at ${root}`;
}

function ensure_gitignore_ignores_index(root: string): void {
	const path = join(root, '.gitignore');
	const entry = '.wiki0/';
	if (!existsSync(path)) {
		writeFileSync(path, `${entry}\n`, { flag: 'wx' });
		return;
	}
	const body = readFileSync(path, 'utf-8');
	if (body.split(/\r?\n/u).includes(entry)) return;
	writeFileSync(
		path,
		`${body}${body.endsWith('\n') ? '' : '\n'}${entry}\n`,
	);
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
