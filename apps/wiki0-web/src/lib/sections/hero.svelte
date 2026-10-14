<script lang="ts">
	import CopyButton from '#lib/components/copy-button.svelte';
	import { lines_of, type StoryDocument } from '#lib/story.js';

	let {
		current,
		citation,
		repo,
	}: { current: StoryDocument; citation: string; repo: string } =
		$props();

	const [path, range] = $derived(
		citation.split(':') as [string, string],
	);
	const [start, end] = $derived(
		range.split('-').map(Number) as [number, number],
	);
	const excerpt = $derived(
		lines_of(current.source)
			.slice(start - 1, end)
			.map((text, offset) => ({ number: start + offset, text })),
	);
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
		class="mx-auto grid max-w-7xl gap-12 px-4 pt-10 pb-24 sm:px-8 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:items-center lg:pt-20 lg:pb-32"
	>
		<div class="grid content-start gap-7">
			<h1 id="hero-title" class="headline">
				The right section of your docs, cited.
			</h1>
			<p class="lede">
				wiki0 searches the docs already in your repo and hands your
				coding agent the current section with its file and line range,
				so it reads a section instead of whole files.
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

		<figure class="card" aria-label="A wiki0 citation">
			<p class="cite font-mono">
				<span class="path">{path}</span><span class="range"
					>:{range}</span
				>
			</p>
			<ol class="excerpt font-mono">
				{#each excerpt as line, index (line.number)}
					<li style:--i={index}>
						<span class="number">{line.number}</span>
						<span class="text">{line.text || ' '}</span>
					</li>
				{/each}
			</ol>
			<figcaption class="text-sm text-muted-foreground">
				The current decision on where wiki0 keeps its index, cited
				from this repo's docs.
			</figcaption>
		</figure>
	</section>
</div>

<style>
	.headline {
		font-size: clamp(3rem, 7.4vw, 7rem);
		font-stretch: 125%;
		font-weight: 800;
		line-height: 0.92;
		letter-spacing: -0.045em;
		max-width: 11ch;
	}

	.lede {
		max-width: 34rem;
		font-size: clamp(1.1rem, 1.5vw, 1.3rem);
		color: var(--muted-foreground);
	}

	.card {
		display: grid;
		gap: 1rem;
		min-width: 0;
	}

	.cite {
		font-size: clamp(0.85rem, 1.3vw, 1.2rem);
		overflow-wrap: anywhere;
		line-height: 1.4;
	}

	.path {
		color: var(--muted-foreground);
	}

	.range {
		padding: 0.1em 0.4em;
		margin-left: 0.1em;
		border-radius: var(--radius-sm);
		background: #ffffff;
		color: #4c1d95;
		font-weight: 700;
	}

	.excerpt {
		padding-block: 0.9rem;
		border-radius: var(--radius-xl);
		background: #ffffff;
		color: #1f1235;
		font-size: clamp(0.75rem, 1vw, 0.95rem);
		line-height: 1.65;
		box-shadow: 0 40px 80px -30px rgb(15 5 40 / 0.6);
	}

	.excerpt li {
		display: grid;
		grid-template-columns: 3rem minmax(0, 1fr);
		padding-inline-end: 1rem;
		background: color-mix(in oklab, #7c3aed 9%, transparent);
		box-shadow: inset 3px 0 0 #7c3aed;
	}

	.number {
		color: #7c6a9c;
		text-align: right;
		padding-right: 1rem;
		user-select: none;
	}

	.text {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	/* One sequence on load: the mark draws, the path types out, the
	   range lands, then its lines unfold. */
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
		.cite .path {
			display: inline-block;
			clip-path: inset(0 100% 0 0);
			animation: type 0.9s steps(40, end) 0.35s forwards;
		}
		.cite .range {
			display: inline-block;
			animation: pop 0.55s cubic-bezier(0.2, 1.5, 0.4, 1) 1.25s both;
		}
		.excerpt li {
			animation: land 0.45s ease-out calc(1.6s + var(--i) * 0.05s)
				both;
		}
	}

	@keyframes draw {
		to {
			stroke-dashoffset: 0;
		}
	}

	@keyframes type {
		to {
			clip-path: inset(0 0 0 0);
		}
	}

	@keyframes pop {
		from {
			opacity: 0;
			transform: translateY(0.4em) scale(1.5);
		}
	}

	@keyframes land {
		from {
			opacity: 0;
			transform: translateY(1rem);
		}
	}
</style>
