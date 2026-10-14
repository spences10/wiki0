import { language as bash } from '@twinkleplop/bash';
import { language as c } from '@twinkleplop/c';
import { language as cpp } from '@twinkleplop/cpp';
import { language as css } from '@twinkleplop/css';
import { language as diff } from '@twinkleplop/diff';
import { language as dockerfile } from '@twinkleplop/dockerfile';
import { language as go } from '@twinkleplop/go';
import { language as graphql } from '@twinkleplop/graphql';
import { language as html } from '@twinkleplop/html';
import { language as ini } from '@twinkleplop/ini';
import { language as javascript } from '@twinkleplop/javascript';
import { language as json } from '@twinkleplop/json';
import { language as markdown } from '@twinkleplop/markdown';
import {
	create_renderer,
	split_info,
} from '@twinkleplop/markdown-core';
import { language as python } from '@twinkleplop/python';
import { language as rust } from '@twinkleplop/rust';
import { language as sql } from '@twinkleplop/sql';
import { language as svelte } from '@twinkleplop/svelte';
import { language as toml } from '@twinkleplop/toml';
import { language as tsx } from '@twinkleplop/tsx';
import { language as typescript } from '@twinkleplop/typescript';
import { language as yaml } from '@twinkleplop/yaml';
import { escape_html } from './html.js';

// Grammars for what project docs commonly fence; anything else
// renders as escaped plain text in the same block markup.
const renderer = create_renderer({
	languages: {
		bash: bash(),
		c: c(),
		cpp: cpp(),
		css: css(),
		diff: diff(),
		dockerfile: dockerfile(),
		go: go(),
		graphql: graphql(),
		html: html(),
		ini: ini(),
		javascript: javascript(),
		json: json(),
		markdown: markdown(),
		python: python(),
		rust: rust(),
		sql: sql(),
		svelte: svelte(),
		toml: toml(),
		tsx: tsx(),
		typescript: typescript(),
		yaml: yaml(),
		'c++': 'cpp',
		console: 'bash',
		docker: 'dockerfile',
		gql: 'graphql',
		js: 'javascript',
		json5: 'json',
		jsonc: 'json',
		jsx: 'tsx',
		md: 'markdown',
		mjs: 'javascript',
		patch: 'diff',
		py: 'python',
		rs: 'rust',
		sh: 'bash',
		shell: 'bash',
		ts: 'typescript',
		xml: 'html',
		yml: 'yaml',
		zsh: 'bash',
	},
	on_unknown_language: 'plain',
	// Lets keyboard users scroll wide code blocks
	render: { attributes: { tabindex: 0 } },
});

const labels: Record<string, string> = {
	bash: 'Bash',
	c: 'C',
	'c++': 'C++',
	console: 'Shell',
	cpp: 'C++',
	css: 'CSS',
	diff: 'Diff',
	docker: 'Dockerfile',
	dockerfile: 'Dockerfile',
	go: 'Go',
	gql: 'GraphQL',
	graphql: 'GraphQL',
	html: 'HTML',
	ini: 'INI',
	javascript: 'JavaScript',
	js: 'JavaScript',
	json: 'JSON',
	json5: 'JSON5',
	jsonc: 'JSONC',
	jsx: 'JSX',
	markdown: 'Markdown',
	md: 'Markdown',
	mjs: 'JavaScript',
	patch: 'Diff',
	py: 'Python',
	python: 'Python',
	rs: 'Rust',
	rust: 'Rust',
	sh: 'Shell',
	shell: 'Shell',
	sql: 'SQL',
	svelte: 'Svelte',
	toml: 'TOML',
	ts: 'TypeScript',
	tsx: 'TSX',
	typescript: 'TypeScript',
	xml: 'XML',
	yaml: 'YAML',
	yml: 'YAML',
	zsh: 'Zsh',
};

// `js:title` style suffixes aren't a twinkleplop convention, drop them
function normalise_language(language?: string | null) {
	const value = language?.toLowerCase().split(':', 1)[0];
	return value?.replaceAll(/[^a-z0-9_+-]/g, '-') || 'text';
}

export type HighlightedCode = {
	html: string;
	// Language name for the block header; empty for plain text.
	label: string;
};

/**
 * Highlights a fenced block from its info string (`ts {1,3-4}`).
 * Fence meta follows the Shiki/VitePress conventions; meta that
 * twinkleplop rejects (a highlight past the last line) is dropped
 * rather than failing the whole document.
 */
export function highlight_code(
	code: string,
	info?: string | null,
): HighlightedCode {
	const { lang, meta } = split_info(info ?? '');
	const normalised = normalise_language(lang);
	const label =
		normalised === 'text' ? '' : (labels[normalised] ?? normalised);
	for (const fence_meta of [meta || undefined, undefined]) {
		try {
			const html = renderer.fence(normalised, fence_meta, code);
			if (html) return { html, label };
		} catch {
			// Retry without meta, then fall back to plain text.
		}
	}
	return {
		html: `<pre class="twinkleplop language-text" tabindex="0"><code>${escape_html(code)}</code></pre>`,
		label,
	};
}
