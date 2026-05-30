import {
	plan_wiki,
	wiki_building_workflow_markdown,
} from '@wiki0/core';
import type { InferInput } from 'valibot';
import { PlanWikiSchema } from './schemas.js';

type PlanWikiInput = InferInput<typeof PlanWikiSchema>;

export function register_wiki_workflow(server: {
	prompt: (...args: any[]) => void;
	resource: (...args: any[]) => void;
}): void {
	server.resource(
		{
			name: 'wiki-building-workflow',
			description:
				'General wiki0 workflow for building a linked wiki from source material',
			uri: 'wiki0://workflows/wiki-building',
		},
		(uri: string) => ({
			contents: [
				{
					uri,
					mimeType: 'text/markdown',
					text: wiki_building_workflow_markdown,
				},
			],
		}),
	);

	server.prompt(
		{
			name: 'build_wiki',
			description:
				'Guide an agent to build a wiki0 wiki from code, docs, notes, research, or mixed source material',
			schema: PlanWikiSchema,
		},
		({ sourceType, scope }: PlanWikiInput) => {
			const plan = plan_wiki({ sourceType, scope });
			return {
				messages: [
					{
						role: 'user',
						content: {
							type: 'text',
							text: [
								'Build a wiki0 wiki from the requested source material.',
								'',
								`Source type: ${plan.sourceType}`,
								`Scope: ${plan.scope}`,
								'',
								plan.workflow,
								'## Starter page plan',
								...plan.pages.map(
									(page) =>
										`- ${page.path}: ${page.title} — ${page.purpose}`,
								),
								'',
								'Use wiki0 tools to create pages, add facts, index, lint, and review. Ask before overwriting existing pages.',
							].join('\n'),
						},
					},
				],
			};
		},
	);
}
