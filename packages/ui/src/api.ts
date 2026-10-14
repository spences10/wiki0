import {
	backlinks_for_page,
	graph_wiki,
	index_status,
	index_wiki,
	lint_wiki,
	list_chunks,
	list_documents,
	list_links,
	read_document,
	resolve_index,
	search,
	show,
	wikilink_pattern_source,
} from '@wiki0/core';
import { readFileSync, statSync } from 'node:fs';
import { content_type, file_under } from './static.js';

export type ApiResponse =
	| { status: number; json: unknown }
	| { status: number; body: Buffer; content_type: string };

// Files a doc may embed and the UI may fetch, by extension.
const asset_extensions = new Set([
	'.png',
	'.jpg',
	'.jpeg',
	'.gif',
	'.webp',
	'.avif',
	'.svg',
]);

const max_search_limit = 50;

function ok(json: unknown): ApiResponse {
	return { status: 200, json };
}

function not_found(error = 'not found'): ApiResponse {
	return { status: 404, json: { error } };
}

function bad_request(error: string): ApiResponse {
	return { status: 400, json: { error } };
}

function bounded_integer(
	value: string | null,
	fallback: number,
	maximum: number,
): number {
	const parsed = Number(value ?? fallback);
	if (!Number.isInteger(parsed) || parsed < 1) return fallback;
	return Math.min(parsed, maximum);
}

function required(
	params: URLSearchParams,
	name: string,
): string | ApiResponse {
	const value = params.get(name)?.trim();
	return value ? value : bad_request(`${name} is required`);
}

function or_not_found<T>(value: T | null): ApiResponse {
	return value === null ? not_found() : ok(value);
}

// Serves an image only when the document links to it and core
// resolved that link, so the endpoint cannot read arbitrary files.
function read_asset(
	root: string,
	path: string,
	target: string,
): ApiResponse {
	const extension = target
		.slice(target.lastIndexOf('.'))
		.toLowerCase();
	if (!asset_extensions.has(extension)) return not_found();
	const links = list_links(path, root);
	const linked = links?.some(
		(link) => link.link_status === 'resolved' && link.to === target,
	);
	if (!linked) return not_found();
	const file = file_under(root, target);
	if (!file) return not_found();
	try {
		if (!statSync(file).isFile()) return not_found();
		return {
			status: 200,
			body: readFileSync(file),
			content_type: content_type(file),
		};
	} catch {
		return not_found();
	}
}

export type ApiContext = {
	root: string;
	reindex: () => Promise<ApiResponse>;
};

// Read routes are thin calls into @wiki0/core; it resolves links,
// anchors and paths, and only reads documents that are indexed.
export function handle_api_get(
	context: ApiContext,
	pathname: string,
	params: URLSearchParams,
): ApiResponse {
	const { root } = context;
	switch (pathname) {
		// What the browser needs from core that is not data: the
		// wikilink syntax, so rendering finds the links core indexed.
		case '/api/meta':
			return ok({ root, wikilink_pattern_source });
		case '/api/status':
			return ok({
				location: resolve_index(root),
				status: index_status(root),
			});
		case '/api/search': {
			const query = required(params, 'q');
			if (typeof query !== 'string') return query;
			return ok(
				search(query, root, {
					limit: bounded_integer(
						params.get('limit'),
						10,
						max_search_limit,
					),
					include_superseded:
						params.get('include_superseded') !== 'false',
				}),
			);
		}
		case '/api/show': {
			const target = required(params, 'target');
			if (typeof target !== 'string') return target;
			return or_not_found(
				show(target, root, {
					token_budget: bounded_integer(
						params.get('token_budget'),
						2000,
						100_000,
					),
					neighbours: Number(params.get('neighbours') ?? 0) || 0,
				}),
			);
		}
		case '/api/documents':
			return ok(list_documents(root));
		case '/api/chunks':
			return ok(
				list_documents(root).map((document) => ({
					path: document.path,
					title: document.title,
					doc_type: document.doc_type,
					chunks: list_chunks(document.path, root) ?? [],
				})),
			);
		case '/api/graph':
			return ok(graph_wiki(root));
		case '/api/lint':
			return ok(lint_wiki(root));
	}

	if (!pathname.startsWith('/api/doc')) return not_found();
	const path = required(params, 'path');
	if (typeof path !== 'string') return path;
	switch (pathname) {
		case '/api/doc':
			return or_not_found(read_document(path, root));
		case '/api/doc/links':
			return or_not_found(list_links(path, root));
		case '/api/doc/chunks':
			return or_not_found(list_chunks(path, root));
		case '/api/doc/backlinks':
			return ok(backlinks_for_page(path, root));
		case '/api/doc/asset': {
			const target = required(params, 'target');
			if (typeof target !== 'string') return target;
			return read_asset(root, path, target);
		}
	}
	return not_found();
}

// One rebuild at a time; a second request while one runs gets 409.
export function create_reindexer(
	root: string,
	index: (root: string) => Promise<unknown> = index_wiki,
) {
	let running: Promise<unknown> | null = null;
	return async (): Promise<ApiResponse> => {
		if (running) {
			return {
				status: 409,
				json: { error: 'reindex already running', code: 'busy' },
			};
		}
		running = index(root);
		try {
			return ok(await running);
		} finally {
			running = null;
		}
	};
}
