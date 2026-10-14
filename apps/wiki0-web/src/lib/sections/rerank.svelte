<script lang="ts">
	import ChartBox from '#lib/components/chart-box.svelte';
	import Section from '#lib/components/section.svelte';
	import TweenNumber from '#lib/components/tween-number.svelte';
	import { Reveal } from '#lib/motion/reveal.svelte.js';
	import ScoreChart from '#lib/scenes/score-chart.svelte';
	import { format_part, score_parts } from '#lib/score-parts.js';
	import { file_name, type RankRow } from '#lib/story.js';
	import { flip } from 'svelte/animate';
	import { cubicInOut } from 'svelte/easing';
	import { fade, fly, scale } from 'svelte/transition';

	let {
		rows,
		query,
		citation,
	}: { rows: RankRow[]; query: string; citation: string } = $props();

	type Order = 'text' | 'wiki0';
	// Finished by default: the prerendered page shows wiki0's order
	let order = $state<Order>('wiki0');
	let touched = false;
	const fallen = $derived(
		rows.find((row) => row.superseded_by) ?? rows.at(-1)!,
	);
	const risen = $derived(
		rows.find((row) => row.citation === citation) ?? rows[0]!,
	);
	let selected_citation = $state<string | null>(null);
	const selected = $derived(
		rows.find((row) => row.citation === selected_citation) ?? fallen,
	);

	const ordered = $derived(
		[...rows].sort((a, b) =>
			order === 'text'
				? a.text_rank - b.text_rank
				: a.final_rank - b.final_rank,
		),
	);
	const max_score = $derived(
		Math.max(...rows.map((row) => Math.max(row.text, row.score))),
	);
	const value = (row: RankRow) =>
		order === 'text' ? row.text : row.score;
	const label = (row: RankRow) =>
		row.heading && row.heading !== row.title
			? `${row.title} › ${row.heading}`
			: row.title;
	const multipliers = (row: RankRow) =>
		Object.entries(row.parts)
			.filter(
				([part, value]) =>
					part !== 'text' && Math.abs(value - 1) > 0.001,
			)
			.map(([part, value]) => ({ part, value }));
	const orders: [Order, string][] = [
		['text', 'By text match'],
		['wiki0', 'Ranked by wiki0'],
	];

	// When the list arrives it shows the text-match order, then wiki0
	// reranks it in front of you
	let timer: ReturnType<typeof setTimeout> | undefined;
	const reveal = new Reveal({
		onhide: () => (order = 'text'),
		onshow: () => {
			timer = setTimeout(() => {
				if (!touched) order = 'wiki0';
			}, 900);
		},
	});

	function choose(next: Order) {
		touched = true;
		clearTimeout(timer);
		order = next;
	}
</script>

