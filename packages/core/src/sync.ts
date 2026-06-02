import { createHash } from 'node:crypto';
import {
	existsSync,
	readFileSync,
	readdirSync,
	statSync,
} from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { parse_document, type ParsedDocument } from './documents.js';
import { log_wiki_event } from './events.js';
import { add_fact, derive_facts_from_markdown } from './facts.js';
import { index_wiki } from './indexer.js';
import { parse_markdown, serialize_frontmatter } from './markdown.js';
import { create_page } from './pages.js';
import {
	page_file_path,
	resolve_wiki_root,
	slugify_title,
} from './paths.js';
import type {
	WikiDocumentSync,
	WikiDocumentSyncOptions,
	WikiDocumentSyncResult,
} from './types.js';

const supported_extensions = new Set([
	'.md',
	'.markdown',
	'.txt',
	'.pdf',
	'.docx',
]);

export async function sync_documents(
	options: WikiDocumentSyncOptions,
): Promise<WikiDocumentSyncResult> {
	const root = resolve_wiki_root(options.root, options.wiki_dir);
	const sources = discover_sources(root, options.sources, {
		include: options.include,
		ignore: options.ignore,
	});
	const display_sources = sources.map((source) =>
		source_display_path(root, source),
	);
	const created: string[] = [];
	const skipped: string[] = [];
	const proposed_pages: string[] = [];
	const fact_inputs: Array<{
		page: string;
		fact: ReturnType<typeof derive_facts_from_markdown>[number];
	}> = [];
	const synced_sources: WikiDocumentSync[] = [];

	for (const source of sources) {
		const display_source = source_display_path(root, source);
		const page = source_page_path(display_source);
		const file_path = page_file_path(page, root, options.wiki_dir);
		const page_exists = existsSync(file_path);
		const fingerprint = source_fingerprint(source);
		const existing_fingerprint = page_exists
			? existing_source_fingerprint(file_path)
			: null;
		const existing_kind = page_exists
			? existing_source_kind(file_path)
			: 'unsupported';
		if (
			page_exists &&
			fingerprint !== null &&
			existing_fingerprint === fingerprint
		) {
			skipped.push(page);
			synced_sources.push({
				source: display_source,
				page: `${page}.md`,
				kind: existing_kind,
				status: 'unchanged',
				warnings: [],
			});
			continue;
		}
		if (page_exists && !options.overwrite) {
			skipped.push(page);
			synced_sources.push({
				source: display_source,
				page: `${page}.md`,
				kind: existing_kind,
				status: 'changed',
				warnings: [
					'Source page exists and source fingerprint changed; rerun with overwrite to refresh generated content.',
				],
			});
			continue;
		}

		const parsed = await parse_document(source);
		create_page(
			page,
			source_page_template(parsed, display_source, fingerprint),
			{
				root,
				wiki_dir: options.wiki_dir,
				overwrite: options.overwrite,
			},
		);
		created.push(page);
		if (options.derive_facts !== false && options.index !== false) {
			for (const fact of derive_facts_from_markdown(parsed.text)) {
				fact_inputs.push({ page, fact });
			}
		}
		if (options.propose_pages) {
			proposed_pages.push(
				...create_proposed_pages(
					parsed,
					display_source,
					root,
					options.wiki_dir,
				),
			);
		}
		synced_sources.push({
			source: display_source,
			page: `${page}.md`,
			kind: parsed.kind,
			status:
				parsed.kind === 'unsupported'
					? 'warning'
					: page_exists
						? 'updated'
						: 'created',
			warnings: parsed.warnings,
		});
	}

	const indexed =
		options.index === false
			? null
			: index_wiki(root, options.wiki_dir);
	const derived_facts = fact_inputs.map(({ page, fact }) =>
		add_fact({
			root,
			page,
			source: `${page}.md:${fact.line}`,
			...fact,
		}),
	);
	log_wiki_event({
		root,
		operation: 'sync_documents',
		summary: `Synced ${created.length} document sources`,
		target: root,
		details: {
			sources: display_sources,
			created,
			skipped,
			proposed_pages,
			derived_fact_count: derived_facts.length,
			synced_sources,
		},
	});

	return {
		root,
		sources: display_sources,
		created,
		skipped,
		proposed_pages,
		derived_facts,
		synced_sources,
		indexed,
	};
}

