import { describe, expect, it } from 'vite-plus/test';
import { skill_text } from './skill.js';

describe('skill_text', () => {
	it('returns the skill with a one-line description', () => {
		const text = skill_text();

		expect(text).toMatch(
			/^---\n# prettier-ignore\nname: wiki0\ndescription: .+\n---\n/u,
		);
		expect(text).toContain('wiki0/cli check');
	});
});