<Section id="rank" title="Current docs rank first" band>
	{#snippet copy()}
		<p>
			Text match alone puts the replaced decision first: its title is
			the question, word for word. wiki0 then weighs each result by
			its status, its type and how many docs link to it. A superseded
			doc keeps 30% of its score and points to the doc that replaced
			it.
		</p>
	{/snippet}

	<div class="rerank" {@attach reveal.attach}>
		<div class="results">
			<p class="query">
				<span class="prompt">wiki0 search</span>
				<span class="text">"{query}"</span>
			</p>

			<div class="toggle" role="group" aria-label="Order the results">
				{#each orders as [key, name] (key)}
					<button
						type="button"
						aria-pressed={order === key}
						onclick={() => choose(key)}
					>
						{name}
					</button>
				{/each}
				<span
					class="thumb"
					style:transform="translateX({order === 'text' ? 0 : 100}%)"
					aria-hidden="true"
				></span>
			</div>

			<ol class="list" aria-label="Search results">
				{#each ordered as row, index (row.citation)}
					{@const is_fallen = row === fallen}
					{@const is_risen = row === risen}
					<li animate:flip={{ duration: 900, easing: cubicInOut }}>
						<button
							type="button"
							class={[
								'item',
								is_risen && 'is-risen',
								is_fallen && 'is-fallen',
								order === 'wiki0' && 'is-weighed',
							]}
							aria-pressed={selected === row}
							onclick={() => (selected_citation = row.citation)}
						>
							<span class="position">{index + 1}</span>
							<span class="body">
								<span class="head">
									<span class="title">{label(row)}</span>
									<span class="score">
										<TweenNumber value={value(row)} />
									</span>
								</span>
								<span class="bar" aria-hidden="true">
									<span
										class="fill"
										style:transform="scaleX({value(row) / max_score})"
									></span>
								</span>
								<span class="foot">
									{#if order === 'wiki0'}
										<span
											class="chips"
											in:fade={{ duration: 300, delay: 600 }}
										>
											{#each multipliers(row) as part, chip (part.part)}
												<span
													class={[
														'chip',
														part.value < 1
															? 'is-penalty'
															: 'is-boost',
													]}
													in:scale={{
														duration: 350,
														delay: 700 + chip * 90,
														start: 0.5,
													}}
												>
													{part.part} ×{part.value.toFixed(2)}
												</span>
											{/each}
										</span>
									{:else}
										<span
											class="citation"
											in:fade={{ duration: 250 }}
										>
											{row.citation}
										</span>
									{/if}
									{#if is_fallen && order === 'wiki0'}
										<span
											class="superseded"
											in:fly={{ x: 12, duration: 400, delay: 900 }}
										>
											superseded by {file_name(
												row.superseded_by ?? '',
											)}
										</span>
									{/if}
								</span>
							</span>
						</button>
					</li>
				{/each}
			</ol>
			<p class="hint">
				Select a result to see why it ranks where it does.
			</p>
		</div>

		<aside class="breakdown" aria-live="polite">
			{#key selected.citation}
				<p class="breakdown-title" in:fade={{ duration: 250 }}>
					<span class="font-mono">{file_name(selected.citation)}</span
					>
					<span>
						{selected.text_rank === selected.final_rank
							? `stays #${selected.final_rank + 1}`
							: selected.final_rank < selected.text_rank
								? `rises from #${selected.text_rank + 1} to #${selected.final_rank + 1}`
								: `falls from #${selected.text_rank + 1} to #${selected.final_rank + 1}`}
					</span>
				</p>
			{/key}
			<ChartBox
				ratio="16 / 10"
				min_height="12rem"
				label="Score breakdown for {selected.citation}"
			>
				<ScoreChart parts={selected.parts} />
			</ChartBox>
			<dl class="values">
				{#each score_parts(selected.parts) as part (part.part)}
					<dt>{part.label}</dt>
					<dd
						class={[
							part.part !== 'text' &&
								part.effect > 0.001 &&
								'is-boost',
							part.part !== 'text' &&
								part.effect < -0.001 &&
								'is-penalty',
						]}
					>
						{format_part(part)}
					</dd>
				{/each}
				<dt class="total">Score</dt>
				<dd class="total"><TweenNumber value={selected.score} /></dd>
			</dl>
		</aside>
	</div>
</Section>

<style>
	.rerank {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 2rem;
	}

	@media (min-width: 64rem) {
		.rerank {
			grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
			align-items: start;
		}
	}

	.results {
		display: grid;
		gap: 1.25rem;
	}

	.query {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.5rem 1rem;
		font-family: var(--font-mono);
	}

	.prompt {
		color: var(--muted-foreground);
	}

	.query .text {
		font-size: clamp(1.3rem, 2.6vw, 2.2rem);
		font-weight: 650;
		letter-spacing: -0.02em;
	}

	.toggle {
		position: relative;
		display: grid;
		grid-template-columns: 1fr 1fr;
		justify-self: start;
		padding: 0.25rem;
		border-radius: 999px;
		background: var(--card);
		border: 1px solid var(--border);
	}

	.toggle button {
		position: relative;
		z-index: 1;
		padding: 0.45rem 1.1rem;
		border-radius: 999px;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--muted-foreground);
		transition: color 0.3s;
	}

	.toggle button[aria-pressed='true'] {
		color: #2e1065;
	}

	.toggle button:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}

	.thumb {
		position: absolute;
		inset: 0.25rem auto 0.25rem 0.25rem;
		width: calc(50% - 0.25rem);
		border-radius: 999px;
		background: #ffffff;
		transition: transform 0.5s cubic-bezier(0.65, 0, 0.35, 1);
	}

	.list {
		display: grid;
		gap: 0.6rem;
	}

	.item {
		display: grid;
		grid-template-columns: 1.5rem minmax(0, 1fr);
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.8rem 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--card);
		text-align: left;
		transition:
			background-color 0.5s,
			border-color 0.5s,
			color 0.5s,
			box-shadow 0.3s;
	}

	.item:hover {
		box-shadow: 0 0 0 1px var(--ring);
	}

	.item[aria-pressed='true'] {
		box-shadow: 0 0 0 2px var(--ring);
	}

	.item:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 3px;
	}

	.position {
		font-family: var(--font-mono);
		color: var(--muted-foreground);
	}

	.body {
		display: grid;
		gap: 0.45rem;
		min-width: 0;
	}

	.head {
		display: flex;
		align-items: baseline;
		gap: 1rem;
	}

	.title {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: clamp(0.92rem, 1.2vw, 1.08rem);
		font-weight: 600;
	}

	.score {
		font-family: var(--font-mono);
		font-size: 0.95rem;
		font-variant-numeric: tabular-nums;
	}

	.bar {
		position: relative;
		display: block;
		height: 6px;
		border-radius: 3px;
		background: color-mix(in oklab, currentColor 12%, transparent);
		overflow: hidden;
	}

	.fill {
		position: absolute;
		inset: 0;
		transform-origin: left;
		border-radius: inherit;
		background: var(--signal);
		transition:
			transform 0.9s cubic-bezier(0.65, 0, 0.35, 1),
			background-color 0.5s;
	}

	/* One line in either order, so reranking never changes a row's
	   height */
	.foot {
		display: flex;
		flex-wrap: nowrap;
		overflow: hidden;
		align-items: center;
		justify-content: space-between;
		gap: 0.4rem 1rem;
		min-height: 1.3rem;
		font-family: var(--font-mono);
		font-size: 0.7rem;
	}

	.citation {
		color: var(--muted-foreground);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chips {
		display: flex;
		flex-wrap: nowrap;
		gap: 0.3rem;
		min-width: 0;
		overflow: hidden;
	}

	.chip {
		display: inline-block;
		flex-shrink: 0;
		white-space: nowrap;
		padding: 0.05rem 0.4rem;
		border-radius: var(--radius-sm);
	}

	.chip.is-boost {
		color: var(--chart-3);
		background: color-mix(in oklab, var(--chart-3) 16%, transparent);
	}

	.chip.is-penalty {
		color: var(--destructive);
		background: color-mix(
			in oklab,
			var(--destructive) 18%,
			transparent
		);
	}

	.superseded {
		flex-shrink: 0;
		color: var(--destructive);
		white-space: nowrap;
	}

	.item.is-risen.is-weighed {
		border-color: #ffffff;
		background: #ffffff;
		color: #2e1065;
	}

	.item.is-risen.is-weighed .position {
		color: #6d28d9;
	}

	.item.is-risen.is-weighed .fill {
		background: #7c3aed;
	}

	.item.is-risen.is-weighed .chip.is-boost {
		color: #047857;
		background: #d1fae5;
	}

	.item.is-fallen.is-weighed {
		border-color: var(--destructive);
		background: color-mix(
			in oklab,
			var(--destructive) 13%,
			var(--card)
		);
	}

	.item.is-fallen.is-weighed .fill {
		background: var(--destructive);
	}

	.hint {
		font-size: 0.85rem;
		color: var(--muted-foreground);
	}

	.breakdown {
		display: grid;
		gap: 1rem;
		padding: 1.25rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-xl);
		background: var(--card);
	}

	@media (min-width: 64rem) {
		.breakdown {
			position: sticky;
			top: 2rem;
			margin-top: 6.5rem;
		}
	}

	.breakdown-title {
		display: grid;
		gap: 0.2rem;
		overflow-wrap: anywhere;
	}

	.breakdown-title span:last-child {
		color: var(--muted-foreground);
		font-size: 0.9rem;
	}

	.values {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.2rem 1rem;
		font-size: 0.85rem;
	}

	.values dt {
		color: var(--muted-foreground);
	}

	.values dd {
		text-align: right;
		font-family: var(--font-mono);
		font-variant-numeric: tabular-nums;
	}

	.values .is-boost {
		color: var(--chart-3);
	}

	.values .is-penalty {
		color: var(--destructive);
	}

	.values .total {
		padding-top: 0.4rem;
		border-top: 1px solid var(--border);
		color: var(--foreground);
		font-weight: 650;
	}

	@media (max-width: 40rem) {
		.superseded {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.fill,
		.thumb,
		.item {
			transition: none;
		}
	}
</style>
