import { readFileSync } from 'node:fs';
import { mcp_safety_config } from './safety.js';

type PackageJson = {
	name?: string;
	version?: string;
};

export type Wiki0Info = {
	name: string;
	version: string;
	serverType: string;
	capabilities: {
		tools: boolean;
		prompts: boolean;
		resources: boolean;
	};
	features: string[];
	safety: {
		readOnly: boolean;
		allowedRoots: string[];
	};
};

export function wiki0_info(): Wiki0Info {
	const package_json = read_package_json();
	const safety = mcp_safety_config();
	return {
		name: package_json.name ?? '@wiki0/mcp',
		version: package_json.version ?? '0.0.0',
		serverType: process.env.WIKI0_SERVER_TYPE ?? 'unknown',
		capabilities: {
			tools: true,
			prompts: true,
			resources: true,
		},
		safety,
		features: [
			'wiki-page-io',
			'wiki-indexing',
			'wiki-index-status',
			'wiki-search',
			'wiki-context',
			'wiki-chunk-context',
			'wiki-show-chunk',
			'wiki-graph',
			'wiki-lint',
			'wiki-review',
			'wiki-facts',
			'wiki-planning',
			'wiki-building-prompt',
			'wiki-bootstrap',
			'wiki-bootstrap-source-ingestion',
			'structured-json-responses',
			'tool-execution-errors',
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
