import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';
import { list_project_files } from './files.js';
import { make_wiki_root } from './test-utils.js';

function write(root: string, path: string, body = 'x'): void {
	mkdirSync(join(root, path, '..'), { recursive: true });
	writeFileSync(join(root, path), body);
}

describe('list_project_files', () => {
	it('lists Markdown anywhere in the project and skips node_modules', () => {
		const root = make_wiki_root();
		write(root, 'README.md');
		write(root, 'docs/adr/0001-choice.md');
		write(root, 'docs/notes.txt');
		write(root, 'node_modules/pkg/README.md');

		expect(
			list_project_files(root, { include: ['**/*.md'], exclude: [] }),
		).toEqual(['README.md', 'docs/adr/0001-choice.md']);
	});

	it('applies include and exclude globs', () => {
		const root = make_wiki_root();
		write(root, 'README.md');
		write(root, 'docs/current.md');
		write(root, 'docs/archive/old.md');
		write(root, 'docs/notes.txt');

		expect(
			list_project_files(root, {
				include: ['docs/**/*.md', 'docs/**/*.txt'],
				exclude: ['docs/archive/**'],
			}),
		).toEqual(['docs/current.md', 'docs/notes.txt']);
	});

	it('follows .gitignore inside a git repository', () => {
		const root = make_wiki_root();
		execFileSync('git', ['init', '-q'], { cwd: root });
		write(root, '.gitignore', 'drafts/\n');
		write(root, 'docs/kept.md');
		write(root, 'drafts/hidden.md');

		expect(
			list_project_files(root, { include: ['**/*.md'], exclude: [] }),
		).toEqual(['docs/kept.md']);
	});
});
