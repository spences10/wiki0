<script lang="ts">
	import CopyButton from '#lib/components/copy-button.svelte';

	let {
		citation,
		tokens,
		code,
		repo,
	}: {
		citation: string;
		tokens: number;
		code: { from: number; to: number; html: string };
		repo: string;
	} = $props();

	const [path, range] = $derived(
		citation.split(':') as [string, string],
	);
	const folders = $derived(path.split('/').slice(0, -1));
	const file = $derived(path.split('/').at(-1) ?? path);
	const prompt =
		'Use pnpx @wiki0/cli to find where we decided how the index is stored.';
</script>

<div class="band hero">
	<nav
		class="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-8"
		aria-label="Site"
	>
		<a
			href="/"
			class="flex items-center gap-2.5 text-lg font-semibold"
			aria-label="wiki0 home"
		>
			<svg class="mark size-8" viewBox="0 0 32 32" aria-hidden="true">
				<rect width="32" height="32" rx="7" fill="#ffffff" />
				<ellipse
					class="ring"
					cx="16"
					cy="16"
					rx="7"
					ry="9.5"
					fill="none"
					stroke="#6d28d9"
					stroke-width="3"
					pathLength="1"
				/>
				<path
					class="slash"
					d="M11.5 22.5 20.5 9.5"
					stroke="#6d28d9"
					stroke-width="3"
					stroke-linecap="round"
					pathLength="1"
				/>
			</svg>
			wiki0
		</a>
		<ul class="flex items-center gap-1 text-sm">
			<li>
				<a class="rounded-md px-3 py-1.5 hover:bg-muted" href="#use"
					>Use it</a
				>
			</li>
			<li>
				<a class="rounded-md px-3 py-1.5 hover:bg-muted" href={repo}
					>GitHub</a
				>
			</li>
		</ul>
	</nav>

	<section
		aria-labelledby="hero-title"
		class="mx-auto grid max-w-7xl gap-12 px-4 pt-10 pb-24 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:pt-16 lg:pb-32"
	>
		<div class="grid min-w-0 content-start gap-7">
			<h1 id="hero-title" class="headline">
				Docs search for your <span class="marked">coding agent</span>.
			</h1>
			<p class="lede">
				wiki0 indexes the Markdown in your repo. Your agent asks a
				question and gets back the relevant section, the current one,
				with the file and line it came from, instead of reading every
				file.
			</p>
			<div class="grid max-w-136 gap-2">
				<p class="text-sm text-muted-foreground">Ask your agent:</p>
				<div
					class="flex items-start gap-2 rounded-xl border bg-card py-2.5 pr-2 pl-4"
				>
					<p class="flex-1 py-0.5">{prompt}</p>
					<CopyButton text={prompt} label="Copy prompt" />
				</div>
			</div>
		</div>

		<figure class="editor" aria-label="The cited section, {citation}">
			<div class="titlebar" aria-hidden="true">
				<span class="lights">
					<span></span><span></span><span></span>
				</span>
				<span class="tab">
					<svg
						viewBox="0 0 16 16"
						class="size-3.5"
						aria-hidden="true"
					>
						<path
							d="M2 4.5h12v7H2zM4 9.5v-3l1.5 1.8L7 6.5v3m3-3v3m-1.3-1.3L10 9.5l1.3-1.3"
							fill="none"
							stroke="currentColor"
							stroke-width="1.1"
							stroke-linejoin="round"
						/>
					</svg>
					{file}
				</span>
			</div>
			<p class="crumbs">
				{#each folders as folder (folder)}
					<span>{folder}</span><span class="sep" aria-hidden="true"
						>›</span
					>
				{/each}
				<span class="current">{file}</span>
			</p>
			<div class="code">
				<!-- Highlighted at build time from this repo's own docs -->
				{@html code.html}
				<span
					class="cite-tag"
					style:--top={(Number(range.split('-')[0]) - code.from) /
						(code.to - code.from + 1)}
				>
					cited :{range}
				</span>
			</div>
			<figcaption class="statusbar">
				<span>Markdown</span>
				<span>Lines {range} cited</span>
				<span>{tokens} tokens</span>
			</figcaption>
		</figure>
	</section>
</div>

<style>
	.headline {
		font-size: clamp(2.6rem, 4.6vw, 4.9rem);
		font-stretch: 125%;
		font-weight: 800;
		line-height: 1;
		letter-spacing: -0.04em;
	}

	/* A hand-drawn stroke under the words that matter */
	.marked {
		--stroke: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 24' preserveAspectRatio='none'%3E%3Cpath d='M4 16 C 50 6, 96 20, 150 11 S 250 4, 296 14' fill='none' stroke='%23c4b5fd' stroke-width='6' stroke-linecap='round'/%3E%3C/svg%3E");
		padding-bottom: 0.12em;
		white-space: nowrap;
		background: var(--stroke) left bottom / 100% 0.28em no-repeat;
	}

	.lede {
		max-width: 34rem;
		font-size: clamp(1.1rem, 1.5vw, 1.3rem);
		color: var(--muted-foreground);
	}

	/* A dark editor on the violet band */
	.editor {
		--editor: #1c0a3d;
		--editor-line: color-mix(in oklab, #ffffff 9%, var(--editor));
		min-width: 0;
		overflow: hidden;
		border: 1px solid color-mix(in oklab, #ffffff 16%, var(--editor));
		border-radius: 0.9rem;
		background: var(--editor);
		color: #ede9fe;
		box-shadow: 0 50px 90px -40px rgb(10 2 30 / 0.85);
	}

	.titlebar {
		display: flex;
		align-items: stretch;
		gap: 1rem;
		padding-left: 0.9rem;
		background: color-mix(in oklab, #000000 25%, var(--editor));
		font-size: 0.78rem;
	}

	.lights {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.lights span {
		width: 0.65rem;
		height: 0.65rem;
		border-radius: 999px;
		background: color-mix(in oklab, #ffffff 22%, var(--editor));
	}

	.tab {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.55rem 0.9rem;
		background: var(--editor);
		border-top: 2px solid #c4b5fd;
		font-family: var(--font-mono);
	}

	.crumbs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		padding: 0.45rem 1rem;
		border-bottom: 1px solid var(--editor-line);
		font-size: 0.75rem;
		color: #a99bcf;
	}

	.crumbs .current {
		color: #ede9fe;
	}

	.code {
		position: relative;
		font-size: clamp(0.72rem, 0.95vw, 0.88rem);
	}

	.code :global(.twinkleplop) {
		margin: 0;
		padding-block: 0.75rem;
		background: transparent;
		color: #ede9fe;
		line-height: 1.75;
		white-space: pre-wrap;
		overflow: hidden;
	}

	.code :global(.twinkleplop code) {
		display: grid;
		width: 100%;
	}

	/* Each line wraps under its own text, its number in the gutter */
	.code :global(.l) {
		position: relative;
		display: block;
		min-height: 1lh;
		padding: 0 1rem 0 3.75rem;
		overflow-wrap: anywhere;
	}

	.code :global(.ln) {
		position: absolute;
		left: 0;
		width: 2.75rem;
		text-align: right;
		color: #7d6ea8;
		user-select: none;
	}

	.code :global(.l.highlight) {
		background: rgb(196 181 253 / 0.14);
		box-shadow: inset 3px 0 0 #c4b5fd;
	}

	.code :global(.l.highlight .ln) {
		color: #e9d5ff;
	}

	/* Markdown tokens */
	.code :global(.heading_marker) {
		color: #a78bfa;
	}

	.code :global(.heading) {
		color: #ffffff;
		font-weight: 700;
	}

	.code :global(.code) {
		color: #fde68a;
	}

	.code :global(:is(.link_text, .link_text_open, .link_text_close)) {
		color: #93c5fd;
	}

	.code :global(:is(.link_destination, .url)) {
		color: #a5b4fc;
		text-decoration: underline;
		text-decoration-color: rgb(165 180 252 / 0.4);
	}

	.code :global([class*='front_matter']) {
		color: #8b7db5;
	}

	.cite-tag {
		position: absolute;
		top: calc(0.75rem + var(--top) * (100% - 1.5rem));
		right: 0.75rem;
		padding: 0.1rem 0.55rem;
		border-radius: 999px;
		background: #c4b5fd;
		color: #2e1065;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		font-weight: 700;
	}

	.statusbar {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1.25rem;
		padding: 0.4rem 1rem;
		background: #6d28d9;
		color: #f5f3ff;
		font-size: 0.72rem;
	}

	/* One sequence on load: the mark draws, the editor settles in, then
	   the cited lines light up and are tagged. */
	@media (prefers-reduced-motion: no-preference) {
		.ring,
		.slash {
			stroke-dasharray: 1;
			stroke-dashoffset: 1;
		}
		.ring {
			animation: draw 0.7s cubic-bezier(0.65, 0, 0.35, 1) 0.1s
				forwards;
		}
		.slash {
			animation: draw 0.3s ease-out 0.7s forwards;
		}
		.headline {
			animation: land 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) 0.1s both;
		}
		.marked {
			animation: underline 0.8s cubic-bezier(0.65, 0, 0.35, 1) 0.8s
				both;
		}
		.editor {
			animation: rise 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) 0.25s both;
		}
		.code :global(.l.highlight) {
			animation: light 0.6s ease-out calc(1s + var(--i, 0) * 60ms)
				both;
		}
		.cite-tag {
			animation: pop 0.5s cubic-bezier(0.2, 1.5, 0.4, 1) 1.5s both;
		}
	}

	@keyframes underline {
		from {
			background-size: 0% 0.28em;
		}
	}

	@keyframes draw {
		to {
			stroke-dashoffset: 0;
		}
	}

	@keyframes land {
		from {
			opacity: 0;
			transform: translateY(0.75rem);
		}
	}

	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(2rem) scale(0.97);
		}
	}

	@keyframes light {
		from {
			background: transparent;
			box-shadow: inset 0 0 0 #c4b5fd;
		}
	}

	@keyframes pop {
		from {
			opacity: 0;
			transform: scale(0.4);
		}
	}
</style>
