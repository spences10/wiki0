import { Lexer, type Token, type Tokens } from 'marked';

export type DocumentChunk = {
	heading: string | null;
	depth: number;
	breadcrumb: string[];
	body: string;
	start_line: number;
	end_line: number;
	sequence: number;
};

export type HeadingInfo = {
	text: string;
	depth: number;
	line: number;
};

// Sections smaller than this merge into the section above them.
const min_chunk_tokens = 60;
// Sections larger than this split at block boundaries.
const max_chunk_tokens = 800;
const split_target_tokens = 600;

export type Block = {
	token: Token;
	start_line: number;
	end_line: number;
	raw: string;
};

type Section = {
	heading: string | null;
	depth: number;
	breadcrumb: string[];
	blocks: Block[];
	start_line: number;
};

export function estimate_tokens(text: string): number {
	return Math.ceil(text.length / 4);
}

// Splits Markdown into heading sections with 1-based line ranges.
// `line_offset` is the number of lines before `content` in the file
// (frontmatter), so ranges point at the real file lines.
export function chunk_markdown(
	content: string,
	title: string,
	line_offset = 0,
): DocumentChunk[] {
	const blocks = lex_blocks(content, line_offset);
	const sections = group_sections(blocks, title, line_offset);
	const merged = merge_small_sections(sections);
	const lines = content.replace(/\r\n?/gu, '\n').split('\n');
	return merged
		.flatMap((section) =>
			split_large_section(section).map((chunk) => ({
				...chunk,
				// Exact source lines, so show returns what the file says.
				body: lines
					.slice(
						chunk.start_line - 1 - line_offset,
						chunk.end_line - line_offset,
					)
					.join('\n')
					.trim(),
			})),
		)
		.map((chunk, sequence) => ({ ...chunk, sequence }));
}

export function markdown_headings(
	content: string,
	line_offset = 0,
): HeadingInfo[] {
	return lex_blocks(content, line_offset)
		.filter((block) => block.token.type === 'heading')
		.map((block) => ({
			text: heading_text(block.token as Tokens.Heading),
			depth: (block.token as Tokens.Heading).depth,
			line: block.start_line,
		}));
}

// Plain-text chunks for documents without headings (txt, pdf, docx).
export function chunk_plain_text(
	text: string,
	title: string,
): DocumentChunk[] {
	const lines = text.split('\n');
	const chunks: DocumentChunk[] = [];
	let start = 0;
	let size = 0;
	for (let index = 0; index < lines.length; index += 1) {
		size += estimate_tokens(lines[index] ?? '') + 1;
		const at_paragraph_break = (lines[index + 1] ?? '').trim() === '';
		const is_last = index === lines.length - 1;
		if (
			is_last ||
			(size >= split_target_tokens && at_paragraph_break)
		) {
			const body = lines
				.slice(start, index + 1)
				.join('\n')
				.trim();
			if (body) {
				chunks.push({
					heading: null,
					depth: 0,
					breadcrumb: [title],
					body,
					start_line: start + 1,
					end_line: index + 1,
					sequence: chunks.length,
				});
			}
			start = index + 1;
			size = 0;
		}
	}
	return chunks;
}

export function lex_blocks(
	content: string,
	line_offset: number,
): Block[] {
	const source = content.replace(/\r\n?/gu, '\n');
	const blocks: Block[] = [];
	let cursor = 0;
	let line = line_offset + 1;
	for (const token of Lexer.lex(source)) {
		const found_at = source.indexOf(token.raw, cursor);
		if (found_at > cursor) {
			line += count_newlines(source.slice(cursor, found_at));
		}
		if (found_at >= 0) cursor = found_at + token.raw.length;
		const start_line = line;
		const newlines = count_newlines(token.raw);
		line += newlines;
		if (token.type === 'space') continue;
		const trailing = token.raw.endsWith('\n') ? 1 : 0;
		blocks.push({
			token,
			start_line,
			end_line: Math.max(
				start_line,
				start_line + newlines - trailing,
			),
			raw: token.raw,
		});
	}
	return blocks;
}

