import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse_document } from './documents.js';
import { make_wiki_root } from './test-utils.js';

describe('parse_document real fixture smoke tests', () => {
	it('extracts text from a synthetic PDF file', async () => {
		const root = make_wiki_root();
		const path = join(root, 'synthetic.pdf');
		writeFileSync(path, synthetic_pdf('Synthetic PDF text'));

		const parsed = await parse_document(path);

		expect(parsed.kind).toBe('pdf');
		expect(parsed.text).toContain('Synthetic PDF text');
	});

	it('extracts text from a synthetic DOCX file', async () => {
		const root = make_wiki_root();
		const path = join(root, 'synthetic.docx');
		writeFileSync(path, synthetic_docx('Synthetic DOCX text'));

		const parsed = await parse_document(path);

		expect(parsed.kind).toBe('docx');
		expect(parsed.text).toContain('Synthetic DOCX text');
	});
});

function synthetic_pdf(text: string): Buffer {
	const escaped = text.replace(/[()\\]/gu, '\\$&');
	const objects = [
		'1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
		'2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
		'3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
		'4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
	];
	const stream = `BT /F1 12 Tf 72 720 Td (${escaped}) Tj ET`;
	objects.push(
		`5 0 obj\n<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream\nendobj\n`,
	);
	let pdf = '%PDF-1.4\n';
	const offsets = [0];
	for (const object of objects) {
		offsets.push(Buffer.byteLength(pdf));
		pdf += object;
	}
	const xref_offset = Buffer.byteLength(pdf);
	pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
	for (const offset of offsets.slice(1)) {
		pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
	}
	pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref_offset}\n%%EOF\n`;
	return Buffer.from(pdf, 'binary');
}

function synthetic_docx(text: string): Buffer {
	return zip_store({
		'[Content_Types].xml':
			'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
		'_rels/.rels':
			'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
		'word/document.xml': `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${xml_escape(text)}</w:t></w:r></w:p></w:body></w:document>`,
	});
}

function zip_store(files: Record<string, string>): Buffer {
	const chunks: Buffer[] = [];
	const central: Buffer[] = [];
	let offset = 0;
	for (const [name, contents] of Object.entries(files)) {
		const name_buffer = Buffer.from(name);
		const data = Buffer.from(contents);
		const crc = crc32(data);
		const local = Buffer.alloc(30);
		local.writeUInt32LE(0x04034b50, 0);
		local.writeUInt16LE(20, 4);
		local.writeUInt16LE(0, 6);
		local.writeUInt16LE(0, 8);
		local.writeUInt32LE(crc, 14);
		local.writeUInt32LE(data.length, 18);
		local.writeUInt32LE(data.length, 22);
		local.writeUInt16LE(name_buffer.length, 26);
		chunks.push(local, name_buffer, data);

		const header = Buffer.alloc(46);
		header.writeUInt32LE(0x02014b50, 0);
		header.writeUInt16LE(20, 4);
		header.writeUInt16LE(20, 6);
		header.writeUInt16LE(0, 8);
		header.writeUInt16LE(0, 10);
		header.writeUInt32LE(crc, 16);
		header.writeUInt32LE(data.length, 20);
		header.writeUInt32LE(data.length, 24);
		header.writeUInt16LE(name_buffer.length, 28);
		header.writeUInt32LE(offset, 42);
		central.push(header, name_buffer);
		offset += local.length + name_buffer.length + data.length;
	}
	const central_size = central.reduce(
		(size, chunk) => size + chunk.length,
		0,
	);
	const end = Buffer.alloc(22);
	end.writeUInt32LE(0x06054b50, 0);
	end.writeUInt16LE(Object.keys(files).length, 8);
	end.writeUInt16LE(Object.keys(files).length, 10);
	end.writeUInt32LE(central_size, 12);
	end.writeUInt32LE(offset, 16);
	return Buffer.concat([...chunks, ...central, end]);
}

function crc32(buffer: Buffer): number {
	let crc = 0xffffffff;
	for (const byte of buffer) {
		crc ^= byte;
		for (let bit = 0; bit < 8; bit += 1) {
			crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
		}
	}
	return (crc ^ 0xffffffff) >>> 0;
}

function xml_escape(value: string): string {
	return value
		.replace(/&/gu, '&amp;')
		.replace(/</gu, '&lt;')
		.replace(/>/gu, '&gt;');
}
