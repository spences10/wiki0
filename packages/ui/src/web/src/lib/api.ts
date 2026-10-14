import type {
	BacklinkResult,
	ChunkSummary,
	DocumentContent,
	DocumentLink,
	DocumentSummary,
	GraphResult,
	IndexLocation,
	IndexResult,
	IndexStatus,
	LintResult,
	SearchResponse,
	ShowResult,
} from '@wiki0/core';

const token_key = 'wiki0-token';

export type Meta = {
	root: string;
	wikilink_pattern_source: string;
};

export type StatusResponse = {
	location: IndexLocation;
	status: IndexStatus;
};

export type DocumentChunks = {
	path: string;
	title: string;
	doc_type: string | null;
	chunks: ChunkSummary[];
};

export class ApiError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly code?: string,
	) {
		super(message);
		this.name = 'ApiError';
	}
}

/**
 * The server hands the token over once, in the URL fragment. It is
 * kept for the tab in sessionStorage and removed from the address
 * bar so it doesn't end up in history or a shared link.
 */
export function take_token(
	location: Pick<Location, 'hash' | 'pathname' | 'search'>,
	storage: Pick<Storage, 'getItem' | 'setItem'> | null,
	replace_url: (url: string) => void,
): string {
	const fragment = new URLSearchParams(location.hash.slice(1));
	const token = fragment.get('token');
	if (token) {
		try {
			storage?.setItem(token_key, token);
		} catch {
			// Private windows can refuse storage; the token still works
			// for this page load.
		}
		replace_url(`${location.pathname}${location.search}`);
		return token;
	}
	try {
		return storage?.getItem(token_key) ?? '';
	} catch {
		return '';
	}
}

function session_storage(): Storage | null {
	try {
		return window.sessionStorage;
	} catch {
		return null;
	}
}

const token =
	typeof window === 'undefined'
		? ''
		: take_token(window.location, session_storage(), (url) =>
				history.replaceState(history.state, '', url),
			);

export function has_token(): boolean {
	return token !== '';
}

async function request(
	path: string,
	init: RequestInit = {},
): Promise<Response> {
	const headers = new Headers(init.headers);
	headers.set('authorization', `Bearer ${token}`);
	const response = await fetch(path, { ...init, headers });
	if (!response.ok) {
		let message = `HTTP ${response.status}`;
		let code: string | undefined;
		try {
			const body = (await response.json()) as {
				error?: string;
				code?: string;
			};
			message = body.error ?? message;
			code = body.code;
		} catch {
			// Not JSON; keep the status line.
		}
		throw new ApiError(message, response.status, code);
	}
	return response;
}

async function get<T>(
	path: string,
	params: Record<string, string | number | boolean> = {},
): Promise<T> {
	const query = new URLSearchParams(
		Object.entries(params).map(([key, value]) => [key, String(value)]),
	).toString();
	const response = await request(query ? `${path}?${query}` : path);
	return (await response.json()) as T;
}

export const api = {
	meta: () => get<Meta>('/api/meta'),
	status: () => get<StatusResponse>('/api/status'),
	documents: () => get<DocumentSummary[]>('/api/documents'),
	all_chunks: () => get<DocumentChunks[]>('/api/chunks'),
	graph: () => get<GraphResult>('/api/graph'),
	lint: () => get<LintResult>('/api/lint'),
	search: (q: string, limit = 10) =>
		get<SearchResponse>('/api/search', { q, limit }),
	show: (target: string, token_budget = 2000) =>
		get<ShowResult>('/api/show', { target, token_budget }),
	doc: (path: string) => get<DocumentContent>('/api/doc', { path }),
	links: (path: string) =>
		get<DocumentLink[]>('/api/doc/links', { path }),
	chunks: (path: string) =>
		get<ChunkSummary[]>('/api/doc/chunks', { path }),
	backlinks: (path: string) =>
		get<BacklinkResult[]>('/api/doc/backlinks', { path }),
	async asset(path: string, target: string): Promise<Blob> {
		const query = new URLSearchParams({ path, target });
		const response = await request(`/api/doc/asset?${query}`);
		return response.blob();
	},
	async reindex(): Promise<IndexResult> {
		const response = await request('/api/reindex', { method: 'POST' });
		return (await response.json()) as IndexResult;
	},
};

export function is_not_indexed(error: unknown): boolean {
	return error instanceof ApiError && error.code === 'not-indexed';
}
