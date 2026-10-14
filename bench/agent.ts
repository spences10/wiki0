// Agent benchmark: asks Claude Code each task question with grep-only
// tools and with the wiki0 MCP server, then compares tokens, answer
// correctness and cited sources. Uses your Claude usage.
//
//   node bench/agent.ts --reps 3 --model claude-sonnet-5-5 [--tasks a,b]
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import {
	bench_dir,
	fresh_corpus,
	load_tasks,
	median,
	type Task,
} from './shared.ts';

const { values } = parseArgs({
	options: {
		reps: { type: 'string', default: '3' },
		model: { type: 'string', default: 'claude-sonnet-5-5' },
		tasks: { type: 'string' },
		arms: { type: 'string', default: 'grep,wiki0' },
	},
});
const reps = Number(values.reps);
const arms = (values.arms ?? '').split(',') as Arm[];
const wanted = values.tasks?.split(',');
const tasks = load_tasks().filter(
	(task) => !wanted || wanted.includes(task.id),
);
const mcp_entry = join(
	bench_dir,
	'..',
	'packages',
	'mcp',
	'dist',
	'index.js',
);
const { index_wiki } = await import('../packages/core/dist/index.js');

type Arm = 'grep' | 'wiki0';

type Run = {
	task: string;
	kind: string;
	arm: Arm;
	rep: number;
	correct: boolean;
	cited_authoritative: boolean;
	cited_stale: boolean;
	tokens: number;
	cache_read: number;
	cost_usd: number;
	turns: number;
	duration_ms: number;
	answer: string;
};

function prompt(task: Task): string {
	return [
		'Answer this question about the project in the current directory, using only its docs.',
		'',
		`Question: ${task.question}`,
		'',
		'Answer in one or two sentences. End with a line `SOURCES: ` followed by the repo-relative paths you relied on, comma-separated.',
		'If the docs do not answer the question, reply exactly `NOT FOUND`.',
	].join('\n');
}

async function run_once(
	task: Task,
	arm: Arm,
	rep: number,
): Promise<Run> {
	const root = fresh_corpus();
	const args = [
		'-p',
		prompt(task),
		'--output-format',
		'json',
		'--model',
		values.model ?? '',
		'--no-session-persistence',
		'--strict-mcp-config',
		'--setting-sources',
		'project',
	];
	const env = { ...process.env };
	if (arm === 'grep') {
		args.push(
			'--tools',
			'Read,Grep,Glob',
			'--allowedTools',
			'Read Grep Glob',
		);
	} else {
		const cache = mkdtempSync(join(tmpdir(), 'wiki0-bench-cache-'));
		env.WIKI0_CACHE_DIR = cache;
		// index_wiki reads the cache location from this process's env.
		process.env.WIKI0_CACHE_DIR = cache;
		await index_wiki(root);
		const config = join(cache, 'mcp.json');
		writeFileSync(
			config,
			JSON.stringify({
				mcpServers: {
					wiki0: {
						command: 'node',
						args: [mcp_entry],
						env: {
							WIKI0_CACHE_DIR: cache,
							WIKI0_ALLOWED_ROOTS: root,
						},
					},
				},
			}),
		);
		args.push(
			'--tools',
			'Read',
			'--mcp-config',
			config,
			'--allowedTools',
			'Read mcp__wiki0__search_docs mcp__wiki0__show_section mcp__wiki0__get_context',
		);
	}
	const child = spawnSync('claude', args, {
		cwd: root,
		env,
		encoding: 'utf-8',
		maxBuffer: 64 * 1024 * 1024,
	});
	const output = JSON.parse(child.stdout || '{}') as {
		result?: string;
		total_cost_usd?: number;
		num_turns?: number;
		duration_ms?: number;
		usage?: Record<string, number>;
	};
	const answer = output.result ?? child.stderr ?? '';
	const usage = output.usage ?? {};
	const sources = (answer.match(/SOURCES:\s*(.*)$/imu)?.[1] ?? '')
		.split(',')
		.map((path) =>
			path.trim().replace(/^\.\//u, '').replace(/`/gu, ''),
		);
	const correct =
		task.kind === 'unanswerable'
			? /NOT FOUND/u.test(answer)
			: task.expected.every((pattern) =>
					new RegExp(pattern, 'iu').test(answer),
				);
	return {
		task: task.id,
		kind: task.kind,
		arm,
		rep,
		correct,
		cited_authoritative:
			task.authoritative.length === 0 ||
			task.authoritative.some((path) => sources.includes(path)),
		cited_stale: task.stale.some((path) => sources.includes(path)),
		// Cache reads are reported separately so caching does not hide
		// what the agent actually consumed.
		tokens:
			(usage.input_tokens ?? 0) +
			(usage.cache_creation_input_tokens ?? 0) +
			(usage.output_tokens ?? 0),
		cache_read: usage.cache_read_input_tokens ?? 0,
		cost_usd: output.total_cost_usd ?? 0,
		turns: output.num_turns ?? 0,
		duration_ms: output.duration_ms ?? 0,
		answer,
	};
}

const runs: Run[] = [];
for (let rep = 1; rep <= reps; rep += 1) {
	for (const task of tasks) {
		for (const arm of arms) {
			const result = await run_once(task, arm, rep);
			runs.push(result);
			console.log(
				`${arm.padEnd(5)} ${task.id.padEnd(14)} rep ${rep} ${result.correct ? 'correct' : 'WRONG  '} tokens=${result.tokens} turns=${result.turns}`,
			);
		}
	}
}

const results_dir = join(bench_dir, 'results');
mkdirSync(results_dir, { recursive: true });
const file = join(
	results_dir,
	`agent-${new Date().toISOString().replace(/[:.]/gu, '-')}.json`,
);
writeFileSync(
	file,
	JSON.stringify({ model: values.model, reps, runs }, null, 2),
);

console.log('');
console.log(
	'arm    correct  cited-source  cited-stale  tokens(med)  cache-read(med)  cost(med)  turns(med)',
);
for (const arm of arms) {
	const mine = runs.filter((run) => run.arm === arm);
	const rate = (pick: (run: Run) => boolean) =>
		`${Math.round((mine.filter(pick).length / mine.length) * 100)}%`;
	console.log(
		[
			arm.padEnd(6),
			rate((run) => run.correct).padEnd(8),
			rate((run) => run.cited_authoritative).padEnd(13),
			rate((run) => run.cited_stale).padEnd(12),
			String(median(mine.map((run) => run.tokens))).padEnd(12),
			String(median(mine.map((run) => run.cache_read))).padEnd(16),
			`$${median(mine.map((run) => run.cost_usd)).toFixed(4)}`.padEnd(
				10,
			),
			String(median(mine.map((run) => run.turns))),
		].join(' '),
	);
}
console.log(`\nRaw runs: ${file}`);
