import GithubSlugger from 'github-slugger';
import type { Token } from 'marked';
import { posix } from 'node:path';
import { heading_text, lex_blocks, type Block } from './chunks.js';
import type { FrontmatterValue, WikiFrontmatter } from './types.js';

export type LinkKind =
	| 'markdown'
	| 'wikilink'
	| 'embed'
	| 'html'
	| 'frontmatter'
	| 'reference';

export type ExtractedLink = {
	kind: LinkKind;
	line: number;
	raw: string;
	target: string;
	alias: string | null;
};

export type AnchorKind = 'heading' | 'html' | 'block';

export type Anchor = {
	kind: AnchorKind;
	slug: string;
	text: string;
	depth: number;
	line: number;
};

export type LinkStatus =
	| 'resolved'
	| 'external'
	| 'missing-file'
	| 'missing-heading'
	| 'missing-block-id'
	| 'line-out-of-range'
	| 'ambiguous'
	| 'outside-root'
	| 'undefined-reference';

export type MatchQuality = 'exact' | 'case-insensitive' | 'text';

export type ResolvedLink = ExtractedLink & {
	to_path: string | null;
	to_anchor: string | null;
	status: LinkStatus;
	quality: MatchQuality | null;
	candidates: string[];
};

const wikilink_pattern = /(!?)\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/gu;
const undefined_reference_pattern = /\[([^\]\n]+)\]\[([^\]\n]+)\]/gu;
const external_pattern = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/iu;
const line_fragment_pattern =
	/^L?(\d+)(?:,\d+)?(?:-L?(\d+)(?:,\d+)?)?$/iu;

// Links in document order, skipping code blocks and code spans.
export function extract_links(
	content: string,
	line_offset = 0,
	frontmatter: WikiFrontmatter = {},
): ExtractedLink[] {
	const links: ExtractedLink[] = frontmatter_links(frontmatter);
	for (const block of lex_blocks(content, line_offset)) {
		if (block.token.type === 'code') continue;
		const locate = line_locator(block);
		walk_inline(block.token, (token) => {
			if (token.type === 'link' && !token.raw.startsWith('<')) {
				links.push({
					kind: 'markdown',
					line: locate(token.raw),
					raw: token.raw,
					target: token.href,
					alias: null,
				});
			} else if (token.type === 'image') {
				links.push({
					kind: 'embed',
					line: locate(token.raw),
					raw: token.raw,
					target: token.href,
					alias: null,
				});
			} else if (token.type === 'html') {
				for (const match of token.raw.matchAll(
					/<(?:a|img)\b[^>]*?\b(?:href|src)=["']([^"']+)["']/giu,
				)) {
					links.push({
						kind: 'html',
						line: locate(token.raw),
						raw: match[0],
						target: match[1] ?? '',
						alias: null,
					});
				}
			} else if (
				token.type === 'text' &&
				!('tokens' in token && token.tokens)
			) {
				for (const match of token.raw.matchAll(wikilink_pattern)) {
					const [raw, embed, target = '', alias] = match;
					links.push({
						kind: embed ? 'embed' : 'wikilink',
						line: locate(raw),
						raw,
						target: target.trim(),
						alias: alias?.trim() ?? null,
					});
				}
				for (const match of token.raw.matchAll(
					undefined_reference_pattern,
				)) {
					links.push({
						kind: 'reference',
						line: locate(match[0]),
						raw: match[0],
						target: match[2] ?? '',
						alias: null,
					});
				}
			}
		});
	}
	return links;
}

