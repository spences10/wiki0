import { index_wiki } from '@wiki0/core';
import {
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach } from 'vite-plus/test';

const temp_dirs: string[] = [];

export function make_temp_dir(prefix = 'wiki0-ui-'): string {
	const dir = mkdtempSync(join(tmpdir(), prefix));
	temp_dirs.push(dir);
	return dir;
}

export function write_file(
	root: string,
	path: string,
	body: string | Buffer,
): void {
	mkdirSync(dirname(join(root, path)), { recursive: true });
	writeFileSync(join(root, path), body);
}

// A small project: a linked pair, a superseded doc, an embedded
// image, a broken link and an orphan. wiki0.toml marks the root.
export function make_project(): string {
	const root = make_temp_dir('wiki0-ui-project-');
	write_file(root, 'wiki0.toml', '');
	write_file(
		root,
		'docs/guide.md',
		[
			'# Guide',
			'',
			'Read [setup](setup.md#install) first, then [[old-setup]].',
			'',
			'![diagram](diagram.png)',
			'',
			'See [the missing page](missing.md).',
			'',
		].join('\n'),
	);
	write_file(
		root,
		'docs/setup.md',
		'# Setup\n\n## Install\n\nRun the installer.\n',
	);
	write_file(
		root,
		'docs/old-setup.md',
		'---\nsuperseded_by: docs/setup.md\n---\n\n# Old setup\n\nThe old way to install.\n',
	);
	write_file(
		root,
		'docs/orphan.md',
		'# Orphan\n\nNobody links here.\n',
	);
	write_file(
		root,
		'docs/diagram.png',
		Buffer.from([0x89, 0x50, 0x4e, 0x47]),
	);
	write_file(
		root,
		'secret.png',
		Buffer.from([0x89, 0x50, 0x4e, 0x47]),
	);
	return root;
}

export async function make_indexed_project(): Promise<string> {
	const root = make_project();
	await index_wiki(root);
	return root;
}

afterEach(() => {
	for (const dir of temp_dirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true });
	}
});
