import type { HighlightedCode } from './highlighter.js';
import { escape_html } from './html.js';

// Lucide copy and check icons, inlined because the block is rendered
// to an HTML string, not as a component.
const copy_icon =
	'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-icon="copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
const check_icon =
	'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-icon="check" hidden><path d="M20 6 9 17l-5-5"/></svg>';

/**
 * A highlighted block with a language label and copy button, as an
 * HTML string for the rendered document. The copy button works
 * through a delegated click handler (see `handle_copy_click`), since
 * the CSP allows no inline handlers.
 */
export function render_code_block(
	{ html, label }: HighlightedCode,
	line_attributes: string,
): string {
	const badge = label
		? `<span class="inline-flex h-5 items-center rounded-4xl border border-border px-2 py-0.5 font-mono text-xs font-medium text-foreground">${escape_html(label)}</span>`
		: '';
	return [
		`<div class="not-prose code-block my-6 overflow-hidden rounded-lg border border-border bg-muted"${line_attributes}>`,
		'<div class="code-block-header flex items-center gap-2 border-b border-border py-1 pr-1.5 pl-(--code-gutter) font-ui">',
		badge,
		`<button type="button" class="ml-auto inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none [&_svg]:size-4" aria-label="Copy code" title="Copy code" data-copy-code>${copy_icon}${check_icon}</button>`,
		'<span class="sr-only" role="status" data-copy-status></span>',
		'</div>',
		html,
		'</div>',
	].join('');
}

/**
 * Click handler for a rendered document: copies the code of the block
 * whose copy button was pressed and flips its icon for two seconds.
 */
export async function handle_copy_click(
	event: Pick<MouseEvent, 'target'>,
	write_text: (text: string) => Promise<void> = (text) =>
		navigator.clipboard.writeText(text),
): Promise<void> {
	const target = event.target as Element | null;
	if (typeof target?.closest !== 'function') return;
	const button = target.closest('[data-copy-code]');
	const block = button?.closest('.code-block');
	const code = block?.querySelector('pre code');
	if (!button || !block || !code) return;

	const status = block.querySelector('[data-copy-status]');
	let message: string;
	try {
		await write_text(code.textContent ?? '');
		message = 'Copied';
	} catch {
		message = 'Copy failed';
	}
	if (status) status.textContent = message;
	button.setAttribute('title', message);
	const copied = message === 'Copied';
	button
		.querySelector('[data-icon="copy"]')
		?.toggleAttribute('hidden', copied);
	button
		.querySelector('[data-icon="check"]')
		?.toggleAttribute('hidden', !copied);
	setTimeout(() => {
		if (status) status.textContent = '';
		button.setAttribute('title', 'Copy code');
		button
			.querySelector('[data-icon="copy"]')
			?.removeAttribute('hidden');
		button
			.querySelector('[data-icon="check"]')
			?.setAttribute('hidden', '');
	}, 2000);
}