// Heading anchors use GitHub's slugs, including -1, -2 suffixes for
// repeated headings, so citations match what GitHub renders.
export function extract_anchors(
	content: string,
	line_offset = 0,
): Anchor[] {
	const slugger = new GithubSlugger();
	const anchors: Anchor[] = [];
	for (const block of lex_blocks(content, line_offset)) {
		if (block.token.type === 'heading') {
			const text = heading_text(
				block.token as Parameters<typeof heading_text>[0],
			);
			anchors.push({
				kind: 'heading',
				slug: slugger.slug(text),
				text,
				depth: (block.token as { depth: number }).depth,
				line: block.start_line,
			});
		}
		if (block.token.type === 'code') continue;
		const locate = line_locator(block);
		for (const match of block.raw.matchAll(
			/<[a-z][^>]*?\b(?:id|name)=["']([^"']+)["']/giu,
		)) {
			anchors.push({
				kind: 'html',
				slug: match[1] ?? '',
				text: match[1] ?? '',
				depth: 0,
				line: locate(match[0]),
			});
		}
		for (const match of block.raw.matchAll(
			/[ \t]\^([A-Za-z0-9-]+)[ \t]*$/gmu,
		)) {
			anchors.push({
				kind: 'block',
				slug: match[1] ?? '',
				text: match[1] ?? '',
				depth: 0,
				line: locate(match[0]),
			});
		}
	}
	return anchors;
}

export type LinkTargetDocument = {
	path: string;
	title: string;
	aliases: string[];
	anchors: Anchor[];
	line_count: number;
};

