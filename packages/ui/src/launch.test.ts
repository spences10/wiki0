import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
} from 'vite-plus/test';
import {
	launch_ui,
	probe_ui_server,
	type LaunchResult,
} from './launch.js';
import {
	read_ui_state,
	ui_state_paths,
	write_ui_state,
} from './state.js';
import { make_project, make_temp_dir } from './test-utils.js';

// The detached child runs the built bin; `pnpm test` builds first.
const built_bin = fileURLToPath(
	new URL('../dist/bin.js', import.meta.url),
);

const results: LaunchResult[] = [];
let previous_state_dir: string | undefined;

beforeEach(() => {
	previous_state_dir = process.env.WIKI0_STATE_DIR;
	process.env.WIKI0_STATE_DIR = make_temp_dir('wiki0-ui-state-');
});

afterEach(async () => {
	for (const result of results.splice(0)) {
		if (result.status === 'foreground') await result.server.close();
	}
	if (previous_state_dir === undefined) {
		delete process.env.WIKI0_STATE_DIR;
	} else {
		process.env.WIKI0_STATE_DIR = previous_state_dir;
	}
});

function quiet(lines: string[] = []) {
	return {
		open: false,
		log: (line: string) => lines.push(line),
	};
}

async function launch(options: Parameters<typeof launch_ui>[0]) {
	const result = await launch_ui(options);
	results.push(result);
	return result;
}

describe('launch_ui', () => {
	it('prints the URL first and records the server', async () => {
		const root = make_project();
		const lines: string[] = [];
		const result = await launch({
			root,
			port: 0,
			detach: false,
			...quiet(lines),
		});
		expect(result.status).toBe('foreground');
		expect(lines[0]).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/#token=/u);
		const state = read_ui_state(ui_state_paths(root).state);
		expect(state?.pid).toBe(process.pid);
	});

	it('reuses a running server instead of starting another', async () => {
		const root = make_project();
		const first = await launch({
			root,
			port: 0,
			detach: false,
			...quiet(),
		});
		const opened: string[] = [];
		const lines: string[] = [];
		const second = await launch({
			root,
			port: 0,
			log: (line) => lines.push(line),
			open_url: (url) => opened.push(url),
		});
		expect(second.status).toBe('running');
		expect('url' in second && second.url).toBe(
			'url' in first && first.url,
		);
		expect(lines[0]).toContain('already running');
		expect(opened).toHaveLength(1);
	});

	it('replaces a stale state file', async () => {
		const root = make_project();
		const path = ui_state_paths(root).state;
		write_ui_state(path, {
			pid: 999_999,
			host: '127.0.0.1',
			port: 1,
			token: 'stale',
			root,
			started_at: '2026-01-01T00:00:00.000Z',
		});
		const result = await launch({
			root,
			port: 0,
			detach: false,
			...quiet(),
		});
		expect(result.status).toBe('foreground');
		expect(read_ui_state(path)?.token).not.toBe('stale');
	});

	it('does not trust a server that cannot prove the token', async () => {
		const root = make_project();
		const first = await launch({
			root,
			port: 0,
			detach: false,
			...quiet(),
		});
		const state = read_ui_state(ui_state_paths(root).state)!;
		expect(await probe_ui_server(state)).toBe(true);
		expect(await probe_ui_server({ ...state, token: 'wrong' })).toBe(
			false,
		);
		expect(first.status).toBe('foreground');
	});

	it('removes the state file when the server closes', async () => {
		const root = make_project();
		const result = await launch_ui({
			root,
			port: 0,
			detach: false,
			...quiet(),
		});
		if (result.status !== 'foreground')
			throw new Error('expected foreground');
		await result.server.close();
		expect(read_ui_state(ui_state_paths(root).state)).toBeNull();
	});

	it('reports when there is nothing to stop', async () => {
		const result = await launch({
			root: make_project(),
			stop: true,
			...quiet(),
		});
		expect(result.status).toBe('not-running');
	});

	it('detaches, returns once healthy, then stops', async () => {
		if (!existsSync(built_bin)) {
			throw new Error(
				'Build @wiki0/ui first: dist/bin.js is missing',
			);
		}
		const root = make_project();
		const lines: string[] = [];
		const started = await launch({
			root,
			port: 0,
			detach: true,
			bin_path: built_bin,
			...quiet(lines),
		});
		expect(started.status).toBe('started');
		expect(lines[0]).toMatch(/#token=/u);
		const state = read_ui_state(ui_state_paths(root).state)!;
		expect(state.pid).not.toBe(process.pid);
		expect(await probe_ui_server(state)).toBe(true);

		const stopped = await launch({ root, stop: true, ...quiet() });
		expect(stopped.status).toBe('stopped');
		expect(await probe_ui_server(state)).toBe(false);
		expect(read_ui_state(ui_state_paths(root).state)).toBeNull();
	}, 20_000);
});
