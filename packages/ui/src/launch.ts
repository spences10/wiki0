import { resolve_project_root } from '@wiki0/core';
import { spawn } from 'node:child_process';
import {
	closeSync,
	mkdirSync,
	openSync,
	readFileSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import { open_browser } from './open-browser.js';
import {
	create_health_challenge,
	health_proof_matches,
	is_loopback_host,
} from './security.js';
import {
	default_port,
	start_ui_server,
	type RunningUiServer,
} from './server.js';
import {
	authenticated_ui_url,
	read_ui_state,
	remove_ui_state,
	ui_state_paths,
	write_ui_state,
	type UiState,
} from './state.js';

export const default_detached_idle_timeout_ms = 4 * 60 * 60 * 1000;

const bin_path = fileURLToPath(new URL('./bin.js', import.meta.url));
const detach_ready_timeout_ms = 10_000;

export type LaunchOptions = {
	root?: string;
	host?: string;
	port?: number;
	// Open the browser; default true.
	open?: boolean;
	// Run in the background and return once the server answers.
	// Defaults to true when stdout is not a terminal, as when an agent
	// runs the command, so it never blocks the agent's turn.
	detach?: boolean;
	stop?: boolean;
	idle_timeout_ms?: number;
	log?: (line: string) => void;
	open_url?: (url: string) => void;
	bin_path?: string;
};

export type LaunchResult =
	| { status: 'running' | 'started'; url: string; pid: number }
	| { status: 'foreground'; url: string; server: RunningUiServer }
	| { status: 'stopped' | 'not-running' };

// Asks the recorded server to prove it holds the recorded token, so
// a reused port or pid is never mistaken for our server.
export async function probe_ui_server(
	state: UiState,
): Promise<boolean> {
	const challenge = create_health_challenge();
	const host = state.host.includes(':')
		? `[${state.host}]`
		: state.host;
	try {
		const response = await fetch(
			`http://${host}:${state.port}/health?challenge=${challenge}`,
			{ signal: AbortSignal.timeout(1500) },
		);
		if (!response.ok) return false;
		const body = (await response.json()) as { proof?: unknown };
		return health_proof_matches(state.token, challenge, body.proof);
	} catch {
		return false;
	}
}

async function running_state(path: string): Promise<UiState | null> {
	const state = read_ui_state(path);
	if (!state) return null;
	if (await probe_ui_server(state)) return state;
	remove_ui_state(path, state.pid);
	return null;
}

function pid_alive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

async function wait_for(
	check: () => Promise<boolean> | boolean,
	timeout_ms: number,
): Promise<boolean> {
	const deadline = Date.now() + timeout_ms;
	while (Date.now() < deadline) {
		if (await check()) return true;
		await new Promise((resolve_wait) =>
			setTimeout(resolve_wait, 100),
		);
	}
	return false;
}

function log_tail(path: string): string {
	try {
		return readFileSync(path, 'utf8')
			.trim()
			.split('\n')
			.slice(-10)
			.join('\n');
	} catch {
		return '';
	}
}

// Runs the server in this process and records it in the state file.
// Used for the foreground mode and inside the detached child.
export async function serve_ui(
	options: Omit<LaunchOptions, 'detach' | 'stop'> & {
		on_exit?: () => void;
	} = {},
): Promise<RunningUiServer> {
	const root = resolve_project_root(options.root ?? '.');
	const paths = ui_state_paths(root);
	const server = await start_ui_server({
		root,
		host: options.host,
		port: options.port,
		idle_timeout_ms: options.idle_timeout_ms,
		on_idle: () => {
			remove_ui_state(paths.state, process.pid);
			options.on_exit?.();
		},
	});
	write_ui_state(paths.state, {
		pid: process.pid,
		host: server.host,
		port: server.port,
		token: server.token,
		root,
		started_at: new Date().toISOString(),
	});
	const stop = () => {
		remove_ui_state(paths.state, process.pid);
		void server.close().then(() => options.on_exit?.());
	};
	process.once('SIGINT', stop);
	process.once('SIGTERM', stop);
	server.server.once('close', () => {
		process.off('SIGINT', stop);
		process.off('SIGTERM', stop);
		remove_ui_state(paths.state, process.pid);
	});
	return server;
}

export async function launch_ui(
	options: LaunchOptions = {},
): Promise<LaunchResult> {
	const log = options.log ?? ((line: string) => console.log(line));
	const open_url = options.open_url ?? open_browser;
	const root = resolve_project_root(options.root ?? '.');
	const paths = ui_state_paths(root);
	const host = options.host ?? '127.0.0.1';
	const port = options.port ?? default_port;

	if (options.stop) {
		const state = await running_state(paths.state);
		if (!state) {
			log('wiki0 docs is not running for this project');
			return { status: 'not-running' };
		}
		process.kill(state.pid, 'SIGTERM');
		await wait_for(() => !pid_alive(state.pid), 5000);
		remove_ui_state(paths.state, state.pid);
		log(`Stopped wiki0 docs (pid ${state.pid})`);
		return { status: 'stopped' };
	}

	const existing = await running_state(paths.state);
	if (existing) {
		const url = authenticated_ui_url(existing);
		log(`wiki0 docs already running: ${url}`);
		if (options.open !== false) open_url(url);
		return { status: 'running', url, pid: existing.pid };
	}

	if (!is_loopback_host(host)) {
		log(
			`Warning: serving on ${host} exposes the docs beyond this machine`,
		);
	}

	const detach = options.detach ?? !process.stdout.isTTY;
	if (!detach) {
		const server = await serve_ui({ ...options, root, host, port });
		log(server.authenticated_url);
		if (server.port_fallback) {
			log(`Port ${port} is busy; using ${server.port}`);
		}
		log('Press Ctrl-C to stop');
		if (options.open !== false) open_url(server.authenticated_url);
		return {
			status: 'foreground',
			url: server.authenticated_url,
			server,
		};
	}

	const idle_timeout_ms =
		options.idle_timeout_ms ?? default_detached_idle_timeout_ms;
	mkdirSync(paths.dir, { recursive: true, mode: 0o700 });
	const log_fd = openSync(paths.log, 'a', 0o600);
	const child = spawn(
		process.execPath,
		[
			options.bin_path ?? bin_path,
			'serve',
			'--root',
			root,
			'--host',
			host,
			'--port',
			String(port),
			'--idle-timeout-ms',
			String(idle_timeout_ms),
		],
		{ detached: true, stdio: ['ignore', log_fd, log_fd] },
	);
	closeSync(log_fd);
	child.unref();
	const pid = child.pid ?? -1;

	let state: UiState | null = null;
	const ready = await wait_for(async () => {
		const recorded = read_ui_state(paths.state);
		if (recorded?.pid !== pid) return false;
		state = recorded;
		return probe_ui_server(recorded);
	}, detach_ready_timeout_ms);
	if (!ready || !state) {
		if (pid_alive(pid)) process.kill(pid, 'SIGTERM');
		const tail = log_tail(paths.log);
		throw new Error(
			`wiki0 docs did not start${tail ? `:\n${tail}` : ''}`,
		);
	}
	const started: UiState = state;
	const url = authenticated_ui_url(started);
	log(url);
	if (started.port !== port) {
		log(`Port ${port} is busy; using ${started.port}`);
	}
	log(
		`Running in the background (pid ${pid}); stop with \`wiki0 ui --stop\``,
	);
	if (options.open !== false) open_url(url);
	return { status: 'started', url, pid };
}
