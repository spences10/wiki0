import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lint_wiki } from './lint.js';
import { make_wiki_root } from './test-utils.js';
import {
	bootstrap_wiki,
	plan_wiki,
	wiki_building_workflow_markdown,
} from './workflow.js';

describe('wiki building workflow', () => {
	it('describes a general source-to-wiki workflow', () => {
		expect(wiki_building_workflow_markdown).toContain(
			'build, bootstrap, generate, or improve a wiki',
		);
		expect(wiki_building_workflow_markdown).toContain('index_wiki');
		expect(wiki_building_workflow_markdown).toContain('lint_wiki');
	});

	it('plans common wiki pages for arbitrary source material', () => {
		const plan = plan_wiki({ scope: 'meeting notes' });

		expect(plan.source_type).toBe('general');
		expect(plan.scope).toBe('meeting notes');
		expect(plan.pages.map((page) => page.path)).toContain('index');
		expect(plan.pages.map((page) => page.path)).toContain(
			'questions/open-questions',
		);
	});

	it('adds source-specific pages for codebases', () => {
		const plan = plan_wiki({
			source_type: 'codebase',
			scope: 'repo',
		});

		expect(plan.pages.map((page) => page.path)).toContain(
			'architecture/overview',
		);
		expect(plan.pages.map((page) => page.path)).toContain(
			'packages/index',
		);
	});

	it('bootstraps starter pages and indexes them', () => {
		const root = make_wiki_root();
		const result = bootstrap_wiki({
			root,
			source_type: 'docs',
			scope: 'docs folder',
		});

		expect(result.created).toContain('index');
		expect(result.created).toContain('docs/documentation-map');
		expect(result.ingested_sources).toEqual([]);
		expect(result.indexed.page_count).toBe(result.created.length);
		expect(
			readFileSync(join(root, 'wiki/index.md'), 'utf-8'),
		).toContain('[[sources/index|Sources]]');
		expect(lint_wiki(root).ok).toBe(true);
	});

	it('can ingest detected sources into source note pages', () => {
		const root = make_wiki_root();
		mkdirSync(join(root, 'docs'));
		writeFileSync(
			join(root, 'docs/guide.md'),
			'# Guide\n\nThe guide should preserve source quotes.\nFact candidate.\n',
		);
		const result = bootstrap_wiki({
			root,
			source_type: 'docs',
			scope: 'docs plus https://example.com/research',
			sources: ['docs/guide.md'],
			ingest_sources: true,
		});

		expect(result.ingested_sources).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					source: 'docs/guide.md',
					kind: 'file',
				}),
				expect.objectContaining({
					source: 'https://example.com/research',
					kind: 'url',
				}),
			]),
		);
		const source_note = readFileSync(
			join(root, 'wiki/sources/detected/docs-guide-md.md'),
			'utf-8',
		);
		expect(source_note).toContain('Fact candidate.');
		expect(source_note).toContain(
			'Candidate from line 3: The guide should preserve source quotes.',
		);
		expect(lint_wiki(root).ok).toBe(true);
	});

	it('skips existing pages unless overwrite is enabled', () => {
		const root = make_wiki_root();
		bootstrap_wiki({ root, source_type: 'general' });
		const second = bootstrap_wiki({ root, source_type: 'general' });

		expect(second.created).toEqual([]);
		expect(second.skipped).toContain('index');
	});
});
