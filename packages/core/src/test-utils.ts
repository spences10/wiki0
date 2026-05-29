import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach } from 'vitest';

const temp_roots: string[] = [];

export function make_wiki_root(): string {
	const root = mkdtempSync(join(tmpdir(), 'wiki0-core-'));
	mkdirSync(join(root, 'wiki'), { recursive: true });
	mkdirSync(join(root, '.wiki0'), { recursive: true });
	temp_roots.push(root);
	return root;
}

afterEach(() => {
	for (const root of temp_roots.splice(0)) {
		rmSync(root, { recursive: true, force: true });
	}
});
