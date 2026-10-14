<script lang="ts">
	import Section from '#lib/components/section.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Reveal } from '#lib/motion/reveal.svelte.js';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { cubicOut } from 'svelte/easing';
	import { fly } from 'svelte/transition';

	const prompt = 'Use pnpx @wiki0/cli and show me the docs.';
	const command = 'pnpx @wiki0/cli ui';
	const shots = [
		{
			name: 'docs-superseded',
			alt: 'The replaced decision rendered in the docs browser, with a notice pointing to the decision that replaced it',
			caption: 'A replaced doc points to the one that replaced it.',
		},
		{
			name: 'search',
			alt: 'Search results for “index in the project folder”, each with its citation and score',
			caption: 'Search, with the citation and score for each result.',
		},
		{
			name: 'graph',
			alt: 'The link graph in the docs browser’s health area',
			caption: 'Index health: status, lint and the link graph.',
		},
	];

	const fan = new Reveal();
	let open = $state(false);
	// The thumbnail that opened the large view, to return focus to
	let opener: HTMLElement | null = null;
	let viewing = $state(0);
	// Which way the large view slides when you step through it
	let step = $state(1);
	const shot = $derived(shots[viewing] ?? shots[0]!);

	function show(index: number) {
		step = index >= viewing ? 1 : -1;
		viewing = (index + shots.length) % shots.length;
	}

	function on_key(event: KeyboardEvent) {
		if (event.key === 'ArrowRight') show(viewing + 1);
		if (event.key === 'ArrowLeft') show(viewing - 1);
	}
</script>

{#snippet picture(name: string, alt: string, eager = false)}
	<picture>
		<source
			srcset="/shots/{name}-dark.webp"
			media="(prefers-color-scheme: dark)"
		/>
		<img
			src="/shots/{name}-light.webp"
			{alt}
			width="1440"
			height="900"
			loading={eager ? 'eager' : 'lazy'}
			decoding="async"
		/>
	</picture>
{/snippet}

<Section id="ui" title="“Show me the docs”">
	{#snippet copy()}
		<p>
			To read what your agent cites, ask it to show you. It runs <code
				class="font-mono text-[0.9em]">wiki0 ui</code
			>, which starts a local docs browser and prints its address.
			Every doc is rendered with working links, search opens a result
			at its cited lines, and the health area shows the index, lint
			and the link graph.
		</p>
	{/snippet}

	<div class="chat" aria-label="Asking an agent">
		<p class="bubble">{prompt}</p>
		<p class="run">
			<span class="text-muted-foreground">$</span>
			{command}
			<span class="block text-muted-foreground"
				>http://127.0.0.1:4100/#token=…</span
			>
		</p>
	</div>

	<ul class="fan" data-seen={fan.seen} {@attach fan.attach}>
		{#each shots as item, index (item.name)}
			<li class="window" style:--i={index - 1}>
				<button
					type="button"
					class="open"
					aria-label="View larger: {item.caption}"
					onclick={(event) => {
						opener = event.currentTarget;
						show(index);
						open = true;
					}}
				>
					<span class="chrome" aria-hidden="true">
						<span class="flex gap-1.5">
							<span class="size-2.5 rounded-full bg-foreground/15"
							></span>
							<span class="size-2.5 rounded-full bg-foreground/15"
							></span>
							<span class="size-2.5 rounded-full bg-foreground/15"
							></span>
						</span>
						<span class="address">127.0.0.1:4100</span>
					</span>
					{@render picture(item.name, item.alt)}
					<span class="caption">{item.caption}</span>
				</button>
			</li>
		{/each}
	</ul>
</Section>

<Dialog.Root bind:open>
	<Dialog.Content
		class="w-[min(94vw,88rem)] max-w-none gap-3 p-3 sm:max-w-none"
		onkeydown={on_key}
		onCloseAutoFocus={(event) => {
			// Back to the thumbnail without scrolling the page
			event.preventDefault();
			opener?.focus({ preventScroll: true });
		}}
	>
		<Dialog.Title class="pr-10 text-base">{shot.caption}</Dialog.Title
		>
		<div class="viewer">
			{#key viewing}
				<div
					class="slide"
					in:fly={{ x: step * 60, duration: 350, easing: cubicOut }}
					out:fly={{ x: step * -60, duration: 250 }}
				>
					{@render picture(shot.name, shot.alt, true)}
				</div>
			{/key}
		</div>
		<div class="flex items-center justify-between gap-2">
			<Button
				variant="outline"
				size="sm"
				onclick={() => show(viewing - 1)}
				aria-label="Previous screenshot"
			>
				<ChevronLeft aria-hidden="true" /> Previous
			</Button>
			<p class="text-xs text-muted-foreground">
				{viewing + 1} of {shots.length}
			</p>
			<Button
				variant="outline"
				size="sm"
				onclick={() => show(viewing + 1)}
				aria-label="Next screenshot"
			>
				Next <ChevronRight aria-hidden="true" />
			</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>

<style>
	.chat {
		display: grid;
		gap: 0.75rem;
		max-width: 34rem;
		font-size: 1.05rem;
	}

	.bubble {
		justify-self: start;
		padding: 0.7rem 1.1rem;
		border-radius: 1.2rem 1.2rem 1.2rem 0.3rem;
		background: var(--signal);
		color: #ffffff;
	}

	.run {
		justify-self: start;
		padding: 0.6rem 0.9rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--card);
		font-family: var(--font-mono);
		font-size: 0.85rem;
	}

	.fan {
		display: grid;
		gap: 1.5rem;
	}

	@media (min-width: 56rem) {
		.fan {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 1.25rem;
		}
	}

	.window {
		transition: transform 1s cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.open {
		display: block;
		width: 100%;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: var(--radius-xl);
		background: var(--card);
		text-align: left;
		box-shadow: 0 30px 60px -30px
			color-mix(in oklab, var(--foreground) 45%, transparent);
		cursor: zoom-in;
		transition:
			transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1),
			box-shadow 0.3s;
	}

	.open:hover {
		transform: translateY(-4px);
		box-shadow: 0 40px 70px -30px
			color-mix(in oklab, var(--signal) 55%, transparent);
	}

	.open:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 3px;
	}

	.chrome {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--border);
	}

	.address {
		flex: 1;
		padding: 0.1rem 0.6rem;
		border-radius: var(--radius-md);
		background: var(--muted);
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--muted-foreground);
	}

	.open :global(img),
	.slide :global(img) {
		display: block;
		width: 100%;
		height: auto;
	}

	.caption {
		display: block;
		padding: 0.7rem 0.9rem;
		border-top: 1px solid var(--border);
		font-size: 0.95rem;
	}

	.viewer {
		display: grid;
		overflow: hidden;
		border-radius: var(--radius-lg);
		border: 1px solid var(--border);
	}

	.slide {
		grid-area: 1 / 1;
		display: grid;
		place-items: center;
	}

	/* The whole screenshot fits the window */
	.slide :global(img) {
		width: auto;
		max-width: 100%;
		max-height: calc(100dvh - 10rem);
	}

	/* On a wide screen the windows arrive stacked in the middle and
	   fan out into a row */
	@media (min-width: 56rem) {
		.fan[data-seen='false'] .window {
			transform: translateX(
					calc(var(--i) * -100% - var(--i) * 1.25rem)
				)
				rotate(calc(var(--i) * -5deg)) scale(0.92);
		}
		.window:nth-child(2) {
			position: relative;
			z-index: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.window,
		.open {
			transition: none;
		}
	}
</style>