function discover_sources(
	root: string,
	sources: string[],
	filters: { include?: string[]; ignore?: string[] } = {},
): string[] {
	const discovered: string[] = [];
	for (const source of sources) {
		const absolute_source = resolve(root, source);
		if (!existsSync(absolute_source)) {
			discovered.push(absolute_source);
			continue;
		}
		const stats = statSync(absolute_source);
		if (stats.isDirectory()) {
			discovered.push(
				...discover_directory(absolute_source, root, filters),
			);
			continue;
		}
		if (matches_source_filters(root, absolute_source, filters)) {
			discovered.push(absolute_source);
		}
	}
	return [...new Set(discovered)].sort();
}

function discover_directory(
	directory: string,
	root: string,
	filters: { include?: string[]; ignore?: string[] },
): string[] {
	const sources: string[] = [];
	for (const entry of readdirSync(directory, {
		withFileTypes: true,
	})) {
		if (entry.name.startsWith('.')) continue;
		const entry_path = join(directory, entry.name);
		if (entry.isDirectory()) {
			sources.push(...discover_directory(entry_path, root, filters));
			continue;
		}
		if (
			supported_extensions.has(extension(entry.name)) &&
			matches_source_filters(root, entry_path, filters)
		) {
			sources.push(entry_path);
		}
	}
	return sources;
}

function matches_source_filters(
	root: string,
	source: string,
	filters: { include?: string[]; ignore?: string[] },
): boolean {
	const display = source_display_path(root, source);
	const included =
		!filters.include ||
		filters.include.length === 0 ||
		filters.include.some((pattern) => glob_match(pattern, display));
	const ignored = (filters.ignore ?? []).some((pattern) =>
		glob_match(pattern, display),
	);
	return included && !ignored;
}

function glob_match(pattern: string, value: string): boolean {
	let regex = '';
	for (let index = 0; index < pattern.length; index += 1) {
		const character = pattern[index];
		const next = pattern[index + 1];
		if (character === '*' && next === '*') {
			regex += '.*';
			index += 1;
			continue;
		}
		if (character === '*') {
			regex += '[^/]*';
			continue;
		}
		regex += character?.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&') ?? '';
	}
	return new RegExp(`^${regex}$`, 'u').test(value);
}

function source_page_path(source: string): string {
	return `sources/synced/${slugify_title(source)}`;
}

function source_page_template(
	parsed: ParsedDocument,
	display_source: string,
	fingerprint: string | null,
): string {
	const frontmatter = serialize_frontmatter({
		title: `Source: ${parsed.title ?? display_source}`,
		tags: ['source', parsed.kind],
		status: parsed.kind === 'unsupported' ? 'review' : 'draft',
		source_path: display_source,
		source_kind: parsed.kind,
		source_fingerprint: fingerprint,
	});
	return `${frontmatter}# Source: ${parsed.title ?? display_source}

Source path: \`${display_source}\`
Source kind: \`${parsed.kind}\`

## Extracted text

${format_extracted_text(parsed)}

## Parser metadata

${format_metadata(parsed)}

## Parser warnings

${format_list(parsed.warnings, '- None.')}

## Candidate facts

${format_candidate_facts(parsed.text)}

## Open questions

- What claims from this source should become stable wiki pages?
- What needs citation, owner confirmation, or freshness review?
`;
}

function format_extracted_text(parsed: ParsedDocument): string {
	if (parsed.text.length === 0) return '- No text extracted.';
	const fence = markdown_code_fence(parsed.text);
	return `${fence}\n${parsed.text}\n${fence}`;
}

