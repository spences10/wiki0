import type {
	FrontmatterValue,
	ParsedMarkdown,
	WikiFrontmatter,
	WikiLink,
} from './types.js';

export function parse_wikilinks(markdown: string): WikiLink[] {
	const links: WikiLink[] = [];
	const pattern = /(!?)\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/gu;
	const searchable_markdown = strip_inline_code(
		strip_fenced_code_blocks(parse_markdown(markdown).content),
	);

	for (const match of searchable_markdown.matchAll(pattern)) {
		const [, embed_marker, target, alias] = match;
		links.push({
			raw: match[0],
			target: target.trim(),
			alias: alias?.trim(),
			embed: embed_marker === '!',
		});
	}

	return links;
}

export function strip_fenced_code_blocks(markdown: string): string {
	return markdown.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1\s*$/gmu, '');
}

export function strip_inline_code(markdown: string): string {
	return markdown.replace(/`[^`\n]*`/gu, '');
}

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
	const frontmatter: WikiFrontmatter = {};
	let current_key: string | undefined;

	for (const raw_line of source.split(/\r?\n/u)) {
		const line = raw_line.trimEnd();
		if (line.trim().length === 0) continue;

		const list_match = line.match(/^\s*-\s+(.+)$/u);
		if (list_match && current_key) {
			const value = frontmatter[current_key];
			const values = Array.isArray(value)
				? value
				: value === undefined
					? []
					: [String(value)];
			values.push(
				String(parse_frontmatter_scalar(list_match[1] ?? '')),
			);
			frontmatter[current_key] = values;
			continue;
		}

		const pair_match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/u);
		if (!pair_match) continue;

		const [, key, value] = pair_match;
		current_key = key;
		frontmatter[key] =
			value.length > 0 ? parse_frontmatter_scalar(value) : [];
	}

	return frontmatter;
}

export function serialize_frontmatter(
	frontmatter: WikiFrontmatter,
): string {
	const lines = ['---'];

	for (const [key, value] of Object.entries(frontmatter)) {
		if (Array.isArray(value)) {
			lines.push(`${key}:`);
			for (const item of value) lines.push(`  - ${item}`);
			continue;
		}
		lines.push(`${key}: ${String(value)}`);
	}

	lines.push('---', '');
	return `${lines.join('\n')}\n`;
}

function parse_frontmatter_scalar(value: string): FrontmatterValue {
	const trimmed_value = value.trim();
	const unquoted_value = trimmed_value.replace(/^["']|["']$/gu, '');

	if (trimmed_value === 'true') return true;
	if (trimmed_value === 'false') return false;
	if (/^-?\d+(?:\.\d+)?$/u.test(trimmed_value))
		return Number(trimmed_value);
	if (trimmed_value.startsWith('[') && trimmed_value.endsWith(']')) {
		return trimmed_value
			.slice(1, -1)
			.split(',')
			.map((item) => item.trim().replace(/^["']|["']$/gu, ''))
			.filter((item) => item.length > 0);
	}
	return unquoted_value;
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
