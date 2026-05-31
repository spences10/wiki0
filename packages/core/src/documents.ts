import mammoth from 'mammoth';
import { readFile, stat } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import { PDFParse } from 'pdf-parse';
import { page_title_from_markdown } from './markdown.js';

export type ParsedDocumentKind =
	| 'markdown'
	| 'text'
	| 'pdf'
	| 'docx'
	| 'unsupported';

export type ParsedDocumentMetadata = Record<
	string,
	string | number | boolean | null
>;

export interface ParsedDocument {
	source_path: string;
	kind: ParsedDocumentKind;
	title?: string;
	text: string;
	metadata: ParsedDocumentMetadata;
	warnings: string[];
}

export async function parse_document(
	source_path: string,
): Promise<ParsedDocument> {
	const resolved_path = resolve(source_path);
	const kind = document_kind(source_path);
	const base_result = {
		source_path,
		kind,
		text: '',
		metadata: {},
		warnings: [] as string[],
	};

	try {
		const stats = await stat(resolved_path);
		if (!stats.isFile()) {
			return {
				...base_result,
				kind: 'unsupported',
				warnings: ['Source is not a file.'],
			};
		}
	} catch (error) {
		return {
			...base_result,
			kind: 'unsupported',
			warnings: [`Source could not be read: ${error_message(error)}`],
		};
	}

	if (kind === 'markdown')
		return parse_markdown_document(source_path);
	if (kind === 'text') return parse_text_document(source_path);
	if (kind === 'pdf') return parse_pdf_document(source_path);
	if (kind === 'docx') return parse_docx_document(source_path);

	return {
		...base_result,
		warnings: [`Unsupported document type: ${extname(source_path)}`],
	};
}

export function document_kind(
	source_path: string,
): ParsedDocumentKind {
	const extension = extname(source_path).toLowerCase();
	if (extension === '.md' || extension === '.markdown')
		return 'markdown';
	if (extension === '.txt') return 'text';
	if (extension === '.pdf') return 'pdf';
	if (extension === '.docx') return 'docx';
	return 'unsupported';
}

async function parse_markdown_document(
	source_path: string,
): Promise<ParsedDocument> {
	const text = await readFile(source_path, 'utf-8');
	return {
		source_path,
		kind: 'markdown',
		title: page_title_from_markdown(text, basename(source_path)),
		text: normalize_text(text),
		metadata: { bytes: Buffer.byteLength(text) },
		warnings: [],
	};
}

async function parse_text_document(
	source_path: string,
): Promise<ParsedDocument> {
	const text = await readFile(source_path, 'utf-8');
	return {
		source_path,
		kind: 'text',
		title: basename(source_path),
		text: normalize_text(text),
		metadata: { bytes: Buffer.byteLength(text) },
		warnings: [],
	};
}

async function parse_pdf_document(
	source_path: string,
): Promise<ParsedDocument> {
	const parser = new PDFParse({ data: await readFile(source_path) });
	try {
		const [text_result, info_result] = await Promise.all([
			parser.getText(),
			parser.getInfo().catch(() => null),
		]);
		const info = info_result?.info as
			| Record<string, unknown>
			| undefined;
		return {
			source_path,
			kind: 'pdf',
			title: string_metadata(info?.Title) ?? basename(source_path),
			text: normalize_text(text_result.text),
			metadata: compact_metadata({
				pages: text_result.total,
				title: string_metadata(info?.Title),
				author: string_metadata(info?.Author),
				subject: string_metadata(info?.Subject),
				creator: string_metadata(info?.Creator),
				producer: string_metadata(info?.Producer),
			}),
			warnings: [],
		};
	} finally {
		await parser.destroy();
	}
}

async function parse_docx_document(
	source_path: string,
): Promise<ParsedDocument> {
	const result = await mammoth.extractRawText({ path: source_path });
	return {
		source_path,
		kind: 'docx',
		title: basename(source_path),
		text: normalize_text(result.value),
		metadata: {},
		warnings: result.messages.map((message) => message.message),
	};
}

function normalize_text(text: string): string {
	return text.replace(/\r\n?/gu, '\n').trim();
}

function compact_metadata(
	metadata: Record<
		string,
		string | number | boolean | null | undefined
	>,
): ParsedDocumentMetadata {
	return Object.fromEntries(
		Object.entries(metadata).filter(
			(entry): entry is [string, string | number | boolean | null] =>
				entry[1] !== undefined,
		),
	);
}

function string_metadata(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim().length > 0
		? value.trim()
		: undefined;
}

function error_message(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
