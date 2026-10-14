import { worktree_key } from '@wiki0/core';
import {
	chmodSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';

// What a running server records so a second `wiki0 ui` can find it.
export type UiState = {
	pid: number;
	host: string;
	port: number;
	token: string;
	root: string;
	started_at: string;
};

export function ui_state_dir(env = process.env): string {
	if (env.WIKI0_STATE_DIR) return resolve(env.WIKI0_STATE_DIR);
	if (process.platform === 'darwin') {
		return join(
			homedir(),
			'Library',
			'Application Support',
			'wiki0',
			'ui',
		);
	}
	if (process.platform === 'win32') {
		const local_app_data =
			env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local');
		return join(local_app_data, 'wiki0', 'State', 'ui');
	}
	const xdg_state = env.XDG_STATE_HOME;
	// The XDG spec says relative paths must be ignored.
	const base =
		xdg_state && isAbsolute(xdg_state)
			? xdg_state
			: join(homedir(), '.local', 'state');
	return join(base, 'wiki0', 'ui');
}

export function ui_state_paths(root: string, env = process.env) {
	const dir = ui_state_dir(env);
	const key = worktree_key(root);
	return {
		dir,
		state: join(dir, `${key}.json`),
		log: join(dir, `${key}.log`),
	};
}

export function read_ui_state(path: string): UiState | null {
	try {
		const value = JSON.parse(readFileSync(path, 'utf8')) as UiState;
		if (
			typeof value.pid !== 'number' ||
			typeof value.port !== 'number' ||
			typeof value.token !== 'string' ||
			typeof value.host !== 'string'
		) {
			return null;
		}
		return value;
	} catch {
		return null;
	}
}

// The state file holds the token, so it is private to the user.
export function write_ui_state(path: string, state: UiState): void {
	mkdirSync(resolve(path, '..'), { recursive: true, mode: 0o700 });
	writeFileSync(path, `${JSON.stringify(state, null, '\t')}\n`, {
		mode: 0o600,
	});
	chmodSync(path, 0o600);
}

export function remove_ui_state(path: string, pid?: number): void {
	if (pid !== undefined && read_ui_state(path)?.pid !== pid) return;
	rmSync(path, { force: true });
}

export function ui_url(
	state: Pick<UiState, 'host' | 'port'>,
): string {
	const host = state.host.includes(':')
		? `[${state.host}]`
		: state.host;
	return `http://${host}:${state.port}/`;
}

export function authenticated_ui_url(
	state: Pick<UiState, 'host' | 'port' | 'token'>,
): string {
	return `${ui_url(state)}#${new URLSearchParams({ token: state.token })}`;
}
