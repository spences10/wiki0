import { describe, expect, it } from 'vite-plus/test';
import { ui_launch_options } from './ui.js';

function parse_port(value: string | undefined) {
	return value === undefined ? undefined : Number(value);
}

describe('ui_launch_options', () => {
	it('leaves detach to the terminal check by default', () => {
		expect(ui_launch_options({ root: '.' }, parse_port, {})).toEqual({
			root: '.',
			host: undefined,
			port: undefined,
			open: true,
			detach: undefined,
			stop: false,
		});
	});

	it('maps --detach, --foreground, --no-open and --stop', () => {
		expect(
			ui_launch_options({ root: '.', detach: true }, parse_port, {})
				.detach,
		).toBe(true);
		expect(
			ui_launch_options(
				{ root: '.', detach: true, foreground: true },
				parse_port,
				{},
			).detach,
		).toBe(false);
		expect(
			ui_launch_options({ root: '.', open: false }, parse_port, {})
				.open,
		).toBe(false);
		expect(
			ui_launch_options({ root: '.', stop: true }, parse_port, {})
				.stop,
		).toBe(true);
	});

	it('takes the port from the flag, then WIKI0_UI_PORT', () => {
		expect(
			ui_launch_options({ root: '.', port: '5000' }, parse_port, {
				WIKI0_UI_PORT: '6000',
			}).port,
		).toBe(5000);
		expect(
			ui_launch_options({ root: '.' }, parse_port, {
				WIKI0_UI_PORT: '6000',
			}).port,
		).toBe(6000);
	});
});
