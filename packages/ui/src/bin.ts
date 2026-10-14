#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { launch_ui, parse_port, serve_ui } from './launch.js';

const usage = `Usage: wiki0-ui [options]

Opens this project's docs in the browser.

Options:
  --root <path>      Project root (default: nearest folder with .git)
  --host <host>      Host to bind (default: 127.0.0.1)
  --port <port>      Port (default: 4100; a busy port falls back)
  --no-open          Print the URL without opening a browser
  --detach           Run in the background and return
  --foreground       Stay in the foreground (default in a terminal)
  --stop             Stop the server for this project
  -h, --help         Show this help`;

const { positionals, values } = parseArgs({
	allowPositionals: true,
	allowNegative: true,
	options: {
		root: { type: 'string', default: '.' },
		host: { type: 'string' },
		port: { type: 'string' },
		open: { type: 'boolean', default: true },
		detach: { type: 'boolean' },
		foreground: { type: 'boolean' },
		stop: { type: 'boolean' },
		'idle-timeout-ms': { type: 'string' },
		help: { type: 'boolean', short: 'h' },
	},
});

try {
	if (values.help) {
		console.log(usage);
	} else if (positionals[0] === 'serve') {
		// The detached child started by `--detach`.
		await serve_ui({
			root: values.root,
			host: values.host,
			port: parse_port(values.port),
			idle_timeout_ms: Number(values['idle-timeout-ms']) || undefined,
			on_exit: () => process.exit(0),
		});
	} else {
		await launch_ui({
			root: values.root,
			host: values.host,
			port: parse_port(values.port ?? process.env.WIKI0_UI_PORT),
			open: values.open,
			detach: values.foreground ? false : values.detach,
			stop: values.stop,
		});
	}
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
}
