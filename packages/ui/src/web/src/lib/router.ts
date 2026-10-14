export type HealthTab = 'status' | 'lint' | 'graph';

export type Route =
	| {
			name: 'docs';
			// Indexed path, or null for the project's home document.
			path: string | null;
			// Heading slug or `L12-L40` line range from the fragment.
			fragment: string | null;
			// Lines to highlight, from a search hit.
			highlight: [number, number] | null;
	  }
	| { name: 'search'; query: string }
	| { name: 'health'; tab: HealthTab }
	| { name: 'not-found'; pathname: string };

const health_tabs: HealthTab[] = ['status', 'lint', 'graph'];

function decode(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

export function parse_line_range(
	value: string | null,
): [number, number] | null {
	const match = /^L?(\d+)(?:-L?(\d+))?$/iu.exec(value ?? '');
	if (!match) return null;
	const start = Number(match[1]);
	const end = Number(match[2] ?? match[1]);
	return start > 0 && end >= start ? [start, end] : null;
}

export function parse_route(
	url: Pick<URL, 'pathname' | 'search' | 'hash'>,
): Route {
	const params = new URLSearchParams(url.search);
	const fragment = url.hash ? decode(url.hash.slice(1)) : null;
	if (
		url.pathname === '/' ||
		url.pathname === '/docs' ||
		url.pathname === '/docs/'
	) {
		return {
			name: 'docs',
			path: null,
			fragment,
			highlight: parse_line_range(params.get('lines')),
		};
	}
	if (url.pathname.startsWith('/docs/')) {
		const path = url.pathname
			.slice('/docs/'.length)
			.split('/')
			.map(decode)
			.join('/');
		return {
			name: 'docs',
			path,
			fragment,
			highlight: parse_line_range(params.get('lines')),
		};
	}
	if (url.pathname === '/search') {
		return { name: 'search', query: params.get('q') ?? '' };
	}
	if (
		url.pathname === '/health' ||
		url.pathname.startsWith('/health/')
	) {
		const tab = url.pathname.split('/')[2] ?? 'status';
		if (health_tabs.includes(tab as HealthTab) || tab === '') {
			return { name: 'health', tab: (tab || 'status') as HealthTab };
		}
	}
	return { name: 'not-found', pathname: url.pathname };
}

export function encode_doc_path(path: string): string {
	return path.split('/').map(encodeURIComponent).join('/');
}

// A search hit opens its section: the heading anchor when it has one,
// otherwise the first line, with the hit's lines highlighted.
export function hit_href(hit: {
	path: string;
	anchor: string | null;
	start_line: number;
	end_line: number;
}): string {
	const fragment = hit.anchor
		? encodeURIComponent(hit.anchor)
		: `L${hit.start_line}`;
	return `/docs/${encode_doc_path(hit.path)}?lines=${hit.start_line}-${hit.end_line}#${fragment}`;
}

// Whether a click on a link should be handled by the router rather
// than the browser.
export function is_app_navigation(
	event: Pick<
		MouseEvent,
		| 'button'
		| 'metaKey'
		| 'ctrlKey'
		| 'shiftKey'
		| 'altKey'
		| 'defaultPrevented'
	>,
	anchor: Pick<HTMLAnchorElement, 'target' | 'href' | 'hasAttribute'>,
	origin: string,
): boolean {
	if (event.defaultPrevented || event.button !== 0) return false;
	if (
		event.metaKey ||
		event.ctrlKey ||
		event.shiftKey ||
		event.altKey
	) {
		return false;
	}
	if (anchor.target || anchor.hasAttribute('download')) return false;
	let url: URL;
	try {
		url = new URL(anchor.href);
	} catch {
		return false;
	}
	return url.origin === origin && !url.pathname.startsWith('/api/');
}
