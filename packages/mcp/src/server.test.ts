import { describe, expect, it } from 'vitest';
import { create_mcp_server } from './server.js';

describe('create_mcp_server', () => {
	it('creates a tmcp server instance', () => {
		expect(create_mcp_server()).toBeTruthy();
	});
});
