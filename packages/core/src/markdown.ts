import { isMap, parseDocument } from 'yaml';
import type {
	FrontmatterValue,
	ParsedMarkdown,
	WikiFrontmatter,
} from './types.js';

export function parse_markdown(markdown: string): ParsedMarkdown {
	if (
		!markdown.startsWith('---\n') &&
		!markdown.startsWith('---\r\n')
	) {
		return { frontmatter: {}, content: markdown };
	}

	const match = markdown.match(
		/^---\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/u,
	);
	if (!match) return { frontmatter: {}, content: markdown };

	return {
		frontmatter: parse_frontmatter(match[1] ?? ''),
		content: markdown.slice(match[0].length),
	};
}

export function parse_frontmatter(source: string): WikiFrontmatter {
	const document = parseDocument(source, { prettyErrors: false });
	if (document.errors.length > 0) {
		throw new Error(
			`Invalid YAML frontmatter: ${document.errors[0]?.message}`,
		);
	}
	if (document.contents === null) return {};
	if (!isMap(document.contents)) {
		throw new Error('YAML frontmatter must be a mapping/object');
	}
	return normalize_frontmatter_value(
		document.toJSON(),
	) as WikiFrontmatter;
}

function normalize_frontmatter_value(
	value: unknown,
): FrontmatterValue {
	if (
		value === null ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	) {
		return value;
	}
	if (value instanceof Date) return value.toISOString();
	if (Array.isArray(value)) {
		return value.map((item) => normalize_frontmatter_value(item));
	}
	if (typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [
				key,
				normalize_frontmatter_value(item),
			]),
		);
	}
	return JSON.stringify(value) ?? null;
}

export function page_title_from_markdown(
	markdown: string,
	fallback: string,
): string {
	const parsed_markdown = parse_markdown(markdown);
	const frontmatter_title = parsed_markdown.frontmatter.title;
	if (
		typeof frontmatter_title === 'string' &&
		frontmatter_title.length > 0
	) {
		return frontmatter_title;
	}

	const heading = parsed_markdown.content
		.match(/^#\s+(.+)$/mu)?.[1]
		?.trim();
	return heading && heading.length > 0 ? heading : fallback;
}