function markdown_code_fence(text: string): string {
	const longest_backtick_run = Math.max(
		0,
		...Array.from(
			text.matchAll(/`+/gu),
			(match) => match[0]?.length ?? 0,
		),
	);
	return '`'.repeat(Math.max(3, longest_backtick_run + 1));
}

function format_metadata(parsed: ParsedDocument): string {
	const entries = Object.entries(parsed.metadata);
	if (entries.length === 0) return '- None.';
	return entries
		.map(([key, value]) => `- ${key}: ${value ?? 'null'}`)
		.join('\n');
}

function format_list(items: string[], empty: string): string {
	return items.length > 0
		? items.map((item) => `- ${item}`).join('\n')
		: empty;
}

function format_candidate_facts(text: string): string {
	const facts = derive_facts_from_markdown(text).map(
		(fact) =>
			`- Candidate from extracted line ${fact.line}: ${fact.summary}`,
	);
	return facts.length > 0
		? facts.join('\n')
		: '- Review this source and promote durable claims into wiki pages.';
}

function create_proposed_pages(
	parsed: ParsedDocument,
	display_source: string,
	root: string,
	wiki_dir = 'wiki',
): string[] {
	const pages: string[] = [];
	for (const proposal of propose_pages(parsed, display_source)) {
		if (existsSync(page_file_path(proposal.path, root, wiki_dir))) {
			continue;
		}
		create_page(proposal.path, proposal.body, {
			root,
			wiki_dir,
			overwrite: false,
		});
		pages.push(proposal.path);
	}
	return pages;
}

function propose_pages(
	parsed: ParsedDocument,
	display_source: string,
): Array<{ path: string; body: string }> {
	const headings = parsed.text
		.split(/\n/u)
		.map((line) => line.match(/^#{1,3}\s+(.+)$/u)?.[1]?.trim())
		.filter((heading): heading is string => Boolean(heading))
		.slice(0, 5);
	const workflow_lines = parsed.text
		.split(/\n/u)
		.filter((line) =>
			/\b(workflow|process|step|how to)\b/iu.test(line),
		)
		.slice(0, 3);
	return [
		...headings.map((heading) =>
			proposed_page('concepts', heading, display_source),
		),
		...workflow_lines.map((line) =>
			proposed_page(
				'workflows',
				line.replace(/^[-*]\s*/u, '').slice(0, 80),
				display_source,
			),
		),
	];
}

function proposed_page(
	section: 'concepts' | 'workflows',
	title: string,
	display_source: string,
): { path: string; body: string } {
	const clean_title = title.replace(/[#:]/gu, '').trim();
	const path = `${section}/proposed/${slugify_title(clean_title)}`;
	const frontmatter = serialize_frontmatter({
		title: clean_title,
		tags: [section.slice(0, -1), 'proposed', 'needs-review'],
		status: 'review',
		source_path: display_source,
	});
	return {
		path,
		body: `${frontmatter}# ${clean_title}\n\nProposed from [[${source_page_path(display_source)}|${display_source}]].\n\n## Notes\n\n- Needs human review before becoming a stable wiki page.\n`,
	};
}

function extension(path: string): string {
	return path.slice(path.lastIndexOf('.')).toLowerCase();
}

function source_display_path(root: string, source: string): string {
	const relative_source = relative(root, source);
	return relative_source.startsWith('..') || relative_source === ''
		? source
		: relative_source;
}

function source_fingerprint(source: string): string | null {
	try {
		const stats = statSync(source);
		if (!stats.isFile()) return null;
		return createHash('sha256')
			.update(readFileSync(source))
			.digest('hex');
	} catch {
		return null;
	}
}

function existing_source_fingerprint(
	file_path: string,
): string | null {
	const fingerprint = parse_markdown(readFileSync(file_path, 'utf-8'))
		.frontmatter.source_fingerprint;
	return typeof fingerprint === 'string' && fingerprint.length > 0
		? fingerprint
		: null;
}

function existing_source_kind(
	file_path: string,
): WikiDocumentSync['kind'] {
	const kind = parse_markdown(readFileSync(file_path, 'utf-8'))
		.frontmatter.source_kind;
	return kind === 'markdown' ||
		kind === 'text' ||
		kind === 'pdf' ||
		kind === 'docx' ||
		kind === 'unsupported'
		? kind
		: 'unsupported';
}
