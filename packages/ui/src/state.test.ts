import { statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';
import {
	authenticated_ui_url,
	read_ui_state,
	remove_ui_state,
	ui_state_dir,
	write_ui_state,
	type UiState,
} from './state.js';
import { make_temp_dir } from './test-utils.js';

const state: UiState = {
	pid: 123,
	host: '127.0.0.1',
	port: 4100,
	token: 'abc',
	root: '/project',
	started_at: '2026-10-14T00:00:00.000Z',
};

describe('ui_state_dir', () => {
	it('uses WIKI0_STATE_DIR, then an absolute XDG_STATE_HOME', () => {
		expect(ui_state_dir({ WIKI0_STATE_DIR: '/tmp/s' })).toBe(
			'/tmp/s',
		);
		if (process.platform === 'linux') {
			expect(ui_state_dir({ XDG_STATE_HOME: '/x' })).toBe(
				'/x/wiki0/ui',
			);
			expect(ui_state_dir({ XDG_STATE_HOME: 'rel' })).not.toContain(
				'rel',
			);
		}
	});
});

describe('state file', () => {
	it('round-trips and is private to the user', () => {
		const path = join(make_temp_dir(), 'nested', 'state.json');
		write_ui_state(path, state);
		expect(read_ui_state(path)).toEqual(state);
		expect(statSync(path).mode & 0o777).toBe(0o600);
	});

	it('is only removed by the pid that wrote it', () => {
		const path = join(make_temp_dir(), 'state.json');
		write_ui_state(path, state);
		remove_ui_state(path, 999);
		expect(read_ui_state(path)).not.toBeNull();
		remove_ui_state(path, 123);
		expect(read_ui_state(path)).toBeNull();
	});

	it('treats a corrupt file as no state', () => {
		expect(read_ui_state('/nonexistent/state.json')).toBeNull();
	});
});

describe('authenticated_ui_url', () => {
	it('carries the token in the fragment', () => {
		expect(authenticated_ui_url(state)).toBe(
			'http://127.0.0.1:4100/#token=abc',
		);
	});
});
