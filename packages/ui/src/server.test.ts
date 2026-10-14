import { request } from 'node:http';
import { createServer } from 'node:net';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import { start_ui_server, type RunningUiServer } from './server.js';
import {
	make_indexed_project,
	make_project,
	make_temp_dir,
	write_file,
} from './test-utils.js';

const servers: RunningUiServer[] = [];

afterEach(async () => {
	for (const server of servers.splice(0)) await server.close();
});

async function start(root: string, options = {}) {
	const web_dir = make_temp_dir();
	write_file(web_dir, 'index.html', '<div id="app"></div>');
	const server = await start_ui_server({
		root,
		port: 0,
		web_dir,
		...options,
	});
	servers.push(server);
	return server;
}

function api(
	server: RunningUiServer,
	path: string,
	init: RequestInit = {},
) {
	return fetch(`${server.url}${path.slice(1)}`, {
		...init,
		headers: { authorization: `Bearer ${server.token}` },
	});
}

async function api_json<T = Record<string, unknown>>(
	server: RunningUiServer,
	path: string,
): Promise<T> {
	const response = await api(server, path);
	expect(response.status).toBe(200);
	return (await response.json()) as T;
}

// fetch cannot set Host, so a raw request checks the allowlist.
function status_with_host(
	server: RunningUiServer,
	host: string,
): Promise<number> {
	return new Promise((resolve, reject) => {
		const req = request(
			{
				host: '127.0.0.1',
				port: server.port,
				path: '/api/status',
				headers: {
					host,
					authorization: `Bearer ${server.token}`,
				},
			},
			(res) => {
				res.resume();
				resolve(res.statusCode ?? 0);
			},
		);
		req.on('error', reject);
		req.end();
	});
}

describe('access control', () => {
	it('needs the token for the API', async () => {
		const server = await start(make_project());
		const response = await fetch(`${server.url}api/status`);
		expect(response.status).toBe(401);
	});

	it('rejects a foreign Host header', async () => {
		const server = await start(make_project());
		expect(await status_with_host(server, 'evil.example')).toBe(403);
		expect(
			await status_with_host(server, `localhost:${server.port}`),
		).toBe(200);
	});

	it('sends the security headers', async () => {
		const server = await start(make_project());
		const response = await fetch(server.url);
		expect(response.headers.get('content-security-policy')).toContain(
			"script-src 'self'",
		);
		expect(response.headers.get('x-content-type-options')).toBe(
			'nosniff',
		);
		expect(response.headers.get('referrer-policy')).toBe(
			'no-referrer',
		);
		expect(response.headers.get('access-control-allow-origin')).toBe(
			null,
		);
		const api_response = await api(server, '/api/status');
		expect(api_response.headers.get('cache-control')).toBe(
			'no-store',
		);
	});

	it('is read only apart from reindex', async () => {
		const server = await start(make_project());
		expect(
			(await api(server, '/api/documents', { method: 'POST' }))
				.status,
		).toBe(405);
		expect((await api(server, '/api/reindex')).status).toBe(405);
	});

	it('answers health challenges with a proof, not the token', async () => {
		const server = await start(make_project());
		const response = await fetch(
			`${server.url}_health?challenge=${'a'.repeat(24)}`,
		);
		const body = (await response.json()) as { proof: string };
		expect(body.proof).toBeTruthy();
		expect(JSON.stringify(body)).not.toContain(server.token);
	});
});

