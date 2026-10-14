// Deterministic retrieval benchmark: runs each task question through
// wiki0 search and checks where the authoritative document ranks.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	fresh_corpus,
	load_tasks,
	parse_corpus_args,
} from './shared.ts';

process.env.WIKI0_CACHE_DIR = mkdtempSync(
	join(tmpdir(), 'wiki0-bench-cache-'),
);
const { index_wiki, search } =
	await import('../packages/core/dist/index.js');

const corpus_args = parse_corpus_args();
const root = fresh_corpus(corpus_args);
await index_wiki(root);

let reciprocal_sum = 0;
let hits_at_1 = 0;
let stale_above = 0;
let stale_tasks = 0;
const rows: string[] = [];

const tasks = load_tasks(corpus_args).filter(
	(task) => task.authoritative.length,
);
for (const task of tasks) {
	const paths = search(task.question, root, { limit: 5 }).results.map(
		(hit) => hit.path,
	);
	const rank =
		paths.findIndex((path) => task.authoritative.includes(path)) + 1;
	if (rank === 1) hits_at_1 += 1;
	if (rank > 0) reciprocal_sum += 1 / rank;
	const first_stale =
		paths.findIndex((path) => task.stale.includes(path)) + 1;
	const stale_wins =
		first_stale > 0 && (rank === 0 || first_stale < rank);
	if (task.stale.length > 0) stale_tasks += 1;
	if (stale_wins) stale_above += 1;
	rows.push(
		`${rank === 1 ? 'ok  ' : 'MISS'} ${task.id.padEnd(14)} rank=${rank || '-'}${stale_wins ? ' STALE-FIRST' : ''}  top=${paths[0] ?? '-'}`,
	);
}

console.log(rows.join('\n'));
console.log('');
console.log(`tasks:            ${tasks.length}`);
console.log(
	`hit@1:            ${(hits_at_1 / tasks.length).toFixed(2)}`,
);
console.log(
	`MRR@5:            ${(reciprocal_sum / tasks.length).toFixed(2)}`,
);
console.log(`stale ranked first: ${stale_above}/${stale_tasks}`);
if (process.argv.includes('--check') && hits_at_1 < tasks.length) {
	process.exitCode = 1;
}