function group_sections(
	blocks: Block[],
	title: string,
	line_offset: number,
): Section[] {
	const sections: Section[] = [];
	const stack: { text: string; depth: number }[] = [];
	let current: Section = {
		heading: null,
		depth: 0,
		breadcrumb: [title],
		blocks: [],
		start_line: line_offset + 1,
	};

	for (const block of blocks) {
		if (block.token.type !== 'heading') {
			current.blocks.push(block);
			continue;
		}
		if (current.blocks.length > 0 || current.heading !== null) {
			sections.push(current);
		}
		const heading = block.token as Tokens.Heading;
		const text = heading_text(heading);
		while ((stack.at(-1)?.depth ?? 0) >= heading.depth) stack.pop();
		stack.push({ text, depth: heading.depth });
		current = {
			heading: text,
			depth: heading.depth,
			breadcrumb: breadcrumb_for(title, stack),
			blocks: [block],
			start_line: block.start_line,
		};
	}
	if (current.blocks.length > 0) sections.push(current);
	return sections;
}

// A document's H1 usually repeats its title, so it is not repeated in
// the breadcrumb.
function breadcrumb_for(
	title: string,
	stack: { text: string; depth: number }[],
): string[] {
	const names = stack.map((entry) => entry.text);
	if (names[0] === title) names.shift();
	return [title, ...names];
}

function merge_small_sections(sections: Section[]): Section[] {
	const merged: Section[] = [];
	let pending_heading: Block[] = [];
	for (const [index, current] of sections.entries()) {
		const next = sections[index + 1];
		// A heading with no content of its own joins its first child.
		if (
			current.blocks.length === 1 &&
			current.heading !== null &&
			next &&
			next.depth > current.depth
		) {
			pending_heading.push(...current.blocks);
			continue;
		}
		const section =
			pending_heading.length > 0
				? {
						...current,
						blocks: [...pending_heading, ...current.blocks],
						start_line:
							pending_heading[0]?.start_line ?? current.start_line,
					}
				: current;
		pending_heading = [];
		const previous = merged.at(-1);
		const is_small =
			estimate_tokens(section_text(section)) < min_chunk_tokens;
		if (previous && is_small && previous.depth < section.depth) {
			previous.blocks.push(...section.blocks);
			continue;
		}
		merged.push(section);
	}
	return merged;
}

function split_large_section(section: Section): DocumentChunk[] {
	const parts: Block[][] = [];
	let part: Block[] = [];
	let size = 0;
	for (const block of section.blocks) {
		const block_size = estimate_tokens(block.raw);
		if (
			part.length > 0 &&
			size + block_size > split_target_tokens &&
			estimate_tokens(section_text(section)) > max_chunk_tokens
		) {
			parts.push(part);
			part = [];
			size = 0;
		}
		part.push(block);
		size += block_size;
	}
	if (part.length > 0) parts.push(part);

	return parts.map((blocks) => ({
		heading: section.heading,
		depth: section.depth,
		breadcrumb: section.breadcrumb,
		body: '',
		start_line: blocks[0]?.start_line ?? section.start_line,
		end_line: blocks.at(-1)?.end_line ?? section.start_line,
		sequence: 0,
	}));
}

function section_text(section: Section): string {
	return section.blocks.map((block) => block.raw).join('\n');
}

export function heading_text(heading: Tokens.Heading): string {
	return inline_text(heading.tokens).trim();
}

function inline_text(tokens: Token[] | undefined): string {
	if (!tokens) return '';
	return tokens
		.map((token) => {
			if ('tokens' in token && Array.isArray(token.tokens)) {
				return inline_text(token.tokens);
			}
			if (token.type === 'codespan') return token.text;
			if (token.type === 'html') return '';
			return 'text' in token ? String(token.text) : '';
		})
		.join('');
}

function count_newlines(text: string): number {
	let count = 0;
	for (const character of text) if (character === '\n') count += 1;
	return count;
}
