import {
	existsSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
	init_workspace,
	parse_frontmatter_json,
	read_markdown_input,
} from './actions.js';

const temp_roots: string[] = [];

function make_temp_root(): string {
	const root = mkdtempSync(join(tmpdir(), 'wiki0-cli-'));
	temp_roots.push(root);
	return root;
}

afterEach(() => {
	for (const root of temp_roots.splice(0)) {
		rmSync(root, { recursive: true, force: true });
	}
});

describe('init_workspace', () => {
	it('creates the wiki folders, starter page, and schema snapshot', () => {
		const root = make_temp_root();

		expect(init_workspace(root)).toBe(
			`Created wiki0 workspace at ${root}`,
		);
		expect(existsSync(join(root, 'wiki/inbox'))).toBe(true);
		expect(existsSync(join(root, 'wiki/decisions'))).toBe(true);
		expect(
			readFileSync(join(root, 'wiki/index.md'), 'utf-8'),
		).toContain('[[topics/example]]');
		expect(
			readFileSync(join(root, '.wiki0/schema.sql'), 'utf-8'),
		).toContain('CREATE TABLE IF NOT EXISTS pages');
		expect(readFileSync(join(root, '.gitignore'), 'utf-8')).toContain(
			'.wiki0/',
		);
	});

	it('can use docs as the content folder', () => {
		const root = make_temp_root();

		init_workspace(root, 'docs');

		expect(existsSync(join(root, 'docs/inbox'))).toBe(true);
		expect(existsSync(join(root, 'docs/index.md'))).toBe(true);
		expect(existsSync(join(root, 'wiki'))).toBe(false);
	});
});

describe('read_markdown_input', () => {
	it('prefers file contents over inline body', () => {
		const root = make_temp_root();
		const file_path = join(root, 'body.md');
		writeFileSync(file_path, '# From file\n');

		expect(
			read_markdown_input({ file: file_path, body: '# Inline' }),
		).toBe('# From file\n');
	});

	it('falls back to inline body or an empty string', () => {
		expect(read_markdown_input({ body: 'Body' })).toBe('Body');
		expect(read_markdown_input({})).toBe('');
	});
});

describe('parse_frontmatter_json', () => {
	it('parses frontmatter JSON values', () => {
		expect(
			parse_frontmatter_json(
				'{"title":"API","tags":["review"],"draft":false}',
			),
		).toEqual({ title: 'API', tags: ['review'], draft: false });
	});
});
