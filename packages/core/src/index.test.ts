import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
	append_page,
	create_page,
	index_wiki,
	page_relative_path,
	page_title_from_markdown,
	parse_markdown,
	parse_wikilinks,
	read_page,
	search_wiki,
	set_page_frontmatter,
	slugify_title,
} from './index.js';

const temp_roots: string[] = [];

function make_wiki_root(): string {
	const root = mkdtempSync(join(tmpdir(), 'wiki0-core-'));
	mkdirSync(join(root, 'wiki'), { recursive: true });
	mkdirSync(join(root, '.wiki0'), { recursive: true });
	temp_roots.push(root);
	return root;
}

afterEach(() => {
	for (const root of temp_roots.splice(0)) {
		rmSync(root, { recursive: true, force: true });
	}
});

describe('slugify_title', () => {
	it('normalizes titles into URL-safe slugs', () => {
		expect(slugify_title(' Café Notes: Day 01! ')).toBe(
			'cafe-notes-day-01',
		);
	});
});

describe('page paths', () => {
	it('preserves slash-separated namespaces while slugifying parts', () => {
		expect(page_relative_path('Projects/Building wiki0')).toBe(
			'projects/building-wiki0.md',
		);
	});
});

describe('parse_markdown', () => {
	it('parses optional frontmatter at the start of the file', () => {
		const parsed = parse_markdown(`---
title: Front Title
tags:
  - dogfood
aliases: [Old Name, Other Name]
draft: false
count: 2
---
# Heading
`);

		expect(parsed.frontmatter).toEqual({
			title: 'Front Title',
			tags: ['dogfood'],
			aliases: ['Old Name', 'Other Name'],
			draft: false,
			count: 2,
		});
		expect(parsed.content).toBe('# Heading\n');
	});

	it('does not parse frontmatter away from byte start', () => {
		const markdown = `Intro
---
title: Ignored
---
`;

		expect(parse_markdown(markdown)).toEqual({
			frontmatter: {},
			content: markdown,
		});
	});
});

describe('page_title_from_markdown', () => {
	it('prefers frontmatter title over heading over fallback', () => {
		expect(
			page_title_from_markdown(
				'---\ntitle: Front\n---\n# Heading\n',
				'Fallback',
			),
		).toBe('Front');
		expect(page_title_from_markdown('# Heading\n', 'Fallback')).toBe(
			'Heading',
		);
		expect(page_title_from_markdown('Body only', 'Fallback')).toBe(
			'Fallback',
		);
	});
});

describe('parse_wikilinks', () => {
	it('parses wikilinks and aliases', () => {
		expect(
			parse_wikilinks(
				'See [[projects/wiki0|wiki zero]] and ![[assets/logo]].',
			),
		).toEqual([
			{
				raw: '[[projects/wiki0|wiki zero]]',
				target: 'projects/wiki0',
				alias: 'wiki zero',
				embed: false,
			},
			{
				raw: '![[assets/logo]]',
				target: 'assets/logo',
				embed: true,
			},
		]);
	});

	it('ignores links in frontmatter, fenced code blocks, and inline code', () => {
		const markdown = `---
title: Link Test
related: [[frontmatter-ignored]]
---
See [[real]].

\`[[inline-ignored]]\`

\`\`\`md
[[fenced-ignored]]
\`\`\`
`;

		expect(parse_wikilinks(markdown)).toEqual([
			{
				raw: '[[real]]',
				target: 'real',
				embed: false,
			},
		]);
	});
});

describe('index and search', () => {
	it('indexes Markdown pages into SQLite and searches content', () => {
		const root = make_wiki_root();
		create_page(
			'projects/wiki0',
			'SQLite search with [[topics/memory]].',
			{
				root,
			},
		);
		create_page(
			'topics/memory',
			'Agent memory should be inspectable.',
			{
				root,
			},
		);

		const result = index_wiki(root);
		expect(result.pageCount).toBe(2);
		expect(result.linkCount).toBe(1);

		const results = search_wiki('inspectable', root);
		expect(results).toEqual([
			expect.objectContaining({
				path: 'topics/memory.md',
				title: 'memory',
			}),
		]);
	});
});

describe('page IO', () => {
	it('creates, reads, and appends pages', () => {
		const root = make_wiki_root();
		const created = create_page(
			'projects/Building wiki0',
			'See [[interfaces/mcp]].',
			{
				root,
			},
		);

		expect(created.path).toBe('projects/building-wiki0.md');
		expect(created.title).toBe('Building wiki0');
		expect(created.links).toHaveLength(1);

		append_page(
			'projects/Building wiki0',
			'## Next\n\nAdd search.',
			root,
		);
		const read = read_page('projects/Building wiki0', root);

		expect(read.body).toContain('## Next');
		expect(
			readFileSync(
				join(root, 'wiki/projects/building-wiki0.md'),
				'utf-8',
			),
		).toBe(read.body);
	});

	it('sets and merges page frontmatter', () => {
		const root = make_wiki_root();
		create_page('interfaces/mcp', '# MCP\n\nAgent interface.', { root });

		const page = set_page_frontmatter(
			'interfaces/mcp',
			{
				title: 'MCP',
				aliases: ['MCP server', 'packages/mcp'],
				tags: ['interface', 'package'],
			},
			{ root },
		);

		expect(page.frontmatter).toEqual({
			title: 'MCP',
			aliases: ['MCP server', 'packages/mcp'],
			tags: ['interface', 'package'],
		});
		expect(page.content).toBe('# MCP\n\nAgent interface.\n');
		expect(page.body).toContain('aliases:\n  - MCP server\n');

		const merged = set_page_frontmatter(
			'interfaces/mcp',
			{ updated: '2026-05-28' },
			{ root, merge: true },
		);
		expect(merged.frontmatter.updated).toBe('2026-05-28');
		expect(merged.frontmatter.title).toBe('MCP');
	});

	it('returns parsed frontmatter and content when reading pages', () => {
		const root = make_wiki_root();
		create_page(
			'topics/frontmatter',
			'---\ntitle: Metadata\ntags: [pkm]\n---\n# Ignored heading\n\nBody.',
			{ root },
		);

		const page = read_page('topics/frontmatter', root);
		expect(page.title).toBe('Metadata');
		expect(page.frontmatter).toEqual({
			title: 'Metadata',
			tags: ['pkm'],
		});
		expect(page.content).toBe('# Ignored heading\n\nBody.\n');
	});
});
