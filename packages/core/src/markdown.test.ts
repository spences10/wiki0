import { describe, expect, it } from 'vitest';
import {
	page_title_from_markdown,
	parse_markdown,
	parse_wikilinks,
} from './markdown.js';

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
