import { describe, expect, it } from 'vite-plus/test';
import {
	page_title_from_markdown,
	parse_markdown,
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
nested:
  owner: agent
---
# Heading
`);

		expect(parsed.frontmatter).toEqual({
			title: 'Front Title',
			tags: ['dogfood'],
			aliases: ['Old Name', 'Other Name'],
			draft: false,
			count: 2,
			nested: { owner: 'agent' },
		});
		expect(parsed.content).toBe('# Heading\n');
	});

	it('throws for invalid YAML frontmatter', () => {
		expect(() =>
			parse_markdown('---\ntitle: [broken\n---\n# Heading\n'),
		).toThrow('Invalid YAML frontmatter');
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
