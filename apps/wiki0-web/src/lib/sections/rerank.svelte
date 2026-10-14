<script lang="ts">
	import ChartBox from '#lib/components/chart-box.svelte';
	import Section from '#lib/components/section.svelte';
	import ScoreChart from '#lib/scenes/score-chart.svelte';
	import { format_part, score_parts } from '#lib/score-parts.js';
	import { file_name, type RankRow } from '#lib/story.js';

	let {
		rows,
		query,
		citation,
	}: { rows: RankRow[]; query: string; citation: string } = $props();

	const by_text = $derived(
		[...rows].sort((a, b) => a.text_rank - b.text_rank),
	);
	const fallen = $derived(
		rows.find((row) => row.superseded_by) ?? rows.at(-1)!,
	);
	const risen = $derived(
		rows.find((row) => row.citation === citation) ?? rows[0]!,
	);
	const label = (row: RankRow) =>
		row.heading && row.heading !== row.title
			? `${row.title} › ${row.heading}`
			: row.title;
	const kind = (row: RankRow) =>
		row === fallen ? 'is-fallen' : row === risen ? 'is-risen' : '';
	const multipliers = (row: RankRow) =>
		Object.entries(row.parts)
			.filter(
				([part, value]) =>
					part !== 'text' && Math.abs(value - 1) > 0.001,
			)
			.map(([part, value]) => ({ part, value }));

	// The curves run in a 100 by (rows × 10) box between the two
	// lists, one row every 10 units, centred in its row.
	const height = $derived(rows.length * 10);
	const curve = (row: RankRow) => {
		const from = row.text_rank * 10 + 5;
		const to = row.final_rank * 10 + 5;
		return `M0 ${from} C 50 ${from}, 50 ${to}, 100 ${to}`;
	};
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

	<figure class="bump" aria-labelledby="rank-query">
		<p id="rank-query" class="query">
			<span class="prompt">wiki0 search</span>
			<span class="text">"{query}"</span>
		</p>

		<div class="columns">
			<p class="column-title">By text match</p>
			<span></span>
			<p class="column-title">Ranked by wiki0</p>

			<ol class="list left" aria-label="Order by text match alone">
				{#each by_text as row (row.citation)}
					<li
						class={['item', kind(row)]}
						style:--rank={row.text_rank}
					>
						<span class="position">{row.text_rank + 1}</span>
						<span class="name">{label(row)}</span>
						<span class="score">{row.text.toFixed(3)}</span>
					</li>
				{/each}
			</ol>

			<svg
				class="curves"
				viewBox="0 0 100 {height}"
				preserveAspectRatio="none"
				aria-hidden="true"
			>
				{#each rows as row (row.citation)}
					<path
						d={curve(row)}
						class={['curve', kind(row)]}
						pathLength="1"
						vector-effect="non-scaling-stroke"
					/>
				{/each}
			</svg>

			<ol class="list right" aria-label="Order after weighing">
				{#each rows as row (row.citation)}
					<li
						class={['item', kind(row)]}
						style:--rank={row.final_rank}
					>
						<span class="position">{row.final_rank + 1}</span>
						<span class="name">
							<span class="title">{label(row)}</span>
							<span class="chips">
								{#each multipliers(row) as part (part.part)}
									<span
										class={[
											'chip',
											part.value < 1 ? 'is-penalty' : 'is-boost',
										]}
									>
										{part.part} ×{part.value.toFixed(2)}
									</span>
								{/each}
							</span>
						</span>
						<span class="score">{row.score.toFixed(3)}</span>
					</li>
				{/each}
			</ol>
		</div>
		<figcaption class="note">
			<span class="font-mono">{file_name(fallen.citation)}</span>
			ranks #{fallen.final_rank + 1}, and its result says it is
			superseded by
			<span class="font-mono"
				>{file_name(fallen.superseded_by ?? '')}</span
			>.
		</figcaption>
	</figure>

	<div class="breakdowns">
		{#each [risen, fallen] as row (row.citation)}
			<figure class="breakdown scrub-in">
				<figcaption>
					<span class="font-mono">{file_name(row.citation)}</span>
					{row === risen
						? `rose from #${row.text_rank + 1} to #${row.final_rank + 1}`
						: `fell from #${row.text_rank + 1} to #${row.final_rank + 1}`}
				</figcaption>
				<div class="breakdown-body">
					<ChartBox
						ratio="16 / 9"
						min_height="10rem"
						label="Score breakdown for {row.citation}"
					>
						<ScoreChart parts={row.parts} />
					</ChartBox>
					<dl class="values">
						{#each score_parts(row.parts) as part (part.part)}
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
					</dl>
				</div>
			</figure>
		{/each}
	</div>
</Section>

<style>
	.bump {
		display: grid;
		gap: 2rem;
		view-timeline: --bump block;
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
		font-size: clamp(1.4rem, 3.6vw, 3rem);
		font-weight: 650;
		letter-spacing: -0.02em;
	}

	.columns {
		--row: clamp(3.6rem, 6vw, 4.6rem);
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(2.5rem, 9rem) minmax(
				0,
				1.3fr
			);
		column-gap: 0.75rem;
		row-gap: 0.75rem;
	}

	.column-title {
		font-size: 0.85rem;
		color: var(--muted-foreground);
	}

	.list {
		display: grid;
		grid-auto-rows: var(--row);
	}

	.item {
		display: grid;
		grid-template-columns: 1.5rem minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.75rem;
		padding-inline: 0.9rem;
		margin-block: 0.3rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--card);
	}

	.position {
		font-family: var(--font-mono);
		color: var(--muted-foreground);
	}

	.name {
		display: grid;
		gap: 0.2rem;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: clamp(0.85rem, 1.15vw, 1.05rem);
		font-weight: 600;
	}

	.score {
		font-family: var(--font-mono);
		font-size: 0.9rem;
		font-variant-numeric: tabular-nums;
	}

	.chips {
		display: flex;
		gap: 0.3rem;
		overflow: hidden;
	}

	.chip {
		font-family: var(--font-mono);
		font-size: 0.66rem;
		font-weight: 500;
		padding: 0 0.35rem;
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

	.item.is-risen {
		border-color: #ffffff;
		background: #ffffff;
		color: #2e1065;
	}

	.item.is-risen .position {
		color: #6d28d9;
	}

	.item.is-risen .chip.is-boost {
		color: #047857;
		background: #d1fae5;
	}

	.item.is-fallen {
		border-color: var(--destructive);
		background: color-mix(
			in oklab,
			var(--destructive) 14%,
			var(--card)
		);
	}

	.right .item.is-fallen .title {
		text-decoration: line-through;
		text-decoration-color: var(--destructive);
	}

	.curves {
		grid-row: 2;
		grid-column: 2;
		width: 100%;
		height: 100%;
		overflow: visible;
	}

	.left {
		grid-row: 2;
		grid-column: 1;
	}

	.right {
		grid-row: 2;
		grid-column: 3;
	}

	.curve {
		fill: none;
		stroke: color-mix(in oklab, #ffffff 35%, transparent);
		stroke-width: 2;
	}

	.curve.is-risen {
		stroke: #ffffff;
		stroke-width: 5;
	}

	.curve.is-fallen {
		stroke: var(--destructive);
		stroke-width: 5;
	}

	.note {
		color: var(--muted-foreground);
	}

	.breakdowns {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1.5rem;
	}

	.breakdown-body {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1rem;
	}

	@media (min-width: 30rem) {
		.breakdown-body {
			grid-template-columns: minmax(0, 1fr) 8.5rem;
			align-items: start;
		}
	}

	.values {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.15rem 0.75rem;
		font-size: 0.8rem;
	}

	.values dt {
		color: var(--muted-foreground);
	}

	.values dd {
		text-align: right;
		font-family: var(--font-mono);
		font-variant-numeric: tabular-nums;
	}

	.values dd.is-boost {
		color: var(--chart-3);
	}

	.values dd.is-penalty {
		color: var(--destructive);
	}

	.title {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	@media (min-width: 56rem) {
		.breakdowns {
			grid-template-columns: 1fr 1fr;
		}
	}

	.breakdown {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		overflow-wrap: anywhere;
		gap: 1rem;
		padding: 1.25rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-xl);
		background: var(--card);
	}

	@media (max-width: 40rem) {
		.chips,
		.left .score {
			display: none;
		}
		.columns {
			grid-template-columns: minmax(0, 1fr) 2.5rem minmax(0, 1fr);
			column-gap: 0.4rem;
		}
		.item {
			grid-template-columns: 1rem minmax(0, 1fr);
			padding-inline: 0.6rem;
		}
		.right .score {
			display: none;
		}
	}

	/* Scrolled through: the text-match order stands, then each result
	   draws its line to where wiki0 ranks it and lands there. */
	@media (prefers-reduced-motion: no-preference) {
		@supports (animation-timeline: view()) {
			.left .item {
				animation: slide-in linear both;
				animation-timeline: --bump;
				animation-range: entry calc(30% + var(--rank) * 8%) entry
					calc(60% + var(--rank) * 8%);
			}
			.curve {
				stroke-dasharray: 1;
				animation: draw linear both;
				animation-timeline: --bump;
				animation-range: cover 30% cover 55%;
			}
			.curve.is-risen,
			.curve.is-fallen {
				animation-range: cover 35% cover 62%;
			}
			.right .item {
				animation: land linear both;
				animation-timeline: --bump;
				animation-range: cover calc(45% + var(--rank) * 3%) cover
					calc(58% + var(--rank) * 3%);
			}
		}
	}

	@keyframes slide-in {
		from {
			opacity: 0;
			transform: translateX(-3rem);
		}
	}

	@keyframes draw {
		from {
			stroke-dashoffset: 1;
		}
		to {
			stroke-dashoffset: 0;
		}
	}

	@keyframes land {
		from {
			opacity: 0;
			transform: translateX(-4rem) scale(0.94);
		}
	}
</style>
