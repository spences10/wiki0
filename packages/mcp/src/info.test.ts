import { describe, expect, it } from 'vite-plus/test';
import { wiki0_info } from './info.js';

describe('wiki0_info', () => {
	it('reports version, capabilities, and feature flags', () => {
		const info = wiki0_info();

		expect(info.name).toBe('@wiki0/mcp');
		expect(info.version).toMatch(/^\d+\.\d+\.\d+/u);
		expect(info.capabilities).toEqual({
			tools: true,
			prompts: false,
			resources: false,
		});
		expect(info.features).toContain('cited-sections');
		expect(info.features).toContain('structured-json-responses');
	});
});
