import { describe, expect, it } from 'vite-plus/test';
import {
	create_wikilink_pattern,
	extract_anchors,
	extract_links,
	link_resolver,
	type LinkTargetDocument,
} from './links.js';

describe('extract_links', () => {
	it('finds every link style with its line, skipping code', () => {
		const content = [
			'# Doc',
			'',
			'A [md](./a.md#part) and [[Wiki Page|alias]] and ![[pic.png]].',
			'',
			'`[not](code.md)` and [ref][r]',
			'',
			'```',
			'[[also not]]',
			'```',
			'',
			'- list [[In List]]',
			'',
			'<a href="html.md">x</a> ![img](img.png) [x][missing]',
			'',
			'[r]: ./ref.md',
		].join('\n');

		expect(
			extract_links(content).map(({ kind, line, target, alias }) => ({
				kind,
				line,
				target,
				alias,
			})),
		).toEqual([
			{
				kind: 'markdown',
				line: 3,
				target: './a.md#part',
				alias: null,
			},
			{
				kind: 'wikilink',
				line: 3,
				target: 'Wiki Page',
				alias: 'alias',
			},
			{ kind: 'embed', line: 3, target: 'pic.png', alias: null },
			{ kind: 'markdown', line: 5, target: './ref.md', alias: null },
			{ kind: 'wikilink', line: 11, target: 'In List', alias: null },
			{ kind: 'html', line: 13, target: 'html.md', alias: null },
			{ kind: 'embed', line: 13, target: 'img.png', alias: null },
			{ kind: 'reference', line: 13, target: 'missing', alias: null },
		]);
	});

	it('reads wikilinks from frontmatter values', () => {
		expect(
			extract_links('# Doc', 0, { related: ['[[Other]]'] }),
		).toEqual([
			expect.objectContaining({
				kind: 'frontmatter',
				target: 'Other',
			}),
		]);
	});
});

describe('create_wikilink_pattern', () => {
	it('matches the wikilinks core indexes, with a fresh lastIndex', () => {
		const text =
			'See [[Page|alias]] and ![[pic.png]] and [not](x.md).';
		const matches = [...text.matchAll(create_wikilink_pattern())];

		expect(
			matches.map((match) => [match[1], match[2], match[3]]),
		).toEqual([
			['', 'Page', 'alias'],
			['!', 'pic.png', undefined],
		]);
		expect(create_wikilink_pattern().lastIndex).toBe(0);
	});
});

describe('extract_anchors', () => {
	it('uses GitHub slugs with duplicate suffixes', () => {
		const content = [
			'# Getting Started!',
			'## Install',
			'## Install',
			'## `config.toml` options',
			'Paragraph ^note-1',
			'<a id="custom"></a>',
		].join('\n\n');

		expect(
			extract_anchors(content).map(
				({ kind, slug }) => `${kind}:${slug}`,
			),
		).toEqual([
			'heading:getting-started',
			'heading:install',
			'heading:install-1',
			'heading:configtoml-options',
			'block:note-1',
			'html:custom',
		]);
	});
});

describe('link_resolver', () => {
	const doc = (
		path: string,
		extra: Partial<LinkTargetDocument> = {},
	): LinkTargetDocument => ({
		path,
		title: path.split('/').at(-1)?.replace('.md', '') ?? path,
		aliases: [],
		anchors: [],
		line_count: 20,
		...extra,
	});
	const documents = [
		doc('docs/guide.md', {
			anchors: [
				{
					kind: 'heading',
					slug: 'install',
					text: 'Install',
					depth: 2,
					line: 3,
				},
				{ kind: 'block', slug: 'b1', text: 'b1', depth: 0, line: 5 },
			],
		}),
		doc('docs/adr/README.md'),
		doc('notes/todo.md'),
		doc('archive/todo.md'),
		doc('notes/Mixed.md', { aliases: ['the mix'] }),
	];
	const resolve = link_resolver(documents, [
		'assets/logo.png',
		...documents.map((d) => d.path),
	]);
	const md = (target: string) => ({
		kind: 'markdown' as const,
		line: 1,
		raw: `[x](${target})`,
		target,
		alias: null,
	});
	const wiki = (target: string) => ({
		kind: 'wikilink' as const,
		line: 1,
		raw: `[[${target}]]`,
		target,
		alias: null,
	});

	it.each([
		['./guide.md#install', 'resolved', 'docs/guide.md', 'install'],
		['guide#install', 'resolved', 'docs/guide.md', 'install'],
		[
			'/docs/guide.md#Install',
			'resolved',
			'docs/guide.md',
			'install',
		],
		['./guide.md#L4-L6', 'resolved', 'docs/guide.md', 'L4-L6'],
		['./guide.md#L40', 'line-out-of-range', 'docs/guide.md', null],
		['./guide.md#^b1', 'resolved', 'docs/guide.md', '^b1'],
		['./guide.md#nope', 'missing-heading', 'docs/guide.md', null],
		['./adr', 'resolved', 'docs/adr/README.md', null],
		['../assets/logo.png', 'resolved', 'assets/logo.png', null],
		['../../outside.md', 'outside-root', null, null],
		['./missing.md', 'missing-file', 'docs/missing.md', null],
		['https://example.com/x.md', 'external', null, null],
		['/contact', 'external', null, null],
		['/docs/missing.md', 'missing-file', 'docs/missing.md', null],
		['#install', 'resolved', 'docs/guide.md', 'install'],
	])(
		'markdown %s from docs/guide.md',
		(target, status, to_path, to_anchor) => {
			expect(resolve('docs/guide.md', md(target))).toMatchObject({
				status,
				to_path,
				to_anchor,
			});
		},
	);

	it('flags case-insensitive matches', () => {
		expect(
			resolve('docs/guide.md', md('../notes/mixed.md')),
		).toMatchObject({
			status: 'resolved',
			to_path: 'notes/Mixed.md',
			quality: 'case-insensitive',
		});
	});

	it('resolves wikilinks by path, suffix, title and alias', () => {
		expect(
			resolve('docs/guide.md', wiki('docs/guide')),
		).toMatchObject({
			to_path: 'docs/guide.md',
		});
		expect(
			resolve('docs/guide.md', wiki('guide#Install')),
		).toMatchObject({
			to_path: 'docs/guide.md',
			to_anchor: 'install',
		});
		expect(resolve('docs/guide.md', wiki('the mix'))).toMatchObject({
			to_path: 'notes/Mixed.md',
		});
	});

	it('reports ambiguous wikilinks and prefers the same folder', () => {
		expect(resolve('notes/index.md', wiki('todo'))).toMatchObject({
			status: 'ambiguous',
			to_path: 'notes/todo.md',
			candidates: ['archive/todo.md', 'notes/todo.md'],
		});
	});
});
