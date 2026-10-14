import { execFileSync } from 'node:child_process';
import {
	cpSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

export type Task = {
	id: string;
	kind: string;
	question: string;
	expected: string[];
	authoritative: string[];
	stale: string[];
};

export const bench_dir = new URL('.', import.meta.url).pathname;

// `--corpus <dir>` and `--tasks <file>` point the benchmarks at another
// project; both default to the bundled synthetic corpus.
export const corpus_options = {
	corpus: { type: 'string' },
	tasks: { type: 'string' },
} as const;

export type CorpusArgs = { corpus?: string; tasks?: string };

export function load_tasks(args: CorpusArgs = {}): Task[] {
	const file = args.tasks
		? resolve(args.tasks)
		: join(bench_dir, 'tasks.json');
	return JSON.parse(readFileSync(file, 'utf-8')) as Task[];
}

// A fresh git repo holding the corpus, so each run starts clean and
// wiki0 finds the project root. An external corpus contributes only
// its git-tracked Markdown.
export function fresh_corpus(args: CorpusArgs = {}): string {
	const root = mkdtempSync(join(tmpdir(), 'wiki0-bench-'));
	if (args.corpus) {
		const source = resolve(args.corpus);
		const files = execFileSync('git', ['ls-files', '-z', '*.md'], {
			cwd: source,
			encoding: 'utf-8',
		})
			.split('\0')
			.filter(Boolean);
		for (const file of files) {
			mkdirSync(dirname(join(root, file)), { recursive: true });
			cpSync(join(source, file), join(root, file));
		}
	} else {
		cpSync(join(bench_dir, 'corpus'), root, { recursive: true });
	}
	execFileSync('git', ['init', '-q'], { cwd: root });
	execFileSync('git', ['add', '-A'], { cwd: root });
	return root;
}

export function parse_corpus_args(): CorpusArgs {
	const { values } = parseArgs({
		options: corpus_options,
		strict: false,
	});
	return {
		corpus:
			typeof values.corpus === 'string' ? values.corpus : undefined,
		tasks:
			typeof values.tasks === 'string' ? values.tasks : undefined,
	};
}

export function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2
		? (sorted[middle] ?? 0)
		: ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}
