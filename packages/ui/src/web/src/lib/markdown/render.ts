import type { DocumentHeading, DocumentLink } from '@wiki0/core';
import { Marked, type Token, type Tokens } from 'marked';
import { render_code_block } from './code-block.js';
import type { HighlightedCode } from './highlighter.js';
import { escape_html } from './html.js';

export type RenderInput = {
	// The indexed path of the document being rendered.
	path: string;
	// Body text after the frontmatter and its first line in the file,
	// from core's `read_document`.
	markdown: string;
	body_start_line: number;
};

export type RenderContext = {
	// Core's link records for this document, in source order.
	links: DocumentLink[];
	// Core's headings for this document, with their GitHub slugs.
	headings: DocumentHeading[];
	// Indexed document paths; resolved links to other files are shown
	// as file references rather than routes.
	documents: ReadonlySet<string>;
	// Core's `wikilink_pattern_source`, served by /api/meta.
	wikilink_pattern_source: string;
	highlight?: (code: string, info: string) => HighlightedCode;
};

export type RenderResult = {
	html: string;
	// Link records no rendered link was matched to; a non-empty list
	// means rendering and core disagree about where a link is.
	unmatched: DocumentLink[];
};

const image_extensions = /\.(?:png|jpe?g|gif|webp|avif|svg)$/iu;
const external_href = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/iu;

export function doc_route(
	path: string,
	anchor?: string | null,
): string {
	const encoded = path.split('/').map(encodeURIComponent).join('/');
	return `/docs/${encoded}${anchor ? `#${encodeURIComponent(anchor)}` : ''}`;
}

function count_newlines(text: string): number {
	let count = 0;
	for (const character of text) if (character === '\n') count += 1;
	return count;
}

type Block = { token: Token; start_line: number; end_line: number };

// Top-level blocks with their file line ranges, counted the same way
// core counts them when it records link and heading lines.
function blocks_with_lines(
	tokens: Token[],
	source: string,
	first_line: number,
): Block[] {
	const blocks: Block[] = [];
	let cursor = 0;
	let line = first_line;
	for (const token of tokens) {
		const found_at = source.indexOf(token.raw, cursor);
		if (found_at > cursor) {
			line += count_newlines(source.slice(cursor, found_at));
		}
		if (found_at >= 0) cursor = found_at + token.raw.length;
		const start_line = line;
		const newlines = count_newlines(token.raw);
		line += newlines;
		const trailing = token.raw.endsWith('\n') ? 1 : 0;
		blocks.push({
			token,
			start_line,
			end_line: Math.max(
				start_line,
				start_line + newlines - trailing,
			),
		});
	}
	return blocks;
}

// Adds attributes to the first element of a rendered block, or wraps
// it when the block does not start with an element.
function tag_first_element(html: string, attributes: string): string {
	const match = /^(\s*<[a-zA-Z][\w-]*)/u.exec(html);
	if (!match) return `<div${attributes}>${html}</div>`;
	return `${match[1]}${attributes}${html.slice(match[1]!.length)}`;
}

function title_for(link: DocumentLink): string {
	const rule = link.rule ?? link.link_status;
	const parts = [link.message ?? `${rule}: ${link.target}`];
	if (link.suggestions.length > 0) {
		parts.push(`Did you mean ${link.suggestions.join(', ')}?`);
	}
	return parts.join(' ');
}

/**
 * Renders a document's Markdown to HTML for `{@html}`. Links are not
 * parsed or resolved here: each link token is matched to core's
 * record for the same line and source text, and the record decides
 * where it goes. Headings take core's slugs, and every top-level
 * block carries `data-line` so line links and search hits land on
 * the right block.
 */
