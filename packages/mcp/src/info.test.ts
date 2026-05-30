import { describe, expect, it } from 'vitest';
import { wiki0_info } from './info.js';

describe('wiki0_info', () => {
	it('reports version, capabilities, and feature flags', () => {
		const info = wiki0_info();

		expect(info.name).toBe('@wiki0/mcp');
		expect(info.version).toMatch(/^\d+\.\d+\.\d+/u);
		expect(info.capabilities).toEqual({
			tools: true,
			prompts: true,
			resources: true,
		});
		expect(info.features).toContain('wiki-planning');
		expect(info.features).toContain('structured-json-responses');
	});
});
