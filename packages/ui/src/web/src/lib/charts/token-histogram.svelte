<script lang="ts">
	import { token_histogram } from '#lib/chart-data.js';
	import { BarChart, defaultChartPadding } from 'layerchart';

	let { tokens }: { tokens: number[] } = $props();

	const bins = $derived(token_histogram(tokens));
</script>

<div class="h-56">
	<BarChart
		data={bins}
		x="label"
		y="count"
		series={[
			{ key: 'count', label: 'Chunks', color: 'var(--chart-2)' },
		]}
		bandPadding={0.25}
		props={{
			bars: { radius: 3, strokeWidth: 0 },
			yAxis: { format: 'integer' },
		}}
		padding={defaultChartPadding({ left: 32, bottom: 24 })}
	/>
</div>
