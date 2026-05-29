import { describe, expect, it } from 'vitest';
import { main } from './commands.js';

describe('main command', () => {
	it('exposes the expected top-level commands', () => {
		expect(Object.keys(main.subCommands ?? {})).toEqual([
			'init',
			'page',
			'index',
			'search',
			'context',
			'backlinks',
			'review',
		]);
	});

	it('groups page subcommands', () => {
		const sub_commands = main.subCommands as Record<
			string,
			typeof main
		>;
		const page_command = sub_commands.page;
		expect(Object.keys(page_command?.subCommands ?? {})).toEqual([
			'create',
			'read',
			'frontmatter',
			'append',
		]);
	});
});
