import {
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach } from 'vite-plus/test';

const temp_roots: string[] = [];

export function make_wiki_root(): string {
	const root = mkdtempSync(join(tmpdir(), 'wiki0-core-'));
	temp_roots.push(root);
	return root;
}

export function write_doc(
	root: string,
	path: string,
	body: string,
): void {
	mkdirSync(dirname(join(root, path)), { recursive: true });
	writeFileSync(join(root, path), body);
}

afterEach(() => {
	for (const root of temp_roots.splice(0)) {
		rmSync(root, { recursive: true, force: true });
	}
});
