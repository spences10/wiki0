// Syntax highlighting for the code the page shows, done once when the
// page is prerendered so no highlighter ships to the browser. Same
// twinkleplop grammars as the local docs browser.
import { language as bash } from '@twinkleplop/bash';
import { language as json } from '@twinkleplop/json';
import { language as markdown } from '@twinkleplop/markdown';
import { create_renderer } from '@twinkleplop/markdown-core';

const renderer = create_renderer({
	languages: { bash: bash(), json: json(), markdown: markdown() },
	on_unknown_language: 'plain',
});

/**
 * Highlighted HTML for `code`. `meta` takes fence meta such as
 * `showLineNumbers{5} {5-12}`.
 */
export function highlight(
	code: string,
	language: 'bash' | 'json' | 'markdown',
	meta?: string,
): string {
	const html = renderer.fence(language, meta, code);
	if (!html) throw new Error(`could not highlight ${language}`);
	return html;
}
