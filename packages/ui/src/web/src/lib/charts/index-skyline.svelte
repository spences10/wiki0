<script lang="ts">
	import type { DocumentChunks } from '#lib/api.js';
	import { skyline, type Tower } from '#lib/chart-data.js';
	import {
		create_isometric_view,
		tower_gradient,
	} from '#lib/isometric-view.svelte.js';
	import { encode_doc_path } from '#lib/router.js';
	import { router } from '#lib/router.svelte.js';
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
	import ChartViewControls from './chart-view-controls.svelte';

	let { documents }: { documents: DocumentChunks[] } = $props();

	const data = $derived(skyline(documents, 12));

	// Towers shade by size, so a chunk that will blow a token budget
	// stands out before you read its height.
	const colors = [
		'var(--chart-2)',
		'var(--chart-3)',
		'var(--chart-5)',
		'var(--chart-1)',
	];
	const thresholds = [200, 500, 1000];
	const fill_scale = $derived(
		scaleThreshold<number, string>().domain(thresholds).range(colors),
	);
	const towers = $derived(
		data.towers.map((tower) => ({
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

	// Folder and file, since READMEs and changelogs repeat by name.
	const short_name = (path: string) =>
		path.split('/').slice(-2).join('/');
	const tick_label =
		'!stroke-transparent fill-muted-foreground text-[11px]';

	function open_tower(tower: Tower) {
		const line =
			tower.citation.split(':').at(-1)?.split('-')[0] ?? '1';
		router.navigate(
			`/docs/${encode_doc_path(tower.path)}?lines=${tower.citation.split(':').at(-1)}#L${line}`,
		);
	}
</script>

<div class="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
	<p class="text-sm text-muted-foreground">
		The {data.paths.length} largest documents; each tower is one chunk,
		in file order, as tall as its tokens.
	</p>
	<p class="text-xs text-muted-foreground max-sm:hidden">
		Drag to turn
	</p>
	<div class="ml-auto">
		<ChartViewControls {view} label="index skyline" />
	</div>
</div>

<div
	class="h-[28rem] cursor-grab touch-pan-y select-none active:cursor-grabbing"
>
	<Chart
		data={towers}
		x="position"
		xScale={scaleBand().paddingInner(0.18).paddingOuter(0.1)}
		xDomain={data.positions}
		y="path"
		yScale={scaleBand().paddingInner(0.3).paddingOuter(0.1)}
		yDomain={data.paths}
		z="tokens"
		valueAxis="z"
		zDomain={[0, Math.max(1, data.max)]}
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
		padding={{ top: 16, bottom: 28, left: 160, right: 16 }}
		clip
	>
		<Svg>
			{#each colors as color, index (index)}
				<LinearGradient
					id={gradient_id(index)}
					stops={tower_gradient(color)}
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
				class="skyline-tower cursor-pointer"
				onBarClick={(_event: MouseEvent, detail: { data: Tower }) =>
					open_tower(detail.data)}
			/>
		</Svg>
		<Tooltip.Root>
			{#snippet children({ data: tower }: { data: Tower })}
				<Tooltip.Header>{tower.heading ?? tower.title}</Tooltip.Header
				>
				<Tooltip.List>
					<Tooltip.Item label="Tokens" value={tower.tokens} />
					<Tooltip.Item label="Chunk" value={tower.citation} />
				</Tooltip.List>
			{/snippet}
		</Tooltip.Root>
	</Chart>
</div>

<ul
	class="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground"
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

<style>
	:global(.lc-rect-box:has(.skyline-tower):hover .lc-rect) {
		filter: brightness(1.12);
	}
</style>
