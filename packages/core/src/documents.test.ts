import {
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { document_kind, parse_document } from './documents.js';

const destroy = vi.fn<() => Promise<void>>(() => Promise.resolve());

vi.mock('pdf-parse', () => ({
	PDFParse: vi.fn().mockImplementation(function PDFParseMock() {
		return {
			destroy,
			getInfo: vi.fn(async () => ({
				info: { Title: 'PDF Title', Author: 'Writer' },
			})),
			getText: vi.fn(async () => ({
				text: 'Extracted PDF text\r\nSecond line',
				total: 2,
			})),
		};
	}),
}));

vi.mock('mammoth', () => ({
	default: {
		extractRawText: vi.fn(async () => ({
			value: 'Extracted DOCX text\r\nSecond line',
			messages: [{ type: 'warning', message: 'Ignored image' }],
		})),
	},
}));

const roots: string[] = [];

function temp_root(): string {
	const root = mkdtempSync(join(tmpdir(), 'wiki0-documents-'));
	roots.push(root);
	return root;
}

afterEach(() => {
	for (const root of roots.splice(0)) {
		rmSync(root, { recursive: true, force: true });
	}
	destroy.mockClear();
});

describe('document_kind', () => {
	it('detects supported document types from extensions', () => {
		expect(document_kind('guide.md')).toBe('markdown');
		expect(document_kind('guide.markdown')).toBe('markdown');
		expect(document_kind('notes.txt')).toBe('text');
		expect(document_kind('paper.PDF')).toBe('pdf');
		expect(document_kind('brief.DOCX')).toBe('docx');
		expect(document_kind('archive.zip')).toBe('unsupported');
	});
});

describe('parse_document', () => {
	it('parses markdown text and derives the title', async () => {
		const root = temp_root();
		const path = join(root, 'guide.md');
		writeFileSync(path, '# Guide\r\n\r\nBody');

		await expect(parse_document(path)).resolves.toMatchObject({
			kind: 'markdown',
			title: 'Guide',
			text: '# Guide\n\nBody',
			warnings: [],
		});
	});

	it('parses plain text', async () => {
		const root = temp_root();
		const path = join(root, 'notes.txt');
		writeFileSync(path, 'Line one\r\nLine two');

		await expect(parse_document(path)).resolves.toMatchObject({
			kind: 'text',
			title: 'notes.txt',
			text: 'Line one\nLine two',
			warnings: [],
		});
	});

	it('parses pdf text and metadata', async () => {
		const root = temp_root();
		const path = join(root, 'paper.pdf');
		writeFileSync(path, '%PDF-1.7');

		await expect(parse_document(path)).resolves.toMatchObject({
			kind: 'pdf',
			title: 'PDF Title',
			text: 'Extracted PDF text\nSecond line',
			metadata: { pages: 2, title: 'PDF Title', author: 'Writer' },
			warnings: [],
		});
		expect(destroy).toHaveBeenCalledTimes(1);
	});

	it('parses docx text and parser warnings', async () => {
		const root = temp_root();
		const path = join(root, 'brief.docx');
		writeFileSync(path, 'docx bytes');

		await expect(parse_document(path)).resolves.toMatchObject({
			kind: 'docx',
			title: 'brief.docx',
			text: 'Extracted DOCX text\nSecond line',
			warnings: ['Ignored image'],
		});
	});

	it('returns warnings for unsupported, missing, and directory sources', async () => {
		const root = temp_root();
		const unsupported = join(root, 'archive.zip');
		writeFileSync(unsupported, 'zip bytes');
		mkdirSync(join(root, 'folder'));

		await expect(parse_document(unsupported)).resolves.toMatchObject({
			kind: 'unsupported',
			text: '',
			warnings: ['Unsupported document type: .zip'],
		});
		await expect(
			parse_document(join(root, 'missing.pdf')),
		).resolves.toMatchObject({
			kind: 'unsupported',
			text: '',
		});
		await expect(
			parse_document(join(root, 'folder')),
		).resolves.toMatchObject({
			kind: 'unsupported',
			text: '',
			warnings: ['Source is not a file.'],
		});
	});
});
