<script lang="ts">
	import ChartBox from '#lib/components/chart-box.svelte';
	import Section from '#lib/components/section.svelte';
	import IndexSkyline from '#lib/scenes/index-skyline.svelte';
	import { Reveal } from '#lib/motion/reveal.svelte.js';
	import {
		lines_of,
		type Skyline,
		type StoryChunk,
		type StoryDocument,
	} from '#lib/story.js';

	let {
		current,
		chunks,
		skyline,
		counts,
	}: {
		current: StoryDocument;
		chunks: StoryChunk[];
		skyline: Skyline;
		counts: { documents: number; chunks: number; links: number };
	} = $props();

	const split = new Reveal();
	const rise = new Reveal();
	const lines = $derived(lines_of(current.source));
	const frontmatter_end = $derived(lines.indexOf('---', 1) + 1);
	const numbered = (from: number, to: number) =>
		lines
			.slice(from - 1, to)
			.map((text, offset) => ({ number: from + offset, text }));
	const metadata = $derived(
		lines
			.slice(1, frontmatter_end - 1)
			.filter((line) => /^(status|type|supersedes):/u.test(line))
			.map((line) =>
				line
					.replace(/\[|\]/gu, '')
					.replace(/wiki\/decisions\/(\d{4})-[^,]+\.md/gu, '$1'),
			),
	);
</script>

