import { describe, expect, it } from 'vitest';
import {
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
});
