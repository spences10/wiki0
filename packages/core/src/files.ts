import { execFileSync } from 'node:child_process';
import { existsSync, globSync, statSync } from 'node:fs';
import { join, matchesGlob } from 'node:path';
import type { Wiki0Config } from './config.js';

const always_skipped = ['.git', 'node_modules', '.wiki0'];

// Project-relative paths (forward slashes) of files to index, sorted.
export function list_project_files(
	root: string,
	config: Pick<Wiki0Config, 'include' | 'exclude'>,
): string[] {
	const candidates = git_files(root) ?? walked_files(root);
	return candidates
		.filter((path) => !is_always_skipped(path))
		.filter((path) =>
			config.include.some((glob) => matchesGlob(path, glob)),
		)
		.filter(
			(path) =>
				!config.exclude.some((glob) => matchesGlob(path, glob)),
		)
		.filter((path) => is_file(join(root, path)))
		.sort();
}

// Uses git so .gitignore rules match git exactly. Returns null when
// the root is not inside a git work tree or git is unavailable.
function git_files(root: string): string[] | null {
	if (!existsSync(join(root, '.git'))) return null;
	try {
		const output = execFileSync(
			'git',
			[
				'ls-files',
				'-z',
				'--cached',
				'--others',
				'--exclude-standard',
			],
			{ cwd: root, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 },
		);
		return [...new Set(output.split('\0').filter(Boolean))];
	} catch {
		return null;
	}
}

function walked_files(root: string): string[] {
	return globSync('**/*', {
		cwd: root,
		exclude: (path) =>
			always_skipped.some(
				(name) => path === name || path.endsWith(`/${name}`),
			),
	}).map((path) => path.replaceAll('\\', '/'));
}

function is_always_skipped(path: string): boolean {
	return path
		.split('/')
		.some((segment) => always_skipped.includes(segment));
}

function is_file(path: string): boolean {
	try {
		return statSync(path).isFile();
	} catch {
		return false;
	}
}
