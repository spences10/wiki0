import { describe, expect, it } from 'vite-plus/test';
import { main } from './commands.js';

describe('main command', () => {
	it('exposes only read and index commands', () => {
		expect(Object.keys(main.subCommands ?? {})).toEqual([
			'index',
			'status',
			'search',
			'show',
			'context',
			'lint',
			'check',
			'skill',
			'graph',
			'documents',
			'backlinks',
			'ui',
		]);
	});
});
