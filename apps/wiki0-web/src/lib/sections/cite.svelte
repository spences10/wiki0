<script lang="ts">
	import Section from '#lib/components/section.svelte';
	import Terminal from '#lib/components/terminal.svelte';
	import { lines_of, type StoryDocument } from '#lib/story.js';

	let {
		current,
		show,
	}: {
		current: StoryDocument;
		show: { citation: string; markdown: string; tokens: number };
	} = $props();

	const range = $derived(show.citation.split(':').at(-1) ?? '');
	const [start, end] = $derived(
		range.split('-').map(Number) as [number, number],
	);
	const lines = $derived(lines_of(current.source));
	// Where the camera pushes in: the middle of the cited lines
	const focus = $derived(((start + end) / 2 / lines.length) * 100);
</script>

<Section id="cite" title="Agents read the cited lines">
	{#snippet copy()}
		<p>
			Each result is a citation: <code
				class="font-mono text-[0.9em] break-all">{show.citation}</code
			>. <code class="font-mono text-[0.9em]">wiki0 show</code> returns
			exactly those lines from the current file, within a token budget,
			and says where to read next when a section runs long. You can check
			every quote against the file.
		</p>
	{/snippet}

	<div class="cite-scene">
		<figure
			class="viewport"
			aria-label="{current.path}, lines {range}"
		>
			<ol class="file font-mono" style:--focus="{focus}%">
				{#each lines as text, index (index)}
					{@const number = index + 1}
					<li
						class={[number >= start && number <= end && 'is-cited']}
					>
						<span class="number">{number}</span>
						<span class="text">{text || ' '}</span>
					</li>
				{/each}
			</ol>
		</figure>

		<div class="result scrub-in">
			<Terminal title="wiki0 show {show.citation}">
				<p class="text-muted-foreground">Source: {show.citation}</p>
				<pre class="mt-2 whitespace-pre-wrap">{show.markdown}</pre>
			</Terminal>
			<p class="tokens">
				{show.tokens}
				<span>tokens, read from the current file</span>
			</p>
		</div>
	</div>
</Section>

<style>
	.cite-scene {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 2rem;
	}

	@media (min-width: 64rem) {
		.cite-scene {
			grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
			align-items: center;
		}
	}

	.viewport {
		position: relative;
		height: clamp(20rem, 46vw, 34rem);
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: var(--radius-xl);
		background: var(--card);
		view-timeline: --camera block;
	}

	.file {
		position: absolute;
		inset-inline: 0;
		top: 50%;
		padding-block: 1rem;
		font-size: clamp(0.62rem, 0.85vw, 0.82rem);
		line-height: 1.7;
		transform-origin: 2rem var(--focus);
		/* Finished: pushed in on the cited lines */
		transform: translateY(calc(var(--focus) * -1)) scale(1.55);
	}

	.file li {
		display: grid;
		grid-template-columns: 3rem minmax(0, 1fr);
		padding-inline-end: 1rem;
		white-space: pre;
		opacity: 0.35;
	}

	.file li.is-cited {
		opacity: 1;
		background: color-mix(in oklab, var(--signal) 13%, transparent);
		box-shadow: inset 3px 0 0 var(--signal);
	}

	.number {
		color: var(--muted-foreground);
		text-align: right;
		padding-right: 1rem;
	}

	.text {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.result {
		display: grid;
		gap: 1.5rem;
	}

	.tokens {
		display: grid;
		font-size: clamp(3.5rem, 8vw, 7rem);
		font-stretch: 125%;
		font-weight: 800;
		line-height: 0.9;
		letter-spacing: -0.05em;
		color: var(--signal);
	}

	.tokens span {
		margin-top: 0.5rem;
		font-size: 1rem;
		font-weight: 500;
		font-stretch: 100%;
		letter-spacing: 0;
		color: var(--muted-foreground);
	}

	/* Scrolled through: the whole file, then the camera pushes in on
	   the cited lines while the rest fades back. */
	@media (prefers-reduced-motion: no-preference) {
		@supports (animation-timeline: view()) {
			.file {
				animation: push linear both;
				animation-timeline: --camera;
				animation-range: entry 60% cover 60%;
			}
			.file li:not(.is-cited) {
				animation: dim linear both;
				animation-timeline: --camera;
				animation-range: entry 60% cover 55%;
			}
		}
	}

	@keyframes push {
		from {
			transform: translateY(-50%) scale(0.6);
			transform-origin: 2rem 50%;
		}
	}

	@keyframes dim {
		from {
			opacity: 1;
		}
	}
</style>
