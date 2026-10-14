<script lang="ts">
	import { score_parts, type ScorePart } from '#lib/score-parts.js';
	import { BarChart, defaultChartPadding } from 'layerchart';

	// One result's score parts as boosts (right) and penalties (left)
	let { parts }: { parts: Record<string, number> } = $props();

	const rows = $derived(score_parts(parts));
</script>

<div class="h-full">
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
		props={{
			bars: {
				radius: 2,
				strokeWidth: 0,
				motion: { type: 'tween', duration: 600 },
			},
		}}
		padding={defaultChartPadding({ left: 76, bottom: 20 })}
	/>
</div>
