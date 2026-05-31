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

	it('skips existing source pages unless overwrite is enabled', async () => {
		const root = make_wiki_root();
		writeFileSync(join(root, 'notes.txt'), 'First version');

		const first = await ingest_documents({
			root,
			sources: ['notes.txt'],
		});
		writeFileSync(join(root, 'notes.txt'), 'Second version');
		const second = await ingest_documents({
			root,
			sources: ['notes.txt'],
		});

		expect(first.created).toHaveLength(1);
		expect(second.created).toHaveLength(0);
		expect(second.skipped).toEqual(first.created);
		expect(second.ingested_sources[0]).toMatchObject({
			status: 'skipped',
		});
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
