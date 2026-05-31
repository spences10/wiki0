import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ingest_documents } from './ingest.js';
import { read_page } from './pages.js';
import { make_wiki_root } from './test-utils.js';

describe('ingest_documents', () => {
	it('recursively ingests supported documents into source pages and indexes them', async () => {
		const root = make_wiki_root();
		mkdirSync(join(root, 'docs/nested'), { recursive: true });
		writeFileSync(
			join(root, 'docs/guide.md'),
			'# Guide\n\nA decision must be recorded.',
		);
		writeFileSync(join(root, 'docs/nested/notes.txt'), 'Plain notes');
		writeFileSync(join(root, 'docs/skip.zip'), 'zip');

		const result = await ingest_documents({
			root,
			sources: ['docs'],
		});

		expect(result.created).toHaveLength(2);
		expect(result.indexed?.page_count).toBe(2);
		expect(
			result.ingested_sources.map((source) => source.kind),
		).toEqual(['markdown', 'text']);
		const guide = read_page(result.created[0] ?? '', root);
		expect(guide.content).toContain('A decision must be recorded.');
		expect(guide.content).toContain(
			'Candidate from extracted line 3: A decision must be recorded.',
		);
	});

	it('uses source fingerprints to report unchanged and changed pages', async () => {
		const root = make_wiki_root();
		writeFileSync(join(root, 'notes.txt'), 'First version');

		const first = await ingest_documents({
			root,
			sources: ['notes.txt'],
		});
		const unchanged = await ingest_documents({
			root,
			sources: ['notes.txt'],
		});
		writeFileSync(join(root, 'notes.txt'), 'Second version');
		const changed = await ingest_documents({
			root,
			sources: ['notes.txt'],
		});
		const updated = await ingest_documents({
			root,
			sources: ['notes.txt'],
			overwrite: true,
		});

		expect(first.created).toHaveLength(1);
		expect(unchanged.ingested_sources[0]).toMatchObject({
			kind: 'text',
			status: 'unchanged',
		});
		expect(changed.created).toHaveLength(0);
		expect(changed.skipped).toEqual(first.created);
		expect(changed.ingested_sources[0]).toMatchObject({
			kind: 'text',
			status: 'changed',
		});
		expect(updated.created).toEqual(first.created);
		expect(updated.ingested_sources[0]).toMatchObject({
			kind: 'text',
			status: 'updated',
		});
		expect(read_page(first.created[0] ?? '', root).content).toContain(
			'Second version',
		);
	});

	it('preserves full extracted text in generated Markdown', async () => {
		const root = make_wiki_root();
		const long_text = `${'A'.repeat(12_000)}\n${'`'.repeat(3)}\nTail marker`;
		writeFileSync(join(root, 'long.txt'), long_text);

		const result = await ingest_documents({
			root,
			sources: ['long.txt'],
		});

		const page = read_page(result.created[0] ?? '', root);
		expect(page.content).toContain('Tail marker');
		expect(page.content).toContain('````\n');
	});

	it('records missing sources as warning pages', async () => {
		const root = make_wiki_root();

		const result = await ingest_documents({
			root,
			sources: ['missing.pdf'],
		});

		expect(result.created).toHaveLength(1);
		expect(result.ingested_sources[0]).toMatchObject({
			kind: 'unsupported',
			status: 'warning',
		});
		const page = read_page(result.created[0] ?? '', root);
		expect(page.frontmatter.status).toBe('review');
		expect(page.content).toContain('Source could not be read:');
	});
});
