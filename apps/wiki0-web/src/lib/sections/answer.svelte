<script lang="ts">
	import Section from '#lib/components/section.svelte';
	import { Reveal } from '#lib/motion/reveal.svelte.js';
	import { file_name } from '#lib/story.js';
	import type { Attachment } from 'svelte/attachments';

	let {
		answer,
	}: {
		answer: {
			query: string;
			html: string;
			spans: Record<string, [number, number]>;
			rest: {
				citation: string;
				status: string | null;
				superseded_by: string | null;
			}[];
		};
	} = $props();

	const fields = [
		{
			key: 'citation',
			name: 'citation',
			text: 'The file and the exact lines. wiki0 show reads just those lines from the current file.',
		},
		{
			key: 'breadcrumb',
			name: 'breadcrumb',
			text: 'The document and the headings above the section, so the agent knows where it sits.',
		},
		{
			key: 'status',
			name: 'status, doc_type, date',
			text: 'From frontmatter or an ADR header when the doc has them. They feed the ranking.',
		},
		{
			key: 'snippet',
			name: 'snippet',
			text: 'The matching text, to judge the result before reading it.',
		},
		{
			key: 'score',
			name: 'score',
			text: 'Text match weighed by status, type, links and more. The ranking section below breaks it down.',
		},
		{
			key: 'superseded_by',
			name: 'superseded_by',
			text: 'Empty here. On a replaced doc it names the doc that replaced it.',
		},
	];
	// Fields shown together share one annotation
	const groups: Record<string, string[]> = {
		status: ['status', 'doc_type', 'date'],
	};

	let active = $state<string | null>(null);
	const range = $derived.by((): [number, number] | null => {
		if (!active) return null;
		const keys = groups[active] ?? [active];
		const spans = keys
			.map((key) => answer.spans[key])
			.filter((span): span is [number, number] => Boolean(span));
		if (!spans.length) return null;
		return [
			Math.min(...spans.map(([start]) => start)),
			Math.max(...spans.map(([, end]) => end)),
		];
	});

	// Lights the JSON lines of the field being explained
	const light =
		(lines: [number, number] | null): Attachment<HTMLElement> =>
		(element) => {
			for (const [index, line] of element
				.querySelectorAll('.l')
				.entries()) {
				const number = index + 1;
				line.classList.toggle(
					'is-lit',
					Boolean(lines) &&
						number >= lines![0] &&
						number <= lines![1],
				);
			}
		};

	const reveal = new Reveal();
</script>

