import {
	index_wiki,
	list_documents,
	list_links,
	read_document,
	wikilink_pattern_source,
} from '@wiki0/core';
import { describe, expect, it } from 'vite-plus/test';
import { make_temp_dir, write_file } from '../../../../test-utils.js';
import { handle_copy_click } from './code-block.js';
import { highlight_code } from './highlighter.js';
import { render_document } from './render.js';

const guide = `---
title: Guide
status: accepted
---

# Guide

Start with [setup](setup.md#install), then [[setup|the setup page]]
and [[old]].

## Usage

- Install from [the setup page](./setup.md).
- Read <a href="setup.md#install">install</a> too.

| Doc | Link |
| --- | ---- |
| Setup | [setup](setup.md) |

![[diagram.png]]

![A diagram](diagram.png)

<img src="diagram.png" alt="inline diagram">

See [missing](missing.md), [bad anchor](setup.md#nope) and
[[nowhere]].

External: [example](https://example.com) and a [route](/contact).

\`\`\`ts {2}
// [not a link](setup.md)
const value = 42;
\`\`\`

## Usage

The second usage heading gets its own slug.
`;

async function render_fixture(path = 'docs/guide.md') {
	const root = make_temp_dir('wiki0-ui-render-');
	write_file(root, 'wiki0.toml', '');
	write_file(root, 'docs/guide.md', guide);
	write_file(
		root,
		'docs/setup.md',
		'# Setup\n\n## Install\n\nRun it.\n',
	);
	write_file(
		root,
		'docs/old.md',
		'---\nsuperseded_by: docs/setup.md\n---\n\n# Old\n\nGone.\n',
	);
	write_file(root, 'docs/diagram.png', Buffer.from([0x89, 0x50]));
	await index_wiki(root);

	const document = read_document(path, root)!;
	const links = list_links(path, root)!;
	const documents = list_documents(root);
	const headings =
		documents.find((summary) => summary.path === path)?.headings ??
		[];
	const result = render_document(
		{
			path,
			markdown: document.markdown,
			body_start_line: document.body_start_line,
		},
		{
			links,
			headings,
			documents: new Set(documents.map((summary) => summary.path)),
			wikilink_pattern_source,
			highlight: highlight_code,
		},
	);
	return { ...result, document, links, headings };
}

describe('render_document', () => {
	it('matches every link record core extracted', async () => {
		const { unmatched, links } = await render_fixture();
		expect(links.length).toBeGreaterThan(10);
		expect(unmatched).toEqual([]);
	});

	it('routes resolved links to the target doc and anchor', async () => {
		const { html } = await render_fixture();
		expect(html).toContain(
			'<a href="/docs/docs/setup.md#install" data-wiki0-link>setup</a>',
		);
		expect(html).toContain(
			'<a href="/docs/docs/setup.md" data-wiki0-link>the setup page</a>',
		);
		expect(html).toContain(
			'<a href="/docs/docs/old.md" data-wiki0-link>old</a>',
		);
	});

	it('rewrites links in lists, tables and raw HTML', async () => {
		const { html } = await render_fixture();
		expect(html).toMatch(
			/<li>Install from <a href="\/docs\/docs\/setup\.md" data-wiki0-link>/u,
		);
		expect(html).toContain(
			'<td><a href="/docs/docs/setup.md" data-wiki0-link>setup</a></td>',
		);
		expect(html).toContain(
			'<a data-wiki0-link href="/docs/docs/setup.md#install">install</a>',
		);
	});

	it('shows unresolved links as broken with the lint reason', async () => {
		const { html } = await render_fixture();
		expect(html).toMatch(
			/<span class="wiki0-broken" title="[^"]*missing\.md[^"]*" data-rule="missing-file">missing<\/span>/u,
		);
		expect(html).toMatch(
			/<span class="wiki0-broken"[^>]*data-rule="missing-heading">bad anchor<\/span>/u,
		);
		expect(html).toMatch(
			/<span class="wiki0-broken"[^>]*>nowhere<\/span>/u,
		);
	});

	it('loads images through the asset endpoint, never by src', async () => {
		const { html } = await render_fixture();
		expect(html).toContain(
			'<img data-wiki0-asset="docs/diagram.png" alt="A diagram" loading="lazy">',
		);
		expect(html).toContain(
			'<img data-wiki0-asset="docs/diagram.png" alt="diagram.png" loading="lazy">',
		);
		expect(html).toMatch(
			/<img data-line="\d+" data-end-line="\d+" data-wiki0-asset="docs\/diagram\.png" alt="inline diagram">/u,
		);
		expect(html).not.toMatch(/<img[^>]*\ssrc=/u);
	});

	it('opens external links in a new tab and marks site routes', async () => {
		const { html } = await render_fixture();
		expect(html).toContain(
			'<a href="https://example.com" target="_blank" rel="noopener noreferrer">example</a>',
		);
		expect(html).toContain(
			'<span class="wiki0-route" title="Site route: /contact">route</span>',
		);
	});

	it('uses core slugs for heading ids, including repeats', async () => {
		const { html, headings } = await render_fixture();
		expect(headings.map((heading) => heading.slug)).toEqual([
			'guide',
			'usage',
			'usage-1',
		]);
		for (const slug of ['guide', 'usage', 'usage-1']) {
			expect(html).toContain(`id="${slug}"`);
		}
	});

	it('tags each block with its file lines', async () => {
		const { html, document } = await render_fixture();
		const source_lines = document.source.split('\n');
		const heading_line = source_lines.indexOf('# Guide') + 1;
		expect(html).toContain(
			`<h1 data-line="${heading_line}" data-end-line="${heading_line}"`,
		);
		const fence_line = source_lines.indexOf('```ts {2}') + 1;
		expect(html).toContain(
			`<div data-line="${fence_line}" data-end-line="${fence_line + 3}" class="not-prose code-block`,
		);
	});

	it('highlights code blocks with a label and copy button', async () => {
		const { html } = await render_fixture();
		expect(html).toContain('TypeScript</span>');
		expect(html).toContain('data-copy-code');
		expect(html).toContain('l highlight');
		expect(html).toContain('<span class="tok keyword">const</span>');
		expect(html).not.toContain('href="setup.md"');
	});
});

