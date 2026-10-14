import { cpSync, mkdtempSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export type Task = {
	id: string;
	kind: string;
	question: string;
	expected: string[];
	authoritative: string[];
	stale: string[];
};

export const bench_dir = new URL('.', import.meta.url).pathname;

export function load_tasks(): Task[] {
	return JSON.parse(
		readFileSync(join(bench_dir, 'tasks.json'), 'utf-8'),
	) as Task[];
}

// A fresh git repo holding the corpus, so each run starts clean and
// wiki0 finds the project root.
export function fresh_corpus(): string {
	const root = mkdtempSync(join(tmpdir(), 'wiki0-bench-'));
	cpSync(join(bench_dir, 'corpus'), root, { recursive: true });
	execFileSync('git', ['init', '-q'], { cwd: root });
	execFileSync('git', ['add', '-A'], { cwd: root });
	return root;
}

export function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2
		? (sorted[middle] ?? 0)
		: ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}