<Section id="index" title="It indexes the docs you already have">
	{#snippet copy()}
		<p>
			<code class="font-mono text-[0.9em]">wiki0 index</code> splits each
			Markdown file at its headings into sections that keep their exact
			line ranges. Frontmatter such as status and supersedes becomes data
			search can use. Nothing is written to your repo; the index lives in
			your user cache.
		</p>
	{/snippet}

	<div
		class="split-scene"
		data-seen={split.seen}
		{@attach split.attach}
	>
		<div
			class="file font-mono"
			aria-label="{current.path}, split into sections"
		>
			<p class="file-name">{current.path}</p>
			<div class="block front">
				<ol class="raw">
					{#each numbered(1, frontmatter_end) as line (line.number)}
						<li>
							<span class="number">{line.number}</span>
							<span class="text">{line.text || ' '}</span>
						</li>
					{/each}
				</ol>
				<ul class="badges" aria-label="Metadata">
					{#each metadata as entry (entry)}
						<li>{entry}</li>
					{/each}
				</ul>
			</div>
			{#each chunks as chunk, index (chunk.citation)}
				<div
					class={['block', 'chunk', index === 0 && 'is-ours']}
					style:--k={index + 1}
				>
					<p class="label">
						:{chunk.start_line}-{chunk.end_line}
						<span>{chunk.heading}, {chunk.tokens} tokens</span>
					</p>
					<ol>
						{#each numbered(chunk.start_line, chunk.end_line) as line (line.number)}
							<li>
								<span class="number">{line.number}</span>
								<span class="text">{line.text || ' '}</span>
							</li>
						{/each}
					</ol>
				</div>
			{/each}
		</div>
		<aside class="facts">
			<p class="fact">
				<span class="big">{counts.documents}</span> documents
			</p>
			<p class="fact">
				<span class="big">{counts.chunks}</span> sections
			</p>
			<p class="fact">
				<span class="big">{counts.links}</span> links
			</p>
			<p class="text-sm text-muted-foreground">
				In this repo, indexed.
			</p>
		</aside>
	</div>

	<figure class="skyline-scene">
		<figcaption class="mb-4 max-w-2xl text-muted-foreground">
			Every section of the {skyline.paths.length} largest documents in this
			repo, as tall as its tokens. Search returns one of these, not the
			whole row.
		</figcaption>
		<div class="skyline" data-seen={rise.seen} {@attach rise.attach}>
			<ChartBox
				ratio="16 / 8"
				label="Index skyline: each section of the {skyline.paths
					.length} largest documents, as tall as its tokens"
			>
				<IndexSkyline {skyline} />
			</ChartBox>
		</div>
	</figure>
</Section>

<style>
	.split-scene {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 2.5rem;
		align-items: center;
	}

	@media (min-width: 64rem) {
		.split-scene {
			grid-template-columns: minmax(0, 3fr) minmax(0, 1fr);
		}
	}

	.file {
		display: grid;
		gap: 1.1rem;
		font-size: clamp(0.72rem, 0.95vw, 0.9rem);
		line-height: 1.65;
	}

	.file-name {
		color: var(--muted-foreground);
		font-size: 0.85em;
	}

	.block {
		position: relative;
		padding-block: 0.6rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--card);
	}

	.block li {
		display: grid;
		grid-template-columns: 3rem minmax(0, 1fr);
		padding-inline-end: 1rem;
	}

	.number {
		color: var(--muted-foreground);
		text-align: right;
		padding-right: 1rem;
	}

	.text {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.chunk {
		padding-top: 2.1rem;
	}

	.chunk.is-ours {
		border-color: var(--signal);
		background: color-mix(in oklab, var(--signal) 10%, var(--card));
		box-shadow: 0 0 0 4px
			color-mix(in oklab, var(--signal) 16%, transparent);
	}

	.label {
		position: absolute;
		top: 0.55rem;
		left: 1rem;
		font-weight: 700;
		color: var(--accent);
	}

	.label span {
		margin-left: 0.5rem;
		font-weight: 500;
		color: var(--muted-foreground);
	}

	.front {
		display: grid;
	}

	.front > * {
		grid-area: 1 / 1;
	}

	/* Finished, the frontmatter is data: badges over its faded lines */
	.raw {
		opacity: 0.18;
	}

	.badges {
		display: flex;
		flex-wrap: wrap;
		align-content: center;
		gap: 0.5rem;
		padding-inline: 1rem;
	}

	.badges li {
		display: block;
		padding: 0.2rem 0.7rem;
		border-radius: 999px;
		border: 1px solid
			color-mix(in oklab, var(--signal) 50%, var(--border));
		background: color-mix(in oklab, var(--signal) 12%, var(--card));
	}

	.facts {
		display: grid;
		gap: 0.75rem;
	}

	.fact {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		font-size: 1.1rem;
		color: var(--muted-foreground);
	}

	.big {
		font-size: clamp(2.8rem, 5vw, 4.5rem);
		font-stretch: 125%;
		font-weight: 800;
		line-height: 1;
		letter-spacing: -0.04em;
		color: var(--foreground);
	}

	.skyline {
		transform-origin: bottom;
	}

	/* When the file arrives it starts whole, then splits into its
	   sections while its frontmatter becomes badges */
	.raw,
	.badges,
	.chunk,
	.label {
		transition:
			opacity 0.5s ease-out,
			transform 0.8s cubic-bezier(0.65, 0, 0.35, 1),
			border-color 0.6s,
			background-color 0.6s,
			box-shadow 0.6s;
	}

	.raw {
		transition-delay: 0.5s;
	}

	.badges {
		transition-delay: 0.7s;
	}

	.chunk {
		transition-delay: calc(0.3s + var(--k) * 0.12s);
	}

	.label {
		transition-delay: calc(0.8s + var(--k) * 0.12s);
	}

	[data-seen='false'] .raw {
		opacity: 1;
	}

	[data-seen='false'] .badges,
	[data-seen='false'] .label {
		opacity: 0;
	}

	/* Each section starts closed up against the one above it */
	[data-seen='false'] .chunk {
		transform: translateY(calc(var(--k) * -3.2rem));
		border-color: transparent;
		background-color: var(--card);
		box-shadow: none;
	}

	.skyline {
		transition:
			opacity 0.6s ease-out,
			transform 1.2s cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.skyline[data-seen='false'] {
		opacity: 0;
		transform: scaleY(0.1);
	}
</style>
