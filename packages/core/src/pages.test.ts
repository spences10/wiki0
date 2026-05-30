import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	append_page,
	create_page,
	read_page,
	set_page_frontmatter,
} from './pages.js';
import { make_wiki_root } from './test-utils.js';

describe('page IO', () => {
	it('creates, reads, and appends pages', () => {
		const root = make_wiki_root();
		const created = create_page(
			'projects/Building wiki0',
			'See [[interfaces/mcp]].',
			{ root },
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
		create_page('interfaces/mcp', '# MCP\n\nAgent interface.', {
			root,
		});

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

	it('resolves pages by frontmatter title and alias', () => {
		const root = make_wiki_root();
		create_page(
			'packages/core',
			'---\ntitle: Core package\naliases: ["@wiki0/core"]\n---\n# Core\n',
			{ root },
		);

		expect(read_page('Core package', root).path).toBe(
			'packages/core.md',
		);
		expect(read_page('@wiki0/core', root).path).toBe(
			'packages/core.md',
		);
	});
});
