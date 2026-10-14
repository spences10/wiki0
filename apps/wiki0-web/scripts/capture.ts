// Captures the real wiki0 output the landing page shows: CLI and UI
// API JSON for this repo's docs, a small example corpus for lint, and
// screenshots of `wiki0 ui`. Run by hand after building the packages
// (`pnpm build`); the output is committed.
//
//   node apps/wiki0-web/scripts/capture.ts
//
// It works on a copy of the committed tree, so the paths in the
// output are repo-relative, and it fails if a local path survives.

import { execFileSync, spawn } from 'node:child_process';
import {
	mkdir,
	mkdtemp,
	readFile,
	readdir,
	rm,
	writeFile,
} from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const repo = fileURLToPath(new URL('../../../', import.meta.url));
const app = fileURLToPath(new URL('../', import.meta.url));
const data_dir = join(app, 'src/lib/data');
const shots_dir = join(app, 'static/shots');
const cli = join(repo, 'packages/cli/dist/index.js');
const ui = join(repo, 'packages/ui/dist/bin.js');

const query = 'index in the project folder';

const work = await mkdtemp(join(tmpdir(), 'wiki0-capture-'));
// Named so the UI sidebar shows the project as "wiki0"
const project = join(work, 'wiki0');
const example = join(work, 'example');
const env = {
	...process.env,
	WIKI0_INDEX: join(work, 'index.db'),
	XDG_STATE_HOME: join(work, 'state'),
};
const local_paths = [work, repo.replace(/\/$/u, ''), homedir()];

function run(args: string[], root: string, index = env.WIKI0_INDEX) {
	try {
		return execFileSync('node', [cli, ...args, '--root', root], {
			env: { ...env, WIKI0_INDEX: index },
			encoding: 'utf8',
		});
	} catch (error) {
		// lint exits 1 when it finds errors; its report is still stdout
		const { stdout } = error as { stdout?: string };
		if (args[0] === 'lint' && stdout) return stdout;
		throw error;
	}
}

function json(args: string[], root: string, index?: string) {
	return JSON.parse(run(args, root, index)) as Record<
		string,
		unknown
	>;
}

// Drops fields that only describe this machine, and fails on any
// local path left in the output.
function clean<T>(value: T, name: string): T {
	const text = JSON.stringify(value, (key, field: unknown) =>
		['root', 'db_path', 'indexed_at', 'location'].includes(key)
			? undefined
			: field,
	);
	for (const path of local_paths) {
		if (text.includes(path)) {
			throw new Error(`${name} contains a local path: ${path}`);
		}
	}
	return JSON.parse(text) as T;
}

async function save(name: string, value: unknown) {
	const output = clean(value, name);
	await writeFile(
		join(data_dir, `${name}.json`),
		`${JSON.stringify(output, null, '\t')}\n`,
	);
}

// A two-file corpus with a broken anchor and a missing page, since
// this repo's own docs lint clean.
async function write_example() {
	await mkdir(example, { recursive: true });
	await writeFile(join(example, 'wiki0.toml'), '');
	await writeFile(
		join(example, 'deploys.md'),
		'# Deploys\n\n## Rolling back\n\nRedeploy the previous tag.\n',
	);
	await writeFile(
		join(example, 'runbook.md'),
		[
			'# Runbook',
			'',
			'If a release breaks, follow [roll back](deploys.md#roll-back).',
			'',
			'Access is set up in [[onboarding]].',
			'',
		].join('\n'),
	);
}

async function start_ui(): Promise<{
	url: string;
	stop: () => void;
}> {
	const child = spawn(
		'node',
		[ui, '--root', project, '--no-open', '--foreground'],
		{ env, stdio: ['ignore', 'pipe', 'inherit'] },
	);
	const url = await new Promise<string>((resolve, reject) => {
		let buffer = '';
		child.stdout.on('data', (chunk: Buffer) => {
			buffer += chunk.toString();
			const line = buffer.split('\n')[0];
			if (buffer.includes('\n') && line) resolve(line.trim());
		});
		child.on('exit', (code) =>
			reject(new Error(`wiki0 ui exited with ${code}`)),
		);
	});
	return { url, stop: () => child.kill() };
}

// The server hands its token over in the URL fragment
const token_of = (base: URL) =>
	new URLSearchParams(base.hash.slice(1)).get('token') ?? '';

async function api(base: URL, path: string) {
	const response = await fetch(new URL(path, base.origin), {
		headers: { authorization: `Bearer ${token_of(base)}` },
	});
	if (!response.ok) throw new Error(`${path}: ${response.status}`);
	return (await response.json()) as unknown;
}

const shots = [
	{
		name: 'docs-superseded',
		path: '/docs/wiki/decisions/0002-index-in-project-folder.md',
	},
	{ name: 'search', path: `/search?q=${encodeURIComponent(query)}` },
	{ name: 'graph', path: '/health/graph' },
];

async function screenshots(base: URL) {
	await mkdir(shots_dir, { recursive: true });
	const browser = await chromium.launch();
	try {
		for (const scheme of ['light', 'dark'] as const) {
			const page = await browser.newPage({
				viewport: { width: 1440, height: 900 },
				deviceScaleFactor: 2,
				colorScheme: scheme,
				reducedMotion: 'reduce',
			});
			for (const shot of shots) {
				await page.goto(
					`${base.origin}${shot.path}#token=${token_of(base)}`,
				);
				await page.waitForLoadState('networkidle');
				const png = join(work, `${shot.name}-${scheme}.png`);
				await page.screenshot({ path: png });
				execFileSync('magick', [
					png,
					'-resize',
					'1440x',
					'-quality',
					'82',
					join(shots_dir, `${shot.name}-${scheme}.webp`),
				]);
			}
			await page.close();
		}
	} finally {
		await browser.close();
	}
}

try {
	await mkdir(project, { recursive: true });
	execFileSync(
		'sh',
		['-c', `git -C "${repo}" archive HEAD | tar -x -C "${project}"`],
		{ stdio: 'inherit' },
	);
	await mkdir(data_dir, { recursive: true });

	const index = json(['index'], project);
	await save('index', index);
	const search = json(['search', query, '--limit', '8'], project);
	await save('search', search);
	const top = (search.results as { citation: string }[])[0];
	if (!top) throw new Error(`no results for "${query}"`);
	await save('show', json(['show', top.citation, '--json'], project));

	await write_example();
	const example_index = join(work, 'example.db');
	run(['index'], example, example_index);
	await save('lint-example', {
		files: Object.fromEntries(
			await Promise.all(
				(await readdir(example))
					.filter((file) => file.endsWith('.md'))
					.map(async (file) => [
						file,
						await readFile(join(example, file), 'utf8'),
					]),
			),
		),
		lint: json(['lint'], example, example_index),
	});

	const server = await start_ui();
	try {
		const base = new URL(server.url);
		await save('chunks', await api(base, '/api/chunks'));
		await save('graph', await api(base, '/api/graph'));
		await screenshots(base);
	} finally {
		server.stop();
	}
	console.log(`Wrote ${data_dir} and ${shots_dir}`);
} finally {
	await rm(work, { recursive: true, force: true });
}
