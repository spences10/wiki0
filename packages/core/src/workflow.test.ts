import { readFileSync } from 'node:fs';
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

		expect(plan.sourceType).toBe('general');
		expect(plan.scope).toBe('meeting notes');
		expect(plan.pages.map((page) => page.path)).toContain('index');
		expect(plan.pages.map((page) => page.path)).toContain(
			'questions/open-questions',
		);
	});

	it('adds source-specific pages for codebases', () => {
		const plan = plan_wiki({ sourceType: 'codebase', scope: 'repo' });

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
			sourceType: 'docs',
			scope: 'docs folder',
		});

		expect(result.created).toContain('index');
		expect(result.created).toContain('docs/documentation-map');
		expect(result.indexed.pageCount).toBe(result.created.length);
		expect(
			readFileSync(join(root, 'wiki/index.md'), 'utf-8'),
		).toContain('[[sources/index|Sources]]');
		expect(lint_wiki(root).ok).toBe(true);
	});

	it('skips existing pages unless overwrite is enabled', () => {
		const root = make_wiki_root();
		bootstrap_wiki({ root, sourceType: 'general' });
		const second = bootstrap_wiki({ root, sourceType: 'general' });

		expect(second.created).toEqual([]);
		expect(second.skipped).toContain('index');
	});
});
