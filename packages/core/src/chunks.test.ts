import { describe, expect, it } from 'vite-plus/test';
import {
	chunk_markdown,
	chunk_plain_text,
	markdown_headings,
} from './chunks.js';

const filler = (word: string) => `${word} detail. `.repeat(20).trim();

describe('chunk_markdown', () => {
	it('splits by heading with breadcrumbs and exact line ranges', () => {
		const content = [
			'# Guide',
			'',
			filler('Intro'),
			'',
			'## Install',
			'',
			filler('Install'),
			'',
			'### Windows',
			'',
			filler('Windows'),
		].join('\n');

		const chunks = chunk_markdown(content, 'Guide');

		expect(
			chunks.map(({ heading, breadcrumb, start_line, end_line }) => ({
				heading,
				breadcrumb,
				start_line,
				end_line,
			})),
		).toEqual([
			{
				heading: 'Guide',
				breadcrumb: ['Guide'],
				start_line: 1,
				end_line: 3,
			},
			{
				heading: 'Install',
				breadcrumb: ['Guide', 'Install'],
				start_line: 5,
				end_line: 7,
			},
			{
				heading: 'Windows',
				breadcrumb: ['Guide', 'Install', 'Windows'],
				start_line: 9,
				end_line: 11,
			},
		]);
		expect(chunks[1]?.body).toBe(
			`## Install\n\n${filler('Install')}`,
		);
	});

	it('offsets line numbers past frontmatter', () => {
		const chunks = chunk_markdown(
			`# Title\n\n${filler('Body')}`,
			'T',
			4,
		);

		expect(chunks[0]).toMatchObject({ start_line: 5, end_line: 7 });
	});

	it('ignores headings inside code blocks', () => {
		const content = [
			'# Real',
			'',
			'```md',
			'# Not a heading',
			'```',
		].join('\n');

		expect(chunk_markdown(content, 'Real')).toHaveLength(1);
		expect(markdown_headings(content)).toEqual([
			{ text: 'Real', depth: 1, line: 1 },
		]);
	});

	it('merges small sections into their parent', () => {
		const content = [
			'# Parent',
			'',
			filler('Parent'),
			'',
			'## Tiny',
			'',
			'Short.',
		].join('\n');

		const chunks = chunk_markdown(content, 'Parent');

		expect(chunks).toHaveLength(1);
		expect(chunks[0]).toMatchObject({
			heading: 'Parent',
			start_line: 1,
			end_line: 7,
		});
	});

	it('joins a heading with no content to its first child', () => {
		const content = [
			'## Rules',
			'',
			'### Naming',
			'',
			filler('Naming'),
		].join('\n');

		expect(chunk_markdown(content, 'Doc')[0]).toMatchObject({
			heading: 'Naming',
			breadcrumb: ['Doc', 'Rules', 'Naming'],
			start_line: 1,
		});
	});

	it('splits very large sections at block boundaries', () => {
		const paragraphs = Array.from({ length: 12 }, (_, index) =>
			`Paragraph ${index}. ${'word '.repeat(80)}`.trim(),
		);
		const content = [
			'# Big',
			'',
			...paragraphs.flatMap((p) => [p, '']),
		]
			.join('\n')
			.trim();

		const chunks = chunk_markdown(content, 'Big');

		expect(chunks.length).toBeGreaterThan(1);
		expect(chunks.every((chunk) => chunk.heading === 'Big')).toBe(
			true,
		);
		for (const [index, chunk] of chunks.entries()) {
			const next = chunks[index + 1];
			if (next)
				expect(next.start_line).toBeGreaterThan(chunk.end_line);
		}
	});
});

describe('chunk_plain_text', () => {
	it('chunks text without headings into cited line ranges', () => {
		expect(
			chunk_plain_text('First line\nSecond line', 'notes'),
		).toEqual([
			{
				heading: null,
				depth: 0,
				breadcrumb: ['notes'],
				body: 'First line\nSecond line',
				start_line: 1,
				end_line: 2,
				sequence: 0,
			},
		]);
	});
});