// Resolves links against the indexed documents and every file in the
// project (so links to images or code count as resolved).
export function link_resolver(
	documents: LinkTargetDocument[],
	project_files: string[],
): (from_path: string, link: ExtractedLink) => ResolvedLink {
	const by_path = new Map(documents.map((doc) => [doc.path, doc]));
	const files = new Set([...project_files, ...by_path.keys()]);
	const files_lower = new Map(
		[...files].map((path) => [path.toLowerCase(), path]),
	);
	const directories = new Set(
		[...files].flatMap((path) =>
			path
				.split('/')
				.slice(0, -1)
				.map((_, index, parts) =>
					parts.slice(0, index + 1).join('/'),
				),
		),
	);
	const names = new Map<string, string[]>();
	for (const doc of documents) {
		for (const name of [doc.title, ...doc.aliases]) {
			const key = name.trim().toLowerCase();
			if (key) names.set(key, [...(names.get(key) ?? []), doc.path]);
		}
	}

	const result = (
		link: ExtractedLink,
		fields: Partial<ResolvedLink>,
	): ResolvedLink => ({
		...link,
		to_path: null,
		to_anchor: null,
		status: 'resolved',
		quality: null,
		candidates: [],
		...fields,
	});

	function probe_path(
		path: string,
	): { path: string; quality: MatchQuality } | null {
		const candidates = [path];
		if (!posix.extname(path)) candidates.push(`${path}.md`);
		for (const candidate of candidates) {
			if (files.has(candidate))
				return { path: candidate, quality: 'exact' };
		}
		if (path === '' || directories.has(path)) {
			const prefix = path ? `${path}/` : '';
			for (const index of ['README.md', 'index.md', 'readme.md']) {
				if (files.has(`${prefix}${index}`)) {
					return { path: `${prefix}${index}`, quality: 'exact' };
				}
			}
			// A directory with no index still exists.
			return { path, quality: 'exact' };
		}
		for (const candidate of candidates) {
			const match = files_lower.get(candidate.toLowerCase());
			if (match) return { path: match, quality: 'case-insensitive' };
		}
		return null;
	}

	function resolve_fragment(
		link: ExtractedLink,
		to_path: string,
		quality: MatchQuality,
		fragment: string,
	): ResolvedLink {
		const doc = by_path.get(to_path);
		if (!fragment || !doc) {
			return result(link, { to_path, quality });
		}
		const line_match = fragment.match(line_fragment_pattern);
		if (line_match) {
			const end = Number(line_match[2] ?? line_match[1]);
			return end > doc.line_count
				? result(link, { to_path, status: 'line-out-of-range' })
				: result(link, { to_path, to_anchor: fragment, quality });
		}
		const segment = fragment.split('#').at(-1) ?? fragment;
		if (segment.startsWith('^')) {
			const id = segment.slice(1);
			const block = doc.anchors.find(
				(anchor) => anchor.kind === 'block' && anchor.slug === id,
			);
			return block
				? result(link, { to_path, to_anchor: segment, quality })
				: result(link, { to_path, status: 'missing-block-id' });
		}
		const anchor = find_anchor(doc.anchors, segment);
		if (!anchor) {
			return result(link, {
				to_path,
				status: 'missing-heading',
				candidates: suggest_anchors(doc.anchors, segment),
			});
		}
		return result(link, {
			to_path,
			to_anchor: anchor.anchor.slug,
			quality: worst_quality(quality, anchor.quality),
		});
	}

	return (from_path, link) => {
		if (link.kind === 'reference') {
			return result(link, { status: 'undefined-reference' });
		}
		if (
			link.kind === 'wikilink' ||
			(link.kind === 'embed' && link.raw.startsWith('![' + '['))
		) {
			return resolve_wikilink(from_path, link);
		}
		return resolve_path_link(from_path, link);
	};

	function resolve_path_link(
		from_path: string,
		link: ExtractedLink,
	): ResolvedLink {
		const raw = link.target.trim();
		if (!raw || external_pattern.test(raw)) {
			return result(link, { status: 'external' });
		}
		const [path_part = '', ...fragment_parts] = raw.split('#');
		const fragment = decode(fragment_parts.join('#'));
		const clean_path = decode(path_part.split('?')[0] ?? '');
		if (!clean_path) {
			return resolve_fragment(link, from_path, 'exact', fragment);
		}
		const joined = clean_path.startsWith('/')
			? posix.normalize(clean_path.slice(1))
			: posix.normalize(
					posix.join(posix.dirname(from_path), clean_path),
				);
		const target_path = joined.replace(/\/$/u, '');
		if (target_path === '..' || target_path.startsWith('../')) {
			return result(link, { status: 'outside-root' });
		}
		const found = probe_path(target_path === '.' ? '' : target_path);
		// Site content often links to routes like /contact, which are not
		// files in the repo.
		if (
			!found &&
			clean_path.startsWith('/') &&
			!posix.extname(clean_path)
		) {
			return result(link, { status: 'external' });
		}
		if (!found) {
			return result(link, {
				status: 'missing-file',
				to_path: target_path,
			});
		}
		return resolve_fragment(
			link,
			found.path,
			found.quality,
			fragment,
		);
	}

	function resolve_wikilink(
		from_path: string,
		link: ExtractedLink,
	): ResolvedLink {
		const [name_part = '', ...fragment_parts] =
			link.target.split('#');
		const fragment = fragment_parts.join('#');
		const name = name_part.trim();
		if (!name)
			return resolve_fragment(link, from_path, 'exact', fragment);
		if (name.startsWith('/') || name.startsWith('.')) {
			return resolve_path_link(from_path, {
				...link,
				target: link.target,
			});
		}
		const with_extension = posix.extname(name) ? name : `${name}.md`;
		if (files.has(with_extension)) {
			return resolve_fragment(
				link,
				with_extension,
				'exact',
				fragment,
			);
		}
		const suffix = [...files].filter((path) =>
			path.endsWith(`/${with_extension}`),
		);
		const by_name = names.get(name.toLowerCase()) ?? [];
		const candidates = [...new Set([...suffix, ...by_name])];
		if (candidates.length === 0) {
			const insensitive = files_lower.get(
				with_extension.toLowerCase(),
			);
			if (insensitive) {
				return resolve_fragment(
					link,
					insensitive,
					'case-insensitive',
					fragment,
				);
			}
			return result(link, { status: 'missing-file' });
		}
		if (candidates.length > 1) {
			return result(link, {
				status: 'ambiguous',
				to_path: pick_candidate(from_path, candidates),
				candidates: candidates.sort(),
			});
		}
		return resolve_fragment(
			link,
			candidates[0] ?? '',
			suffix.length > 0 ? 'exact' : 'text',
			fragment,
		);
	}
}

function find_anchor(
	anchors: Anchor[],
	fragment: string,
): { anchor: Anchor; quality: MatchQuality } | null {
	const exact = anchors.find((anchor) => anchor.slug === fragment);
	if (exact) return { anchor: exact, quality: 'exact' };
	const lower = fragment.toLowerCase();
	const insensitive = anchors.find(
		(anchor) => anchor.slug.toLowerCase() === lower,
	);
	if (insensitive)
		return { anchor: insensitive, quality: 'case-insensitive' };
	const slugged = new GithubSlugger().slug(fragment);
	const by_text = anchors.find(
		(anchor) =>
			anchor.text.toLowerCase() === lower || anchor.slug === slugged,
	);
	return by_text ? { anchor: by_text, quality: 'text' } : null;
}

