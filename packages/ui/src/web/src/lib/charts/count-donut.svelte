<script lang="ts">
	import type { Count } from '#lib/chart-data.js';
	import { PieChart } from 'layerchart';

	let { counts, unit }: { counts: Count[]; unit: string } = $props();

	const palette = [
		'var(--chart-1)',
		'var(--chart-2)',
		'var(--chart-3)',
		'var(--chart-4)',
		'var(--chart-5)',
	];
	const other =
		'color-mix(in oklch, var(--muted-foreground) 55%, transparent)';

	// Five largest plus the rest as one slice, so the colours stay
	// distinct.
	const slices = $derived.by(() => {
		const top = counts.slice(0, 5).map((count, index) => ({
			...count,
			color: palette[index]!,
		}));
		const rest = counts
			.slice(5)
			.reduce((sum, count) => sum + count.count, 0);
		if (rest > 0)
			top.push({ key: 'other', count: rest, color: other });
		return top;
	});
	const total = $derived(
		counts.reduce((sum, count) => sum + count.count, 0),
	);
</script>

<div class="grid grid-cols-[9rem_1fr] items-center gap-4">
	<div class="relative h-36">
		<PieChart
			data={slices}
			key="key"
			value="count"
			cRange={slices.map((slice) => slice.color)}
			innerRadius={-22}
			cornerRadius={3}
			padAngle={0.02}
			height={144}
		/>
		<div
			class="pointer-events-none absolute inset-0 grid place-content-center text-center"
		>
			<strong class="text-xl tabular-nums">{total}</strong>
			<span class="text-[11px] text-muted-foreground">{unit}</span>
		</div>
	</div>
	<ul class="space-y-1 text-sm">
		{#each slices as slice (slice.key)}
			<li class="flex min-w-0 items-center gap-2">
				<span
					class="size-2.5 shrink-0 rounded-sm"
					style:background={slice.color}
				></span>
				<span class="truncate">{slice.key}</span>
				<span class="ml-auto text-muted-foreground tabular-nums"
					>{slice.count}</span
				>
			</li>
		{/each}
	</ul>
</div>
