import type { DocumentSummary } from '@wiki0/core';
import { describe, expect, it } from 'vite-plus/test';
import { take_token } from './api.js';
import {
	count_by,
	graph_layout,
	lint_by_rule,
	score_breakdown,
	skyline,
	snippet_parts,
	token_histogram,
} from './chart-data.js';
import {
	ancestor_folders,
	build_tree,
	home_document,
} from './doc-tree.js';
import {
	hit_href,
	is_app_navigation,
	parse_line_range,
	parse_route,
} from './router.js';

function doc(path: string, title = path): DocumentSummary {
	return {
		path,
		title,
		kind: 'markdown',
		status: null,
		doc_type: null,
		date: null,
		aliases: [],
		supersedes: [],
		superseded_by: null,
		line_count: 1,
		headings: [],
		in_link_count: 0,
		out_link_count: 0,
	};
}

function url(href: string): URL {
	return new URL(href, 'http://127.0.0.1:4100');
}

describe('parse_route', () => {
	it('reads document paths, fragments and highlighted lines', () => {
		expect(
			parse_route(url('/docs/wiki/a%20b.md?lines=3-9#setup')),
		).toEqual({
			name: 'docs',
			path: 'wiki/a b.md',
			fragment: 'setup',
			highlight: [3, 9],
		});
		expect(parse_route(url('/'))).toMatchObject({
			name: 'docs',
			path: null,
		});
	});

	it('reads search and health routes', () => {
		expect(parse_route(url('/search?q=deploy+steps'))).toEqual({
			name: 'search',
			query: 'deploy steps',
		});
		expect(parse_route(url('/health'))).toEqual({
			name: 'health',
			tab: 'status',
		});
		expect(parse_route(url('/health/graph'))).toEqual({
			name: 'health',
			tab: 'graph',
		});
		expect(parse_route(url('/health/nope'))).toMatchObject({
			name: 'not-found',
		});
	});

	it('parses line ranges in the forms core uses', () => {
		expect(parse_line_range('L12-L40')).toEqual([12, 40]);
		expect(parse_line_range('12')).toEqual([12, 12]);
		expect(parse_line_range('40-12')).toBeNull();
		expect(parse_line_range('setup')).toBeNull();
	});
});

describe('hit_href', () => {
	it('prefers the heading anchor and highlights the hit lines', () => {
		expect(
			hit_href({
				path: 'docs/a.md',
				anchor: 'index-location',
				start_line: 18,
				end_line: 32,
			}),
		).toBe('/docs/docs/a.md?lines=18-32#index-location');
		expect(
			hit_href({
				path: 'docs/a.md',
				anchor: null,
				start_line: 1,
				end_line: 5,
			}),
		).toBe('/docs/docs/a.md?lines=1-5#L1');
	});
});

describe('is_app_navigation', () => {
	const click = {
		button: 0,
		metaKey: false,
		ctrlKey: false,
		shiftKey: false,
		altKey: false,
		defaultPrevented: false,
	};
	const anchor = (href: string, target = '') => ({
		href,
		target,
		hasAttribute: () => false,
	});
	const origin = 'http://127.0.0.1:4100';

	it('routes same-origin links in the app', () => {
		expect(
			is_app_navigation(click, anchor(`${origin}/docs/a.md`), origin),
		).toBe(true);
	});

	it('leaves external, new-tab, modified and API links alone', () => {
		expect(
			is_app_navigation(
				click,
				anchor('https://example.com/'),
				origin,
			),
		).toBe(false);
		expect(
			is_app_navigation(
				click,
				anchor(`${origin}/docs/a.md`, '_blank'),
				origin,
			),
		).toBe(false);
		expect(
			is_app_navigation(
				{ ...click, metaKey: true },
				anchor(`${origin}/docs/a.md`),
				origin,
			),
		).toBe(false);
		expect(
			is_app_navigation(click, anchor(`${origin}/api/lint`), origin),
		).toBe(false);
	});
});

describe('take_token', () => {
	it('moves the fragment token into storage and out of the URL', () => {
		const stored = new Map<string, string>();
		const storage = {
			getItem: (key: string) => stored.get(key) ?? null,
			setItem: (key: string, value: string) => stored.set(key, value),
		};
		let replaced = '';
		const token = take_token(
			{ hash: '#token=abc', pathname: '/docs/a.md', search: '?x=1' },
			storage,
			(next) => (replaced = next),
		);
		expect(token).toBe('abc');
		expect(replaced).toBe('/docs/a.md?x=1');
		expect(
			take_token(
				{ hash: '', pathname: '/', search: '' },
				storage,
				() => {},
			),
		).toBe('abc');
	});
});

