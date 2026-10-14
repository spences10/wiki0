<script lang="ts">
	import { lint_by_rule } from '#lib/chart-data.js';
	import type { LintIssue } from '@wiki0/core';
	import { BarChart, defaultChartPadding } from 'layerchart';

	let { issues }: { issues: LintIssue[] } = $props();

	const rows = $derived(lint_by_rule(issues));
</script>

<div style:height="{Math.max(8, rows.length * 2.25 + 3)}rem">
	<BarChart
		data={rows}
		y="rule"
		orientation="horizontal"
		seriesLayout="stack"
		series={[
			{ key: 'error', label: 'Errors', color: 'var(--destructive)' },
			{ key: 'warning', label: 'Warnings', color: 'var(--warning)' },
			{
				key: 'info',
				label: 'Info',
				color:
					'color-mix(in oklch, var(--muted-foreground) 60%, transparent)',
			},
		]}
		bandPadding={0.3}
		legend
		props={{
			bars: { radius: 2, strokeWidth: 0 },
			xAxis: { format: 'integer' },
		}}
		padding={defaultChartPadding({ left: 150, bottom: 48 })}
	/>
</div>
