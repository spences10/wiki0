<script lang="ts">
	import {
		score_breakdown,
		type ScorePart,
	} from '#lib/chart-data.js';
	import type { ScoreParts } from '@wiki0/core';
	import { BarChart, defaultChartPadding } from 'layerchart';

	let { parts }: { parts: ScoreParts } = $props();

	// Text match is the base score; the other parts multiply it, so
	// they read as boosts (right) or penalties (left) around ×1.
	const rows = $derived(score_breakdown(parts));
	const format = (row: ScorePart) =>
		row.part === 'text'
			? row.value.toFixed(3)
			: `×${row.value.toFixed(2)}`;
</script>

<div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
	<div class="h-48">
		<BarChart
			data={rows}
			y="label"
			orientation="horizontal"
			seriesLayout="stackDiverging"
			series={[
				{
					key: 'boost',
					label: 'Boost',
					value: (row: ScorePart) => Math.max(0, row.effect),
					color: 'var(--chart-3)',
				},
				{
					key: 'penalty',
					label: 'Penalty',
					value: (row: ScorePart) => Math.min(0, row.effect),
					color: 'var(--destructive)',
				},
			]}
			bandPadding={0.3}
			props={{ bars: { radius: 2, strokeWidth: 0 } }}
			padding={defaultChartPadding({ left: 84, bottom: 24 })}
		/>
	</div>
	<dl
		class="grid grid-cols-[1fr_auto] content-start gap-x-3 gap-y-1 text-sm"
	>
		{#each rows as row (row.part)}
			<dt class="text-muted-foreground">{row.label}</dt>
			<dd
				class={[
					'text-right font-mono tabular-nums',
					row.part !== 'text' && row.effect > 0.001 && 'text-chart-3',
					row.part !== 'text' &&
						row.effect < -0.001 &&
						'text-destructive',
				]}
			>
				{format(row)}
			</dd>
		{/each}
	</dl>
</div>