function suggest_anchors(
	anchors: Anchor[],
	fragment: string,
): string[] {
	return anchors
		.filter((anchor) => anchor.kind === 'heading')
		.map((anchor) => ({
			slug: anchor.slug,
			distance: edit_distance(anchor.slug, fragment.toLowerCase()),
		}))
		.filter(
			(entry) => entry.distance <= Math.max(3, fragment.length / 3),
		)
		.sort((a, b) => a.distance - b.distance)
		.slice(0, 3)
		.map((entry) => entry.slug);
}

// Deterministic pick for ambiguous wikilinks: same folder, then the
// shortest path, then alphabetical.
function pick_candidate(
	from_path: string,
	candidates: string[],
): string {
	const folder = posix.dirname(from_path);
	return (
		[...candidates].sort((a, b) => {
			const a_same = posix.dirname(a) === folder ? 0 : 1;
			const b_same = posix.dirname(b) === folder ? 0 : 1;
			return (
				a_same - b_same || a.length - b.length || a.localeCompare(b)
			);
		})[0] ?? ''
	);
}

function worst_quality(
	a: MatchQuality,
	b: MatchQuality,
): MatchQuality {
	const order: MatchQuality[] = ['exact', 'case-insensitive', 'text'];
	return (
		order[Math.max(order.indexOf(a), order.indexOf(b))] ?? 'text'
	);
}

function frontmatter_links(
	frontmatter: WikiFrontmatter,
): ExtractedLink[] {
	const links: ExtractedLink[] = [];
	const visit = (value: FrontmatterValue): void => {
		if (typeof value === 'string') {
			for (const match of value.matchAll(wikilink_pattern)) {
				links.push({
					kind: 'frontmatter',
					line: 1,
					raw: match[0],
					target: (match[2] ?? '').trim(),
					alias: match[3]?.trim() ?? null,
				});
			}
		} else if (Array.isArray(value)) {
			value.forEach(visit);
		} else if (value && typeof value === 'object') {
			Object.values(value).forEach(visit);
		}
	};
	Object.values(frontmatter).forEach(visit);
	return links;
}

function walk_inline(
	token: Token,
	visit: (token: Token) => void,
): void {
	visit(token);
	const record = token as unknown as Record<string, unknown>;
	for (const key of ['tokens', 'items']) {
		const children = record[key];
		if (Array.isArray(children)) {
			for (const child of children as Token[])
				walk_inline(child, visit);
		}
	}
	if (token.type === 'table') {
		const cells = [
			...(record.header as { tokens: Token[] }[]),
			...(record.rows as { tokens: Token[] }[][]).flat(),
		];
		for (const cell of cells) {
			for (const child of cell.tokens) walk_inline(child, visit);
		}
	}
}

// Returns the line of each successive match inside a block.
function line_locator(block: Block): (raw: string) => number {
	let cursor = 0;
	return (raw) => {
		const index = block.raw.indexOf(raw, cursor);
		if (index < 0) return block.start_line;
		cursor = index + raw.length;
		return (
			block.start_line + count_newlines(block.raw.slice(0, index))
		);
	};
}

function decode(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

function count_newlines(text: string): number {
	let count = 0;
	for (const character of text) if (character === '\n') count += 1;
	return count;
}

function edit_distance(a: string, b: string): number {
	const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
	for (let i = 1; i <= a.length; i += 1) {
		let diagonal = previous[0] ?? 0;
		previous[0] = i;
		for (let j = 1; j <= b.length; j += 1) {
			const above = previous[j] ?? 0;
			previous[j] = Math.min(
				above + 1,
				(previous[j - 1] ?? 0) + 1,
				diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
			);
			diagonal = above;
		}
	}
	return previous[b.length] ?? 0;
}
