import { readFileSync } from 'node:fs';
import { mcp_safety_config, type McpSafetyConfig } from './safety.js';

type PackageJson = {
	name?: string;
	version?: string;
};

export type Wiki0Info = {
	name: string;
	version: string;
	server_type: string;
	capabilities: {
		tools: boolean;
		prompts: boolean;
		resources: boolean;
	};
	features: string[];
	safety: McpSafetyConfig;
};

export function wiki0_info(): Wiki0Info {
	const package_json = read_package_json();
	const safety = mcp_safety_config();
	return {
		name: package_json.name ?? '@wiki0/mcp',
		version: package_json.version ?? '0.0.0',
		server_type: process.env.WIKI0_SERVER_TYPE ?? 'unknown',
		capabilities: {
			tools: true,
			prompts: false,
			resources: false,
		},
		safety,
		features: [
			'project-doc-index',
			'cache-index-location',
			'heading-chunks',
			'authority-ranking',
			'superseded-detection',
			'cited-sections',
			'markdown-and-wikilink-resolution',
			'link-lint',
			'changed-doc-checks',
			'link-graph',
			'stale-index-warnings',
			'structured-json-responses',
			'mcp-root-allowlist',
			'mcp-read-only-mode',
		],
	};
}

function read_package_json(): PackageJson {
	try {
		return JSON.parse(
			readFileSync(
				new URL('../package.json', import.meta.url),
				'utf-8',
			),
		) as PackageJson;
	} catch {
		return {};
	}
}
