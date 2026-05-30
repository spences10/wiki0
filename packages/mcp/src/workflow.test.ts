import { describe, expect, it } from 'vitest';
import { register_wiki_workflow } from './workflow.js';

describe('register_wiki_workflow', () => {
	it('registers a build prompt and workflow resource', () => {
		const prompts: unknown[] = [];
		const resources: unknown[] = [];
		register_wiki_workflow({
			prompt: (definition: unknown) => prompts.push(definition),
			resource: (definition: unknown) => resources.push(definition),
		});

		expect(prompts).toEqual([
			expect.objectContaining({ name: 'build_wiki' }),
		]);
		expect(resources).toEqual([
			expect.objectContaining({
				name: 'wiki-building-workflow',
				uri: 'wiki0://workflows/wiki-building',
			}),
		]);
	});
});
