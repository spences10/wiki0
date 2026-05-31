import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
	assert_mcp_writable,
	mcp_root,
	mcp_safety_config,
} from './safety.js';

const original_allowed_roots = process.env.WIKI0_ALLOWED_ROOTS;
const original_read_only = process.env.WIKI0_READ_ONLY;
const temp_roots: string[] = [];

afterEach(() => {
	process.env.WIKI0_ALLOWED_ROOTS = original_allowed_roots;
	process.env.WIKI0_READ_ONLY = original_read_only;
	for (const root of temp_roots.splice(0)) {
		rmSync(root, { recursive: true, force: true });
	}
});

describe('MCP safety', () => {
	it('reports configured allowlist and read-only mode', () => {
		const root = mkdtempSync(join(tmpdir(), 'wiki0-mcp-safe-'));
		temp_roots.push(root);
		process.env.WIKI0_ALLOWED_ROOTS = root;
		process.env.WIKI0_READ_ONLY = 'true';

		expect(mcp_safety_config()).toEqual({
			allowed_roots: [root],
			read_only: true,
		});
	});

	it('resolves wiki roots inside the allowlist', () => {
		const root = make_wiki_root();
		process.env.WIKI0_ALLOWED_ROOTS = root;

		expect(mcp_root(join(root, 'wiki'))).toBe(root);
	});

	it('rejects wiki roots outside the allowlist', () => {
		const allowed_root = make_wiki_root();
		const blocked_root = make_wiki_root();
		process.env.WIKI0_ALLOWED_ROOTS = allowed_root;

		expect(() => mcp_root(blocked_root)).toThrow(
			'MCP root is outside allowed roots',
		);
	});

	it('blocks writes in read-only mode', () => {
		process.env.WIKI0_READ_ONLY = 'true';

		expect(() => assert_mcp_writable('create_page')).toThrow(
			'MCP server is read-only; create_page is not allowed',
		);
	});
});

function make_wiki_root(): string {
	const root = mkdtempSync(join(tmpdir(), 'wiki0-mcp-safe-'));
	mkdirSync(join(root, 'wiki'), { recursive: true });
	temp_roots.push(root);
	return root;
}
