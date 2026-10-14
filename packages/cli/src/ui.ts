import type { LaunchOptions } from '@wiki0/ui';

export type UiArgs = {
	root: string;
	host?: string;
	port?: string;
	open?: boolean;
	detach?: boolean;
	foreground?: boolean;
	stop?: boolean;
};

// Maps `wiki0 ui` flags to launch options. Detach is left unset
// unless asked for, so @wiki0/ui can detach when stdout is not a
// terminal, as when an agent runs the command.
export function ui_launch_options(
	args: UiArgs,
	parse_port: (value: string | undefined) => number | undefined,
	env: NodeJS.ProcessEnv = process.env,
): LaunchOptions {
	return {
		root: args.root,
		host: args.host || undefined,
		port: parse_port(args.port || env.WIKI0_UI_PORT),
		open: args.open !== false,
		detach: args.foreground ? false : args.detach ? true : undefined,
		stop: args.stop === true,
	};
}

export async function run_ui(args: UiArgs): Promise<void> {
	// Loaded on use, so other commands don't pay for the server.
	const { launch_ui, parse_port } = await import('@wiki0/ui');
	try {
		await launch_ui(ui_launch_options(args, parse_port));
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	}
}
