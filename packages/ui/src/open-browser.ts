import { spawn } from 'node:child_process';

function browser_command(url: string): [string, string[]] {
	if (process.platform === 'darwin') return ['open', [url]];
	if (process.platform === 'win32') {
		return ['cmd', ['/c', 'start', '""', url]];
	}
	return ['xdg-open', [url]];
}

// Best effort: a missing opener is not an error, the URL is printed.
export function open_browser(url: string): void {
	const [command, args] = browser_command(url);
	try {
		const child = spawn(command, args, {
			detached: true,
			stdio: 'ignore',
		});
		child.on('error', () => {});
		child.unref();
	} catch {
		// The caller has already printed the URL.
	}
}