describe('API', () => {
	it('reports a missing index as not-indexed', async () => {
		const server = await start(make_project());
		const response = await api(server, '/api/documents');
		expect(response.status).toBe(409);
		expect(await response.json()).toMatchObject({
			code: 'not-indexed',
		});
	});

	it('reindexes, then serves the index', async () => {
		const server = await start(make_project());
		const response = await api(server, '/api/reindex', {
			method: 'POST',
		});
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ page_count: 4 });
		const documents = await api_json<unknown[]>(
			server,
			'/api/documents',
		);
		expect(documents).toHaveLength(4);
	});

	it('serves the wikilink syntax for rendering', async () => {
		const server = await start(make_project());
		const meta = await api_json(server, '/api/meta');
		expect(meta).toHaveProperty('wikilink_pattern_source');
		expect(meta).toHaveProperty('root', server.root);
	});

	it('serves status, search, show and the health views', async () => {
		const server = await start(await make_indexed_project());
		const status = await api_json(server, '/api/status');
		expect(status).toHaveProperty('location.index_path');
		expect(status).toHaveProperty('status.stale', false);

		const search = await api_json<{ results: { path: string }[] }>(
			server,
			'/api/search?q=installer',
		);
		expect(search.results[0]?.path).toBe('docs/setup.md');

		const shown = await api_json(
			server,
			'/api/show?target=docs/setup.md%23install',
		);
		expect(shown).toHaveProperty('markdown');

		const graph = await api_json(server, '/api/graph');
		expect(graph).toHaveProperty('edges');
		const lint = await api_json<{ issues: { rule: string }[] }>(
			server,
			'/api/lint',
		);
		expect(lint.issues.map((issue) => issue.rule)).toContain(
			'missing-file',
		);
		const chunks = await api_json<{ chunks: unknown[] }[]>(
			server,
			'/api/chunks',
		);
		expect(chunks).toHaveLength(4);
		expect(chunks[0]?.chunks.length).toBeGreaterThan(0);
	});

	it('serves a document, its links, chunks and backlinks', async () => {
		const server = await start(await make_indexed_project());
		const document = await api_json<{
			superseded_by: string;
			source: string;
			markdown: string;
			body_start_line: number;
		}>(server, '/api/doc?path=docs/old-setup.md');
		expect(document.superseded_by).toBe('docs/setup.md');
		// Rendering counts lines from here, so it must point at the
		// first line of `markdown` in the file.
		expect(
			document.source.split('\n')[document.body_start_line - 1],
		).toBe(document.markdown.split('\n')[0]);

		const links = await api_json<
			{ raw_text: string; to: string | null; link_status: string }[]
		>(server, '/api/doc/links?path=docs/guide.md');
		expect(links.map((link) => link.link_status)).toEqual([
			'resolved',
			'resolved',
			'resolved',
			'missing-file',
		]);
		expect(links[0]).toMatchObject({
			raw_text: '[setup](setup.md#install)',
			to: 'docs/setup.md',
		});

		const chunks = await api_json<unknown[]>(
			server,
			'/api/doc/chunks?path=docs/setup.md',
		);
		expect(chunks.length).toBeGreaterThan(0);

		const backlinks = await api_json<{ path: string }[]>(
			server,
			'/api/doc/backlinks?path=docs/setup.md',
		);
		expect(backlinks.map((link) => link.path)).toContain(
			'docs/guide.md',
		);
	});

	it('404s documents that are not indexed or outside the root', async () => {
		const server = await start(await make_indexed_project());
		for (const path of [
			'docs/nope.md',
			'../outside.md',
			'/etc/passwd',
			'secret.png',
		]) {
			const response = await api(
				server,
				`/api/doc?path=${encodeURIComponent(path)}`,
			);
			expect(response.status).toBe(404);
		}
		expect((await api(server, '/api/doc')).status).toBe(400);
	});

	it('serves only images a document embeds', async () => {
		const server = await start(await make_indexed_project());
		const image = await api(
			server,
			'/api/doc/asset?path=docs/guide.md&target=docs/diagram.png',
		);
		expect(image.status).toBe(200);
		expect(image.headers.get('content-type')).toBe('image/png');

		for (const target of [
			'secret.png',
			'docs/setup.md',
			'../secret.png',
		]) {
			const response = await api(
				server,
				`/api/doc/asset?path=docs/guide.md&target=${encodeURIComponent(target)}`,
			);
			expect(response.status).toBe(404);
		}
	});
});

describe('static files', () => {
	it('serves the app shell for client routes', async () => {
		const server = await start(make_project());
		for (const route of ['docs/guide.md', 'health', 'health/lint']) {
			const response = await fetch(`${server.url}${route}`);
			expect(await response.text()).toContain('id="app"');
		}
	});
});

describe('listening', () => {
	it('falls back to a free port when the port is busy', async () => {
		const blocker = createServer();
		await new Promise<void>((resolve) =>
			blocker.listen(0, '127.0.0.1', resolve),
		);
		const busy_port = (blocker.address() as { port: number }).port;
		try {
			const server = await start(make_project(), { port: busy_port });
			expect(server.port_fallback).toBe(true);
			expect(server.port).not.toBe(busy_port);
		} finally {
			blocker.close();
		}
	});

	it('closes itself after the idle timeout', async () => {
		let idle = false;
		const server = await start(make_project(), {
			idle_timeout_ms: 50,
			on_idle: () => {
				idle = true;
			},
		});
		await new Promise((resolve) => setTimeout(resolve, 200));
		expect(idle).toBe(true);
		expect(server.server.listening).toBe(false);
	});
});
