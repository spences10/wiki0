<script lang="ts">
	import Section from '#lib/components/section.svelte';

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
</script>

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

	<div class="chat scrub-in" aria-label="Asking an agent">
		<p class="bubble">{prompt}</p>
		<p class="run">
			<span class="text-muted-foreground">$</span>
			{command}
			<span class="block text-muted-foreground"
				>http://127.0.0.1:4100/#token=…</span
			>
		</p>
	</div>

	<ul class="fan">
		{#each shots as shot, index (shot.name)}
			<li class="window" style:--i={index - 1}>
				<div class="chrome" aria-hidden="true">
					<span class="flex gap-1.5">
						<span class="size-2.5 rounded-full bg-foreground/15"
						></span>
						<span class="size-2.5 rounded-full bg-foreground/15"
						></span>
						<span class="size-2.5 rounded-full bg-foreground/15"
						></span>
					</span>
					<span class="address">127.0.0.1:4100</span>
				</div>
				<picture>
					<source
						srcset="/shots/{shot.name}-dark.webp"
						media="(prefers-color-scheme: dark)"
					/>
					<img
						src="/shots/{shot.name}-light.webp"
						alt={shot.alt}
						width="1440"
						height="900"
						loading="lazy"
						decoding="async"
					/>
				</picture>
				<p class="caption">{shot.caption}</p>
			</li>
		{/each}
	</ul>
</Section>

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
		view-timeline: --fan block;
	}

	@media (min-width: 56rem) {
		.fan {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 1.25rem;
		}
	}

	.window {
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: var(--radius-xl);
		background: var(--card);
		box-shadow: 0 30px 60px -30px
			color-mix(in oklab, var(--foreground) 45%, transparent);
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

	.window img {
		display: block;
		width: 100%;
		height: auto;
	}

	.caption {
		padding: 0.7rem 0.9rem;
		border-top: 1px solid var(--border);
		font-size: 0.95rem;
	}

	/* Scrolled through on a wide screen: the windows arrive stacked in
	   the middle and fan out into a row. */
	@media (prefers-reduced-motion: no-preference) and (min-width: 56rem) {
		@supports (animation-timeline: view()) {
			.window {
				animation: fan linear both;
				animation-timeline: --fan;
				animation-range: entry 20% cover 50%;
			}
			.window:nth-child(2) {
				z-index: 1;
			}
		}
	}

	@keyframes fan {
		from {
			transform: translateX(
					calc(var(--i) * -100% - var(--i) * 1.25rem)
				)
				rotate(calc(var(--i) * -5deg)) scale(0.92);
		}
	}
</style>
