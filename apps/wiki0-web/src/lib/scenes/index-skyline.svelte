<script lang="ts">
	import type { Skyline } from '#lib/story.js';
	import { scaleBand, scaleOrdinal, scaleThreshold } from 'd3-scale';
	import {
		Axis,
		Bars,
		Chart,
		Frame,
		Grid,
		isometric,
		LinearGradient,
		Svg,
	} from 'layerchart';

	// The local UI's index skyline, filling its parent. It is drawn
	// once; the page animates its container, not the bars.
	let { skyline }: { skyline: Skyline } = $props();

	const colors = [
		'var(--chart-2)',
		'var(--chart-3)',
		'var(--chart-5)',
		'var(--chart-1)',
	];
	const thresholds = [200, 500, 1000];
	const fill_scale = scaleThreshold<number, string>()
		.domain(thresholds)
		.range(colors);

	const towers = $derived(
		skyline.towers.map((tower) => ({
			...tower,
			fill: fill_scale(tower.tokens),
		})),
	);

	const uid = $props.id();
	const gradient_id = (index: number) => `${uid}-fill-${index}`;
	const short_name = (path: string) =>
		path.split('/').slice(-2).join('/');
	const tick_label =
		'!stroke-transparent fill-muted-foreground text-[10px]';
</script>

<div class="flex h-full flex-col">
	<div class="min-h-0 flex-1 select-none">
		<Chart
			data={towers}
			x="position"
			xScale={scaleBand().paddingInner(0.18).paddingOuter(0.1)}
			xDomain={skyline.positions}
			y="path"
			yScale={scaleBand().paddingInner(0.3).paddingOuter(0.1)}
			yDomain={skyline.paths}
			z="tokens"
			valueAxis="z"
			zDomain={[0, skyline.max]}
			zRange={({ height }: { height: number }) => [0, height * 0.5]}
			c="fill"
			cScale={scaleOrdinal()}
			cDomain={colors}
			cRange={colors.map((_, index) => `url(#${gradient_id(index)})`)}
			view={isometric({ rotate: -34, tilt: 58, aspect: 1.4 })}
			padding={{ top: 16, bottom: 28, left: 150, right: 16 }}
		>
			<Svg>
				{#each colors as color, index (index)}
					<LinearGradient
						id={gradient_id(index)}
						stops={[
							color,
							`color-mix(in oklab, ${color} 55%, var(--card))`,
						]}
						vertical
					/>
				{/each}
				<Frame class="fill-foreground/3 stroke-foreground/15" />
				<Grid z classes={{ line: 'stroke-foreground opacity-15' }} />
				<Axis
					placement="left"
					format={short_name}
					classes={{ tickLabel: tick_label }}
				/>
				<Axis
					placement="back"
					ticks={3}
					format="integer"
					classes={{ tickLabel: tick_label }}
				/>
				<Bars strokeWidth={1} stroke="var(--card)" />
			</Svg>
		</Chart>
	</div>
	<ul
		class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"
	>
		{#each colors as color, index (color)}
			<li class="flex items-center gap-1.5">
				<span class="size-2.5 rounded-sm" style:background={color}
				></span>
				{index === 0
					? `under ${thresholds[0]}`
					: index === colors.length - 1
						? `${thresholds.at(-1)}+`
						: `${thresholds[index - 1]}–${thresholds[index]}`} tokens
			</li>
		{/each}
	</ul>
</div>
