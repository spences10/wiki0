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
	const root = resolve_wiki_root(options.root);
	const sources = discover_sources(root, options.sources);
	const display_sources = sources.map((source) =>
		source_display_path(root, source),
	);
	const created: string[] = [];
	const skipped: string[] = [];
	const synced_sources: WikiDocumentSync[] = [];

	for (const source of sources) {
		const display_source = source_display_path(root, source);
		const page = source_page_path(display_source);
		const file_path = page_file_path(page, root);
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
				overwrite: options.overwrite,
			},
		);
		created.push(page);
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

	const indexed = options.index === false ? null : index_wiki(root);
	log_wiki_event({
		root,
		operation: 'sync_documents',
		summary: `Synced ${created.length} document sources`,
		target: root,
		details: {
			sources: display_sources,
			created,
			skipped,
			synced_sources,
		},
	});

	return {
		root,
		sources: display_sources,
		created,
		skipped,
		synced_sources,
		indexed,
	};
}

function discover_sources(root: string, sources: string[]): string[] {
	const discovered: string[] = [];
	for (const source of sources) {
		const absolute_source = resolve(root, source);
		if (!existsSync(absolute_source)) {
			discovered.push(absolute_source);
			continue;
		}
		const stats = statSync(absolute_source);
		if (stats.isDirectory()) {
			discovered.push(...discover_directory(absolute_source));
			continue;
		}
		discovered.push(absolute_source);
	}
	return [...new Set(discovered)].sort();
}

function discover_directory(directory: string): string[] {
	const sources: string[] = [];
	for (const entry of readdirSync(directory, {
		withFileTypes: true,
	})) {
		if (entry.name.startsWith('.')) continue;
		const entry_path = join(directory, entry.name);
		if (entry.isDirectory()) {
			sources.push(...discover_directory(entry_path));
			continue;
		}
		if (supported_extensions.has(extension(entry.name))) {
			sources.push(entry_path);
		}
	}
	return sources;
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
	const facts = text
		.split(/\n/u)
		.map((line, index) => ({
			line: line.trim(),
			line_number: index + 1,
		}))
		.filter(({ line }) =>
			/\b(should|must|required|requirement|decision|constraint|risk|assumption|fact)\b/iu.test(
				line,
			),
		)
		.slice(0, 20)
		.map(
			({ line, line_number }) =>
				`- Candidate from extracted line ${line_number}: ${line}`,
		);
	return facts.length > 0
		? facts.join('\n')
		: '- Review this source and promote durable claims into wiki pages.';
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
