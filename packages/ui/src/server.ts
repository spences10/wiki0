import { resolve_project_root } from '@wiki0/core';
import {
	createServer,
	type IncomingMessage,
	type Server,
	type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import {
	create_reindexer,
	handle_api_get,
	type ApiResponse,
} from './api.js';
import {
	allowed_host,
	create_health_proof,
	generate_token,
	is_authorized,
	security_headers,
	valid_health_challenge,
} from './security.js';
import { authenticated_ui_url, ui_url } from './state.js';
import { default_web_dir, read_static } from './static.js';

export const default_port = 4100;

export type UiServerOptions = {
	root?: string;
	host?: string;
	// 0 picks a free port. A busy fixed port falls back to a free one.
	port?: number;
	token?: string;
	web_dir?: string;
	// Close after this long with no requests; off when unset.
	idle_timeout_ms?: number;
	on_idle?: () => void;
};

export type RunningUiServer = {
	server: Server;
	root: string;
	host: string;
	port: number;
	token: string;
	// True when the requested port was busy and a free one was used.
	port_fallback: boolean;
	url: string;
	authenticated_url: string;
	close: () => Promise<void>;
};

const request_timeout_ms = 30_000;
const headers_timeout_ms = 10_000;
const keep_alive_timeout_ms = 5_000;

function send(
	res: ServerResponse,
	status: number,
	headers: Record<string, string>,
	body: string | Buffer,
): void {
	res.writeHead(status, { ...security_headers, ...headers });
	res.end(body);
}

function send_json(
	res: ServerResponse,
	status: number,
	value: unknown,
): void {
	send(
		res,
		status,
		{
			'content-type': 'application/json; charset=utf-8',
			'cache-control': 'no-store',
		},
		JSON.stringify(value),
	);
}

function send_api(res: ServerResponse, response: ApiResponse): void {
	if ('json' in response) {
		send_json(res, response.status, response.json);
		return;
	}
	send(
		res,
		response.status,
		{
			'content-type': response.content_type,
			'cache-control': 'no-store',
		},
		response.body,
	);
}

function error_code(error: unknown): string | undefined {
	return error && typeof error === 'object' && 'code' in error
		? String(error.code)
		: undefined;
}

function listen(
	server: Server,
	port: number,
	host: string,
): Promise<number> {
	return new Promise((resolve_listen, reject) => {
		const on_error = (error: Error) => {
			server.off('listening', on_listening);
			reject(error);
		};
		const on_listening = () => {
			server.off('error', on_error);
			resolve_listen((server.address() as AddressInfo).port);
		};
		server.once('error', on_error);
		server.once('listening', on_listening);
		server.listen(port, host);
	});
}

export async function start_ui_server(
	options: UiServerOptions = {},
): Promise<RunningUiServer> {
	const root = resolve_project_root(options.root ?? '.');
	const host = options.host ?? '127.0.0.1';
	const token = options.token ?? generate_token();
	const web_dir = options.web_dir ?? default_web_dir;
	const reindex = create_reindexer(root);
	let port = options.port ?? default_port;
	let idle_timer: NodeJS.Timeout | undefined;

	function touch(): void {
		if (!options.idle_timeout_ms) return;
		clearTimeout(idle_timer);
		idle_timer = setTimeout(() => {
			void close().then(() => options.on_idle?.());
		}, options.idle_timeout_ms);
	}

	async function handle(
		req: IncomingMessage,
		res: ServerResponse,
	): Promise<void> {
		touch();
		if (!allowed_host(req.headers.host, host, port)) {
			return send_json(res, 403, { error: 'host not allowed' });
		}
		const url = new URL(req.url ?? '/', 'http://localhost');
		const method = req.method ?? 'GET';

		// Outside the app's routes, so /health stays a page.
		if (url.pathname === '/_health') {
			const challenge = url.searchParams.get('challenge');
			if (!valid_health_challenge(challenge)) {
				return send_json(res, 400, {
					error: 'valid health challenge required',
				});
			}
			return send_json(res, 200, {
				ok: true,
				proof: create_health_proof(token, challenge),
			});
		}

		if (url.pathname.startsWith('/api/')) {
			if (!is_authorized(token, req.headers.authorization)) {
				return send_json(res, 401, { error: 'unauthorized' });
			}
			try {
				if (url.pathname === '/api/reindex') {
					if (method !== 'POST') {
						return send_json(res, 405, { error: 'use POST' });
					}
					return send_api(res, await reindex());
				}
				if (method !== 'GET') {
					return send_json(res, 405, { error: 'read only' });
				}
				return send_api(
					res,
					handle_api_get(
						{ root, reindex },
						url.pathname,
						url.searchParams,
					),
				);
			} catch (error) {
				if (error_code(error) === 'not-indexed') {
					return send_json(res, 409, {
						error: (error as Error).message,
						code: 'not-indexed',
					});
				}
				return send_json(res, 500, {
					error:
						error instanceof Error ? error.message : String(error),
				});
			}
		}

		if (method !== 'GET' && method !== 'HEAD') {
			return send_json(res, 405, { error: 'method not allowed' });
		}
		const file = read_static(web_dir, url.pathname);
		if (!file) return send_json(res, 404, { error: 'not found' });
		return send(
			res,
			200,
			{
				'content-type': file.content_type,
				'cache-control': file.immutable
					? 'public, max-age=31536000, immutable'
					: 'no-store',
			},
			method === 'HEAD' ? '' : file.body,
		);
	}

	const server = createServer((req, res) => {
		handle(req, res).catch((error: unknown) => {
			if (!res.headersSent) {
				send_json(res, 500, { error: String(error) });
			} else {
				res.destroy();
			}
		});
	});
	server.requestTimeout = request_timeout_ms;
	server.headersTimeout = headers_timeout_ms;
	server.keepAliveTimeout = keep_alive_timeout_ms;

	let port_fallback = false;
	try {
		port = await listen(server, port, host);
	} catch (error) {
		if (error_code(error) !== 'EADDRINUSE' || port === 0) throw error;
		port = await listen(server, 0, host);
		port_fallback = true;
	}

	let closing: Promise<void> | undefined;
	function close(): Promise<void> {
		clearTimeout(idle_timer);
		closing ??= new Promise<void>((resolve_close) => {
			server.close(() => resolve_close());
			server.closeAllConnections();
		});
		return closing;
	}

	touch();
	const state = { host, port, token };
	return {
		server,
		root,
		host,
		port,
		token,
		port_fallback,
		url: ui_url(state),
		authenticated_url: authenticated_ui_url(state),
		close,
	};
}
