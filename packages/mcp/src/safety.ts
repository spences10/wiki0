import { resolve_wiki_root } from '@wiki0/core';
import { resolve } from 'node:path';

export type McpSafetyConfig = {
	allowed_roots: string[];
	read_only: boolean;
};

export function mcp_safety_config(): McpSafetyConfig {
	return {
		allowed_roots: parse_allowed_roots(),
		read_only: parse_boolean(process.env.WIKI0_READ_ONLY),
	};
}

export function mcp_root(root = '.'): string {
	const requested_root = resolve(root);
	const wiki_root = resolve_wiki_root(requested_root);
	const allowed_roots = parse_allowed_roots();
	if (!is_allowed(wiki_root, allowed_roots)) {
		throw new Error(
			`MCP root is outside allowed roots. Configure WIKI0_ALLOWED_ROOTS to allow ${wiki_root}`,
		);
	}
	return wiki_root;
}

export function assert_mcp_writable(operation: string): void {
	if (!parse_boolean(process.env.WIKI0_READ_ONLY)) return;
	throw new Error(
		`MCP server is read-only; ${operation} is not allowed`,
	);
}

function is_allowed(root: string, allowed_roots: string[]): boolean {
	return allowed_roots.some(
		(allowed_root) =>
			root === allowed_root || root.startsWith(`${allowed_root}/`),
	);
}

function parse_allowed_roots(): string[] {
	const roots = process.env.WIKI0_ALLOWED_ROOTS?.split(',')
		.map((root) => root.trim())
		.filter(Boolean);
	return (roots && roots.length > 0 ? roots : [process.cwd()]).map(
		(root) => resolve(root),
	);
}

function parse_boolean(value: string | undefined): boolean {
	return value === '1' || value === 'true' || value === 'yes';
}