describe('highlight_code', () => {
	it('labels aliases and falls back to plain text', () => {
		expect(highlight_code('a: 1', 'yml').label).toBe('YAML');
		const plain = highlight_code('<script>x</script>', 'nope');
		expect(plain.html).toContain('&lt;script&gt;');
		expect(plain.html).not.toContain('<script>');
		expect(highlight_code('x', '').label).toBe('');
	});

	it('drops fence meta that points past the last line', () => {
		const result = highlight_code('one line', 'ts {9}');
		expect(result.html).toContain('language-ts');
		expect(result.html).not.toContain('highlight');
	});
});

describe('handle_copy_click', () => {
	function fake_block() {
		const attributes = new Map<string, string>();
		const icons = {
			copy: new Set<string>(),
			check: new Set<string>(['hidden']),
		};
		const icon = (name: 'copy' | 'check') => ({
			toggleAttribute: (attribute: string, force: boolean) =>
				force
					? icons[name].add(attribute)
					: icons[name].delete(attribute),
			removeAttribute: (attribute: string) =>
				icons[name].delete(attribute),
			setAttribute: (attribute: string) => icons[name].add(attribute),
		});
		const status = { textContent: '' };
		const button = {
			closest: (selector: string) =>
				selector === '.code-block' ? block : null,
			setAttribute: (name: string, value: string) =>
				attributes.set(name, value),
			querySelector: (selector: string) =>
				selector.includes('copy') ? icon('copy') : icon('check'),
		};
		const block = {
			querySelector: (selector: string) =>
				selector === 'pre code'
					? { textContent: 'const a = 1;' }
					: selector === '[data-copy-status]'
						? status
						: null,
		};
		const target = {
			closest: (selector: string) =>
				selector === '[data-copy-code]' ? button : null,
		};
		return { target, status, attributes, icons };
	}

	it('copies the block code and confirms', async () => {
		const copied: string[] = [];
		const block = fake_block();
		await handle_copy_click(
			{ target: block.target as unknown as EventTarget },
			async (text) => {
				copied.push(text);
			},
		);
		expect(copied).toEqual(['const a = 1;']);
		expect(block.status.textContent).toBe('Copied');
		expect(block.icons.copy.has('hidden')).toBe(true);
		expect(block.icons.check.has('hidden')).toBe(false);
	});

	it('reports a failed copy', async () => {
		const block = fake_block();
		await handle_copy_click(
			{ target: block.target as unknown as EventTarget },
			async () => {
				throw new Error('denied');
			},
		);
		expect(block.status.textContent).toBe('Copy failed');
	});

	it('ignores clicks outside a copy button', async () => {
		let called = false;
		await handle_copy_click({ target: null }, async () => {
			called = true;
		});
		expect(called).toBe(false);
	});
});
