<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { create_isometric_view } from '#lib/isometric-view.svelte.js';
	import type { Skyline, Tower } from '#lib/story.js';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';
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
		Tooltip,
	} from 'layerchart';

	// The local UI's index skyline: every section of the largest
	// documents, as tall as its tokens. Hover a tower for its section;
	// drag or use the buttons to turn it.
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
	const view = create_isometric_view(() => ({
		rotate: -34,
		tilt: 58,
	}));
	// Folder and file, since READMEs and changelogs repeat by name
	const short_name = (path: string) =>
		path.split('/').slice(-2).join('/');
	const tick_label =
		'!stroke-transparent fill-muted-foreground text-[10px]';
</script>

<div class="flex h-full flex-col gap-3">
	<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
		<p class="text-sm text-muted-foreground max-sm:hidden">
			Hover a tower for its section. Drag to turn.
		</p>
		<div
			class="ml-auto flex items-center gap-1"
			role="group"
			aria-label="Skyline view"
		>
			<Button
				variant="outline"
				size="icon-sm"
				aria-label="Turn the skyline left"
				onclick={() => view.turn(-45)}
			>
				<RotateCcw aria-hidden="true" />
			</Button>
			<Button
				variant="outline"
				size="icon-sm"
				aria-label="Turn the skyline right"
				onclick={() => view.turn(45)}
			>
				<RotateCw aria-hidden="true" />
			</Button>
			<Button variant="outline" size="sm" onclick={view.reset}
				>Reset</Button
			>
		</div>
	</div>
	<div
		class="min-h-0 flex-1 cursor-grab touch-pan-y select-none active:cursor-grabbing"
	>
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
			zNice
			zRange={({ height }: { height: number }) => [0, height * 0.5]}
			c="fill"
			cScale={scaleOrdinal()}
			cDomain={colors}
			cRange={colors.map((_, index) => `url(#${gradient_id(index)})`)}
			view={isometric({ ...view.options, aspect: 1.4 })}
			transform={{ mode: 'canvas', drag: 'rotate' }}
			onTransform={view.on_transform}
			ondragstart={view.drag_start}
			ondragend={view.drag_end}
			tooltipContext={{ mode: 'manual' }}
			padding={{ top: 16, bottom: 28, left: 150, right: 16 }}
			clip
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
					tickLabelProps={{ viewport: true }}
					classes={{ tickLabel: tick_label }}
				/>
				<Axis
					placement="back"
					ticks={3}
					format="integer"
					classes={{ tickLabel: tick_label }}
				/>
				<Bars
					tooltip
					strokeWidth={1}
					stroke="var(--card)"
					class="tower"
				/>
			</Svg>
			<Tooltip.Root>
				{#snippet children({ data: tower }: { data: Tower })}
					<Tooltip.Header
						>{tower.heading ?? short_name(tower.path)}</Tooltip.Header
					>
					<Tooltip.List>
						<Tooltip.Item label="Tokens" value={tower.tokens} />
						<Tooltip.Item label="Section" value={tower.citation} />
					</Tooltip.List>
				{/snippet}
			</Tooltip.Root>
		</Chart>
	</div>
	<ul
		class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"
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

<style>
	:global(.lc-rect-box:has(.tower):hover .lc-rect) {
		filter: brightness(1.15);
	}
</style>
