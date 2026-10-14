<script lang="ts">
	import Section from '#lib/components/section.svelte';
	import { Reveal } from '#lib/motion/reveal.svelte.js';
	import { cubicOut } from 'svelte/easing';
	import { Tween } from 'svelte/motion';
	import { lines_of, type StoryDocument } from '#lib/story.js';

	let {
		files,
		superseded,
		current,
	}: {
		files: { path: string; lines: number }[];
		superseded: StoryDocument;
		current: StoryDocument;
	} = $props();

	// Folder and file, as many files are called README.md
	const short_name = (path: string) =>
		path.split('/').slice(-2).join('/');
	const total = $derived(
		files.reduce((sum, file) => sum + file.lines, 0),
	);
	const most = $derived(Math.max(...files.map((file) => file.lines)));
	const wall = new Reveal();
	const answer = new Reveal();
	// The count climbs as the files land; it drops to 0 at once while
	// the wall waits below the fold
	const count = Tween.of(() => (wall.seen ? total : 0), {
		duration: (from, to) => (to < from ? 0 : 1600),
		easing: cubicOut,
	});

	// The decision the agent quotes: the lines under "## Decision"
	const quoted = $derived(
		lines_of(superseded.source)
			.slice(12, 14)
			.join(' ')
			.replace(/`/gu, ''),
	);
</script>

<Section id="problem" title="Agents read whole files">
	{#snippet copy()}
		<p>
			Without an index, an agent searches for a word, opens every file
			that matches and reads each one to the end. Then it answers from
			whatever it found, and it can't tell a decision you replaced
			from the one you follow now.
		</p>
	{/snippet}

	<div class="wall-scene" data-seen={wall.seen} {@attach wall.attach}>
		<p class="counter">
			<span class="number">{Math.round(count.current)}</span>
			<span class="unit">lines read to answer one question</span>
		</p>
		<ol class="wall" aria-label="Files an agent reads in full">
			{#each files as file, index (file.path)}
				<li
					class={[
						'tile',
						file.path === superseded.path && 'is-old',
						file.path === current.path && 'is-current',
					]}
					style:--i={index / files.length}
					style:--fill={file.lines / most}
				>
					<span class="lines" aria-hidden="true"></span>
					{#if file.path === superseded.path}
						<span class="flag">replaced decision</span>
					{:else if file.path === current.path}
						<span class="flag">current decision</span>
					{/if}
					<span class="name">{short_name(file.path)}</span>
					<span class="count">{file.lines}</span>
				</li>
			{/each}
		</ol>
	</div>

	<blockquote
		class="answer"
		data-seen={answer.seen}
		{@attach answer.attach}
	>
		<span class="stamp">{superseded.status}</span>
		<p class="label">
			The agent's answer, quoted from a decision you replaced:
		</p>
		<p class="quote">“{quoted}”</p>
		<footer>{superseded.path}</footer>
	</blockquote>
</Section>

<style>
	.wall-scene {
		display: grid;
		gap: 1.5rem;
	}

	.counter {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.5rem 1.25rem;
	}

	.number {
		font-size: clamp(4rem, 13vw, 11rem);
		font-stretch: 125%;
		font-weight: 800;
		line-height: 0.85;
		letter-spacing: -0.05em;
		font-variant-numeric: tabular-nums;
		color: var(--signal);
	}

	.unit {
		max-width: 14rem;
		font-size: 1.05rem;
		color: var(--muted-foreground);
	}

	.wall {
		display: grid;
		grid-template-columns: repeat(
			auto-fill,
			minmax(min(100%, 9.5rem), 1fr)
		);
		gap: 0.6rem;
	}

	@media (min-width: 56rem) {
		.wall {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}

	.tile {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-content: end;
		gap: 0.5rem;
		min-height: 5rem;
		padding: 0.75rem 0.85rem;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--card);
		font-family: var(--font-mono);
		font-size: 0.75rem;
	}

	/* The file's text, as many lines as it has */
	.lines {
		position: absolute;
		inset: 0.75rem 0.85rem 2.4rem;
		transform-origin: top;
		transform: scaleY(var(--fill));
		background: repeating-linear-gradient(
			to bottom,
			color-mix(in oklab, var(--foreground) 12%, transparent) 0 2px,
			transparent 2px 7px
		);
	}

	.name {
		position: relative;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.count {
		position: relative;
		color: var(--muted-foreground);
	}

	.flag {
		position: absolute;
		top: 0.6rem;
		right: 0.75rem;
		padding: 0.1rem 0.45rem;
		border-radius: 999px;
		font-family: var(--font-sans);
		font-size: 0.72rem;
		font-weight: 650;
		background: var(--card);
	}

	.tile.is-old {
		border-color: var(--destructive);
		background: color-mix(
			in oklab,
			var(--destructive) 10%,
			var(--card)
		);
	}

	.tile.is-old .flag {
		color: var(--destructive);
	}

	.tile.is-current {
		border-color: var(--signal);
		background: color-mix(in oklab, var(--signal) 12%, var(--card));
	}

	.tile.is-current .flag {
		color: var(--accent);
	}

	.answer {
		position: relative;
		display: grid;
		gap: 0.4rem;
		padding: 1.4rem 1.6rem;
		padding-right: 14rem;
		border: 1.5px solid var(--destructive);
		border-radius: var(--radius-xl);
		background: color-mix(
			in oklab,
			var(--destructive) 7%,
			var(--card)
		);
	}

	.label {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--destructive);
	}

	.quote {
		font-size: clamp(1.15rem, 2vw, 1.6rem);
		line-height: 1.35;
	}

	.answer footer {
		font-family: var(--font-mono);
		font-size: 0.78rem;
		color: var(--muted-foreground);
	}

	.stamp {
		position: absolute;
		right: 1.75rem;
		top: 50%;
		translate: 0 -50%;
		rotate: -8deg;
		padding: 0.25rem 0.8rem;
		border: 3px solid var(--destructive);
		border-radius: var(--radius-sm);
		color: var(--destructive);
		font-size: 1.35rem;
		font-weight: 800;
		font-stretch: 115%;
	}

	@media (max-width: 40rem) {
		.answer {
			padding-right: 1.6rem;
			padding-top: 3.6rem;
		}
		.stamp {
			top: 1.1rem;
			translate: 0;
			font-size: 1rem;
		}
	}

	/* When the wall arrives, files land one after another and fill
	   with their text */
	.tile,
	.lines,
	.flag,
	.answer {
		transition:
			opacity 0.5s ease-out,
			transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.tile {
		transition-delay: calc(var(--i) * 1.1s);
	}

	.lines {
		transition-duration: 0.5s, 0.9s;
		transition-delay: calc(0.2s + var(--i) * 1.1s);
	}

	.flag {
		transition-delay: 1.5s;
	}

	[data-seen='false'] .tile {
		opacity: 0;
		transform: translateY(3rem) rotate(-3deg) scale(0.92);
	}

	[data-seen='false'] .lines {
		transform: scaleY(0);
	}

	[data-seen='false'] .flag {
		opacity: 0;
		transform: scale(0.6);
	}

	.answer[data-seen='false'] {
		opacity: 0;
		transform: translateY(2rem);
	}
</style>
