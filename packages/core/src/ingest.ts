import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { parse_document, type ParsedDocument } from './documents.js';
import { log_wiki_event } from './events.js';
import { index_wiki } from './indexer.js';
import { serialize_frontmatter } from './markdown.js';
import { create_page } from './pages.js';
import {
	page_file_path,
	resolve_wiki_root,
	slugify_title,
} from './paths.js';
import type {
	WikiDocumentIngestOptions,
	WikiDocumentIngestResult,
	WikiDocumentIngestion,
} from './types.js';

const supported_extensions = new Set([
	'.md',
	'.markdown',
	'.txt',
	'.pdf',
	'.docx',
]);

export async function ingest_documents(
	options: WikiDocumentIngestOptions,
): Promise<WikiDocumentIngestResult> {
	const root = resolve_wiki_root(options.root);
	const sources = discover_sources(root, options.sources);
	const display_sources = sources.map((source) =>
		source_display_path(root, source),
	);
	const created: string[] = [];
	const skipped: string[] = [];
	const ingested_sources: WikiDocumentIngestion[] = [];

	for (const source of sources) {
		const display_source = source_display_path(root, source);
		const page = source_page_path(display_source);
		const page_exists = existsSync(page_file_path(page, root));
		if (page_exists && !options.overwrite) {
			skipped.push(page);
			ingested_sources.push({
				source: display_source,
				page: `${page}.md`,
				kind: 'unsupported',
				status: 'skipped',
				warnings: ['Source page already exists.'],
			});
			continue;
		}

		const parsed = await parse_document(source);
		create_page(page, source_page_template(parsed, display_source), {
			root,
			overwrite: options.overwrite,
		});
		created.push(page);
		ingested_sources.push({
			source: display_source,
			page: `${page}.md`,
			kind: parsed.kind,
			status: parsed.kind === 'unsupported' ? 'warning' : 'created',
			warnings: parsed.warnings,
		});
	}

	const indexed = options.index === false ? null : index_wiki(root);
	log_wiki_event({
		root,
		operation: 'ingest_documents',
		summary: `Ingested ${created.length} document sources`,
		target: root,
		details: {
			sources: display_sources,
			created,
			skipped,
			ingested_sources,
		},
	});

	return {
		root,
		sources: display_sources,
		created,
		skipped,
		ingested_sources,
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
	return `sources/ingested/${slugify_title(source)}`;
}

function source_page_template(
	parsed: ParsedDocument,
	display_source: string,
): string {
	const frontmatter = serialize_frontmatter({
		title: `Source: ${parsed.title ?? display_source}`,
		tags: ['source', parsed.kind],
		status: parsed.kind === 'unsupported' ? 'review' : 'draft',
		source_path: display_source,
		source_kind: parsed.kind,
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
	return `\`\`\`\n${parsed.text.slice(0, 10_000)}\n\`\`\``;
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