export function render_document(
	input: RenderInput,
	context: RenderContext,
): RenderResult {
	const consumed = new Set<number>();
	const wikilink = new RegExp(
		`^(?:${context.wikilink_pattern_source})`,
		'u',
	);
	let block: Block = {
		token: { type: 'space', raw: '' },
		start_line: input.body_start_line,
		end_line: input.body_start_line,
	};

	// The next unconsumed record in this block with the same source.
	function take(raw: string, kinds: string[]): DocumentLink | null {
		for (const [index, link] of context.links.entries()) {
			if (consumed.has(index)) continue;
			if (
				link.line < block.start_line ||
				link.line > block.end_line
			) {
				continue;
			}
			if (!kinds.includes(link.kind) || link.raw_text !== raw)
				continue;
			consumed.add(index);
			return link;
		}
		return null;
	}

	function asset_html(link: DocumentLink, alt: string): string {
		return `<img data-wiki0-asset="${escape_html(link.to ?? '')}" alt="${escape_html(alt)}" loading="lazy">`;
	}

	function broken_html(link: DocumentLink, inner: string): string {
		return `<span class="wiki0-broken" title="${escape_html(title_for(link))}" data-rule="${escape_html(link.rule ?? link.link_status)}">${inner}</span>`;
	}

	// Where a resolved link goes: an in-app route for indexed docs, a
	// file reference for anything else core resolved inside the root.
	function resolved_html(link: DocumentLink, inner: string): string {
		const to = link.to ?? '';
		if (!context.documents.has(to)) {
			return `<span class="wiki0-file" title="${escape_html(`File: ${to}`)}">${inner}</span>`;
		}
		return `<a href="${escape_html(doc_route(to, link.to_anchor))}" data-wiki0-link>${inner}</a>`;
	}

	function link_html(
		link: DocumentLink | null,
		href: string,
		inner: string,
		title?: string | null,
	): string {
		const title_attribute = title
			? ` title="${escape_html(title)}"`
			: '';
		if (!link) {
			// Core stores every link it can resolve, so a link with no
			// record is external or a website route.
			if (external_href.test(href)) {
				return `<a href="${escape_html(href)}"${title_attribute} target="_blank" rel="noopener noreferrer">${inner}</a>`;
			}
			return `<span class="wiki0-route" title="${escape_html(`Site route: ${href}`)}">${inner}</span>`;
		}
		if (link.link_status !== 'resolved')
			return broken_html(link, inner);
		return resolved_html(link, inner);
	}

	function image_html(
		link: DocumentLink | null,
		href: string,
		alt: string,
	): string {
		if (!link) {
			// The CSP allows remote images over https only; anything
			// else becomes a link.
			if (/^https:\/\//iu.test(href)) {
				return `<img src="${escape_html(href)}" alt="${escape_html(alt)}" loading="lazy" referrerpolicy="no-referrer">`;
			}
			return `<a href="${escape_html(href)}" target="_blank" rel="noopener noreferrer" class="wiki0-remote-image">${escape_html(alt || href)}</a>`;
		}
		if (link.link_status !== 'resolved') {
			return broken_html(link, escape_html(alt || link.target));
		}
		if (image_extensions.test(link.to ?? '')) {
			return asset_html(link, alt);
		}
		return resolved_html(link, escape_html(alt || link.target));
	}

	// Rewrites `<a href>` and `<img src>` in raw HTML from the records
	// core extracted for them; their raw text is the tag up to and
	// including the attribute.
	function rewrite_html(html: string): string {
		let output = '';
		let cursor = 0;
		for (const [index, link] of context.links.entries()) {
			if (consumed.has(index) || link.kind !== 'html') continue;
			if (
				link.line < block.start_line ||
				link.line > block.end_line
			) {
				continue;
			}
			const at = html.indexOf(link.raw_text, cursor);
			if (at < 0) continue;
			consumed.add(index);
			output += html.slice(cursor, at) + rewrite_tag(link);
			cursor = at + link.raw_text.length;
		}
		return output + html.slice(cursor);
	}

	function rewrite_tag(link: DocumentLink): string {
		const raw = link.raw_text;
		const value_at = raw.lastIndexOf(link.target);
		if (value_at < 0) return raw;
		const before = raw.slice(0, value_at);
		const after = raw.slice(value_at + link.target.length);
		const attribute_at = before.search(/\b(?:href|src)=["']$/iu);
		const is_image = /^<img\b/iu.test(raw);
		const resolved = link.link_status === 'resolved';
		let attribute = before.slice(attribute_at, -2);
		let value = link.target;
		let extra = '';
		if (!resolved) {
			attribute = 'data-wiki0-broken-href';
			extra = ` class="wiki0-broken" title="${escape_html(title_for(link))}"`;
		} else if (is_image) {
			attribute = 'data-wiki0-asset';
			value = link.to ?? '';
		} else if (context.documents.has(link.to ?? '')) {
			value = doc_route(link.to ?? '', link.to_anchor);
			extra = ' data-wiki0-link';
		}
		const tag_end = /^<[a-z]+/iu.exec(raw)?.[0].length ?? 0;
		return (
			raw.slice(0, tag_end) +
			extra +
			before.slice(tag_end, attribute_at) +
			attribute +
			before.slice(-2) +
			escape_html(value) +
			after
		);
	}

	const marked = new Marked({ gfm: true });
	marked.use({
		extensions: [
			{
				name: 'wikilink',
				level: 'inline',
				start(source: string) {
					const index = source.indexOf('[[');
					if (index < 0) return undefined;
					return index > 0 && source[index - 1] === '!'
						? index - 1
						: index;
				},
				tokenizer(source: string) {
					const match = wikilink.exec(source);
					if (!match) return undefined;
					return {
						type: 'wikilink',
						raw: match[0],
						embed: match[1] === '!',
						target: match[2] ?? '',
						alias: match[3] ?? null,
					};
				},
				renderer(token) {
					const { raw, embed, target, alias } = token as unknown as {
						raw: string;
						embed: boolean;
						target: string;
						alias: string | null;
					};
					const link = take(raw, embed ? ['embed'] : ['wikilink']);
					const text = escape_html(alias ?? target);
					if (!link) return text;
					if (link.link_status !== 'resolved') {
						return broken_html(link, text);
					}
					if (embed && image_extensions.test(link.to ?? '')) {
						return asset_html(link, alias ?? target);
					}
					return resolved_html(link, text);
				},
			},
		],
		renderer: {
			heading({ tokens, depth }: Tokens.Heading) {
				const text = this.parser.parseInline(tokens);
				const heading = context.headings.find(
					(candidate) =>
						candidate.line === block.start_line &&
						candidate.depth === depth,
				);
				if (!heading) return `<h${depth}>${text}</h${depth}>\n`;
				const id = escape_html(heading.slug);
				return `<h${depth} id="${id}"><a href="#${id}" class="wiki0-heading-anchor" aria-hidden="true" tabindex="-1">#</a>${text}</h${depth}>\n`;
			},
			link({ href, title, tokens, raw }: Tokens.Link) {
				const inner = this.parser.parseInline(tokens);
				if (raw.startsWith('<')) {
					return link_html(null, href, inner, title);
				}
				return link_html(take(raw, ['markdown']), href, inner, title);
			},
			image({ href, text, raw }: Tokens.Image) {
				return image_html(take(raw, ['embed']), href, text);
			},
			html({ text }: Tokens.HTML | Tokens.Tag) {
				return rewrite_html(text);
			},
			code({ text, lang }: Tokens.Code) {
				const info = lang ?? '';
				const highlighted = context.highlight?.(text, info) ?? {
					html: `<pre><code>${escape_html(text)}</code></pre>`,
					label: '',
				};
				return render_code_block(highlighted, '');
			},
		},
	});

	const tokens = marked.lexer(input.markdown);
	const parts: string[] = [];
	for (const current of blocks_with_lines(
		tokens,
		input.markdown,
		input.body_start_line,
	)) {
		if (
			current.token.type === 'space' ||
			current.token.type === 'def'
		) {
			continue;
		}
		block = current;
		const html = marked.parser([current.token]);
		parts.push(
			tag_first_element(
				html,
				` data-line="${current.start_line}" data-end-line="${current.end_line}"`,
			),
		);
	}

	return {
		html: parts.join(''),
		unmatched: context.links.filter(
			(link, index) =>
				!consumed.has(index) &&
				link.line >= input.body_start_line &&
				link.kind !== 'reference',
		),
	};
}
