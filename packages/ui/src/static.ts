import { readFileSync, statSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const default_web_dir = fileURLToPath(
	new URL('./web/', import.meta.url),
);

const content_types: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.avif': 'image/avif',
	'.ico': 'image/x-icon',
	'.woff2': 'font/woff2',
	'.woff': 'font/woff',
	'.txt': 'text/plain; charset=utf-8',
};

export function content_type(path: string): string {
	return (
		content_types[extname(path).toLowerCase()] ??
		'application/octet-stream'
	);
}

export type StaticFile = {
	body: Buffer;
	content_type: string;
	immutable: boolean;
};

// Resolves a request path to a file under `base`, refusing anything
// that would leave it.
export function file_under(
	base: string,
	request_path: string,
): string | null {
	let decoded: string;
	try {
		decoded = decodeURIComponent(request_path);
	} catch {
		return null;
	}
	if (decoded.includes('\0')) return null;
	const root = resolve(base);
	const path = resolve(join(root, decoded));
	if (path !== root && !path.startsWith(root + sep)) return null;
	return path;
}

function read_file(path: string): Buffer | null {
	try {
		return statSync(path).isFile() ? readFileSync(path) : null;
	} catch {
		return null;
	}
}

// Built assets by path; any other GET outside /assets gets the app
// shell so client-side routes such as /docs/a.md#intro load.
export function read_static(
	web_dir: string,
	pathname: string,
): StaticFile | null {
	if (pathname !== '/' && !pathname.endsWith('/')) {
		const path = file_under(web_dir, pathname);
		if (!path) return null;
		const body = read_file(path);
		if (body) {
			return {
				body,
				content_type: content_type(path),
				immutable: pathname.startsWith('/assets/'),
			};
		}
		if (pathname.startsWith('/assets/')) return null;
	}
	const shell = read_file(join(web_dir, 'index.html'));
	return shell
		? {
				body: shell,
				content_type: content_types['.html']!,
				immutable: false,
			}
		: null;
}