<Section id="answer" title="What your agent gets back">
	{#snippet copy()}
		<p>
			One question, one call. wiki0 returns the best sections, one per
			document and five by default, each with the file and lines it
			came from. This is the first result for our question, from this
			repo's docs.
		</p>
	{/snippet}

	<div class="scene" data-seen={reveal.seen} {@attach reveal.attach}>
		<figure class="terminal">
			<figcaption class="bar">
				<span class="lights" aria-hidden="true">
					<span></span><span></span><span></span>
				</span>
				<span class="font-mono">wiki0 search "{answer.query}"</span>
			</figcaption>
			<div
				class={['json', range && 'has-lit']}
				{@attach light(range)}
			>
				<!-- Highlighted at build time from wiki0's real output -->
				{@html answer.html}
			</div>
			<ol class="rest" aria-label="The other results">
				{#each answer.rest as result, index (result.citation)}
					<li style:--i={index}>
						<span class="rank">{index + 2}</span>
						<span class="cite">{result.citation}</span>
						{#if result.superseded_by}
							<span class="replaced">
								superseded by {file_name(result.superseded_by)}
							</span>
						{/if}
					</li>
				{/each}
			</ol>
			<p class="note">
				Trimmed to the fields explained here. A full result has more,
				such as match positions, the score's parts and a heading
				anchor.
			</p>
		</figure>

		<ul class="fields" aria-label="What each field is for">
			{#each fields as field, index (field.key)}
				<li style:--i={index}>
					<button
						type="button"
						class="field"
						aria-pressed={active === field.key}
						onpointerenter={() => (active = field.key)}
						onpointerleave={() => (active = null)}
						onfocus={() => (active = field.key)}
						onblur={() => (active = null)}
					>
						<span class="name">{field.name}</span>
						<span class="text">{field.text}</span>
					</button>
				</li>
			{/each}
		</ul>
	</div>
</Section>

<style>
	.scene {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 2rem;
		align-items: start;
	}

	@media (min-width: 64rem) {
		.scene {
			grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
		}
	}

	.terminal {
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: var(--radius-xl);
		background: #1c0a3d;
		color: #ede9fe;
		box-shadow: 0 40px 80px -40px rgb(10 2 30 / 0.7);
	}

	.bar {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		padding: 0.6rem 1rem;
		background: color-mix(in oklab, #000000 25%, #1c0a3d);
		font-size: 0.8rem;
		color: #c9bfe8;
	}

	.lights {
		display: flex;
		gap: 0.4rem;
	}

	.lights span {
		width: 0.65rem;
		height: 0.65rem;
		border-radius: 999px;
		background: rgb(255 255 255 / 0.18);
	}

	.json {
		font-size: clamp(0.72rem, 0.9vw, 0.85rem);
	}

	.json :global(.twinkleplop) {
		margin: 0;
		padding-block: 0.9rem;
		background: transparent;
		color: inherit;
		line-height: 1.7;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	/* One row per line; the newlines between them are not rendered */
	.json :global(.twinkleplop code) {
		display: grid;
	}

	.json :global(.l) {
		display: block;
		padding-inline: 1.1rem;
		transition:
			background-color 0.25s,
			opacity 0.25s,
			box-shadow 0.25s;
	}

	.json.has-lit :global(.l) {
		opacity: 0.4;
	}

	.json :global(.l.is-lit) {
		opacity: 1;
		background: rgb(196 181 253 / 0.16);
		box-shadow: inset 3px 0 0 #c4b5fd;
	}

	.json :global(.property) {
		color: #c4b5fd;
	}

	.json :global(.string) {
		color: #fde68a;
	}

	.json :global(:is(.number, .null, .boolean)) {
		color: #93c5fd;
	}

	.json :global(.punctuation) {
		color: #8b7db5;
	}

	.rest {
		display: grid;
		gap: 0.3rem;
		padding: 0.8rem 1.1rem;
		border-top: 1px solid rgb(255 255 255 / 0.1);
		font-family: var(--font-mono);
		font-size: 0.75rem;
	}

	.rest li {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 0.75rem;
	}

	.rank {
		color: #8b7db5;
	}

	.cite {
		overflow-wrap: anywhere;
	}

	.replaced {
		color: #fda4af;
	}

	.note {
		padding: 0 1.1rem 0.9rem;
		font-size: 0.75rem;
		color: #a99bcf;
	}

	.fields {
		display: grid;
		gap: 0.5rem;
	}

	.field {
		display: grid;
		gap: 0.2rem;
		width: 100%;
		padding: 0.8rem 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--card);
		text-align: left;
		transition:
			border-color 0.2s,
			transform 0.2s;
	}

	.field:hover,
	.field:focus-visible,
	.field[aria-pressed='true'] {
		border-color: var(--signal);
		transform: translateX(-4px);
	}

	.field:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}

	.name {
		font-family: var(--font-mono);
		font-size: 0.85rem;
		font-weight: 650;
		color: var(--accent);
	}

	.text {
		color: var(--muted-foreground);
		font-size: 0.95rem;
	}

	/* When the result arrives the terminal settles in, the other
	   results follow and the notes land one by one */
	.terminal,
	.rest li,
	.fields li {
		transition:
			opacity 0.5s ease-out,
			transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.rest li {
		transition-delay: calc(0.6s + var(--i) * 0.08s);
	}

	.fields li {
		transition-delay: calc(0.4s + var(--i) * 0.1s);
	}

	[data-seen='false'] .terminal {
		opacity: 0;
		transform: translateY(2rem);
	}

	[data-seen='false'] .rest li {
		opacity: 0;
		transform: translateX(-1rem);
	}

	[data-seen='false'] .fields li {
		opacity: 0;
		transform: translateX(1.5rem);
	}

	@media (prefers-reduced-motion: reduce) {
		.terminal,
		.rest li,
		.fields li,
		.json :global(.l),
		.field {
			transition: none;
		}
	}
</style>