describe('build_tree', () => {
	const documents = [
		doc('README.md', 'Project'),
		doc('docs/b.md', 'Beta'),
		doc('docs/a.md', 'Alpha'),
		doc('docs/adr/0001.md', 'First decision'),
	];

	it('nests folders first, then documents by name', () => {
		const tree = build_tree(documents);
		expect(tree.map((node) => node.name)).toEqual([
			'docs',
			'README.md',
		]);
		const docs = tree[0];
		expect(docs?.kind === 'folder' && docs.count).toBe(3);
		expect(
			docs?.kind === 'folder' &&
				docs.children.map((node) => node.name),
		).toEqual(['adr', 'a.md', 'b.md']);
	});

	it('filters by path, title or alias', () => {
		const tree = build_tree(documents, 'decision');
		expect(tree).toHaveLength(1);
		expect(tree[0]?.kind === 'folder' && tree[0].count).toBe(1);
	});

	it('lists the folders holding a path', () => {
		expect(ancestor_folders('docs/adr/0001.md')).toEqual([
			'docs',
			'docs/adr',
		]);
	});

	it('opens the README nearest the root at home', () => {
		expect(home_document(documents)?.path).toBe('README.md');
		expect(
			home_document([doc('z.md'), doc('docs/index.md')])?.path,
		).toBe('docs/index.md');
		expect(home_document([])).toBeNull();
	});
});

describe('chart data', () => {
	it('bins token counts with an open last bin', () => {
		const bins = token_histogram([0, 99, 100, 5000], [0, 100, 1000]);
		expect(bins.map((bin) => [bin.label, bin.count])).toEqual([
			['0–100', 2],
			['100–1000', 1],
			['1000+', 1],
		]);
	});

	it('counts values, most common first', () => {
		expect(count_by(['a', 'b', null, 'a'], (value) => value)).toEqual(
			[
				{ key: 'a', count: 2 },
				{ key: 'b', count: 1 },
				{ key: 'none', count: 1 },
			],
		);
	});

	it('groups lint issues by rule and severity', () => {
		const issue = (rule: string, severity: 'error' | 'info') => ({
			rule,
			severity,
			path: 'a.md',
			line: 1,
			message: '',
		});
		expect(
			lint_by_rule([
				issue('orphan-page', 'info'),
				issue('missing-file', 'error'),
				issue('orphan-page', 'info'),
			]),
		).toEqual([
			{
				rule: 'orphan-page',
				error: 0,
				warning: 0,
				info: 2,
				total: 2,
			},
			{
				rule: 'missing-file',
				error: 1,
				warning: 0,
				info: 0,
				total: 1,
			},
		]);
	});

	it('shows score multipliers as effects around neutral', () => {
		const parts = score_breakdown({
			text: 0.8,
			status: 1.2,
			type: 0.5,
			inlinks: 1,
			recency: 1,
			priority: 1,
		});
		expect(parts.find((part) => part.part === 'text')?.effect).toBe(
			0.8,
		);
		expect(
			parts.find((part) => part.part === 'status')?.effect,
		).toBeCloseTo(0.2);
		expect(parts.find((part) => part.part === 'type')?.effect).toBe(
			-0.5,
		);
	});

	it('keeps the largest documents for the skyline', () => {
		const chunk = (tokens: number) => ({
			start_line: 1,
			end_line: 2,
			citation: 'a.md:1-2',
			heading: null,
			depth: 0,
			breadcrumb: [],
			tokens,
		});
		const result = skyline(
			[
				{ path: 'small.md', title: 'S', chunks: [chunk(10)] },
				{
					path: 'big.md',
					title: 'B',
					chunks: [chunk(300), chunk(50)],
				},
				{ path: 'empty.md', title: 'E', chunks: [] },
			],
			1,
		);
		expect(result.paths).toEqual(['big.md']);
		expect(result.positions).toEqual([0, 1]);
		expect(result.max).toBe(300);
	});

	it('splits snippets at match ranges', () => {
		expect(snippet_parts('run the deploy', [[8, 14]])).toEqual([
			{ text: 'run the ', match: false },
			{ text: 'deploy', match: true },
		]);
	});
});

describe('graph_layout', () => {
	const graph = {
		nodes: [
			{
				path: 'docs/a.md',
				title: 'A',
				status: null,
				doc_type: 'spec',
				orphan: false,
			},
			{
				path: 'docs/b.md',
				title: 'B',
				status: null,
				doc_type: null,
				orphan: false,
			},
			{
				path: 'c.md',
				title: 'C',
				status: null,
				doc_type: null,
				orphan: true,
			},
		],
		edges: [
			{
				from: 'docs/a.md',
				to: 'docs/b.md',
				target: 'b.md',
				status: 'resolved',
			},
			{
				from: 'docs/a.md',
				to: 'docs/b.md',
				target: 'b.md#x',
				status: 'resolved',
			},
			{
				from: 'docs/a.md',
				to: '',
				target: 'gone.md',
				status: 'unresolved',
			},
		],
	};

	it('draws each link once and broken targets as their own node', () => {
		const layout = graph_layout(graph, {
			group_by: 'folder',
			show_unresolved: true,
			show_orphans: true,
		});
		expect(layout.links).toEqual([
			{ source: 'docs/a.md', target: 'docs/b.md', resolved: true },
			{
				source: 'docs/a.md',
				target: 'missing:gone.md',
				resolved: false,
			},
		]);
		expect(
			layout.nodes.find((node) => node.id === 'missing:gone.md'),
		).toMatchObject({
			missing: true,
		});
		expect(layout.groups).toEqual(['(root)', 'docs']);
	});

	it('hides broken links and orphans on request', () => {
		const layout = graph_layout(graph, {
			group_by: 'doc_type',
			show_unresolved: false,
			show_orphans: false,
		});
		expect(layout.nodes.map((node) => node.id)).toEqual([
			'docs/a.md',
			'docs/b.md',
		]);
		expect(layout.groups).toEqual(['none', 'spec']);
	});
});
