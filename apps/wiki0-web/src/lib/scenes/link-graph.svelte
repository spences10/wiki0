<script lang="ts">
	import type { GraphEdge, GraphNode } from '#lib/story.js';
	import { Chart, Html, Svg } from 'layerchart';
	import { fade } from 'svelte/transition';

	// This repo's link graph, laid out when the page was built. It draws
	// itself outward from `current` once `seen`; hover or tap a document
	// to light up its links.
	let {
		nodes,
		edges,
		current,
		superseded,
		seen = true,
	}: {
		nodes: GraphNode[];
		edges: GraphEdge[];
		current: string;
		superseded: string;
		seen?: boolean;
	} = $props();

	// White is kept for the current decision, red for the replaced one
	const palette = [
		'var(--chart-2)',
		'var(--chart-3)',
		'var(--chart-5)',
		'var(--chart-4)',
		'var(--chart-1)',
	];
	// Folders by size, so the largest gets the first colour
	const folders = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const node of nodes) {
			counts.set(node.folder, (counts.get(node.folder) ?? 0) + 1);
		}
		return [...counts]
			.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
			.map(([folder]) => folder);
	});
	const color = (folder: string) =>
		palette[folders.indexOf(folder) % palette.length] ??
		'var(--muted-foreground)';
	const radius = (node: GraphNode) =>
		(node.id === current ? 1.5 : 1) *
		(5 + Math.min(11, Math.sqrt(node.degree) * 2.4));
	const by_id = $derived(
		new Map(nodes.map((node) => [node.id, node])),
	);
	const neighbours = $derived.by(() => {
		const result = new Map<string, Set<string>>();
		for (const edge of edges) {
			if (!result.has(edge.from)) result.set(edge.from, new Set());
			if (!result.has(edge.to)) result.set(edge.to, new Set());
			result.get(edge.from)?.add(edge.to);
			result.get(edge.to)?.add(edge.from);
		}
		return result;
	});

	// Link distance from the current decision; unreachable docs last
	const distance = $derived.by(() => {
		const result = new Map<string, number>([[current, 0]]);
		let frontier = [current];
		while (frontier.length) {
			const next: string[] = [];
			for (const id of frontier) {
				for (const neighbour of neighbours.get(id) ?? []) {
					if (result.has(neighbour)) continue;
					result.set(neighbour, (result.get(id) ?? 0) + 1);
					next.push(neighbour);
				}
			}
			frontier = next;
		}
		const furthest = Math.max(...result.values()) + 1;
		for (const node of nodes) {
			if (!result.has(node.id)) result.set(node.id, furthest);
		}
		return result;
	});
	const waves = $derived(Math.max(...distance.values()));
	const wave = (id: string) => (distance.get(id) ?? 0) / waves;
	const is_story_edge = (edge: GraphEdge) =>
		(edge.from === superseded && edge.to === current) ||
		(edge.from === current && edge.to === superseded);
	const extent = (key: 'x' | 'y') => {
		const values = nodes.map((node) => node[key]);
		return [Math.min(...values) - 24, Math.max(...values) + 24];
	};
	const label = (id: string) =>
		id.split('/').at(-1)?.replace(/\.md$/u, '') ?? id;

	let active = $state<string | null>(null);
	const lit = $derived(
		active
			? new Set([active, ...(neighbours.get(active) ?? [])])
			: null,
	);
	const active_node = $derived(
		active ? by_id.get(active) : undefined,
	);
	const touches = (edge: GraphEdge) =>
		edge.from === active || edge.to === active;
</script>

<div class="flex h-full flex-col" data-seen={seen}>
	<div class="min-h-0 flex-1">
		<Chart
			data={nodes}
			x="x"
			y="y"
			xDomain={extent('x')}
			yDomain={extent('y')}
			padding={{ top: 8, bottom: 8, left: 8, right: 8 }}
		>
			{#snippet children({ context })}
				<Svg>
					<g>
						{#each edges as edge, index (index)}
							{@const from = by_id.get(edge.from)}
							{@const to = by_id.get(edge.to)}
							{#if from && to}
								<line
									class={[
										'edge',
										is_story_edge(edge) && 'is-story',
										active && !touches(edge) && 'is-dim',
										active && touches(edge) && 'is-lit',
									]}
									style:--wave={Math.max(
										wave(edge.from),
										wave(edge.to),
									)}
									x1={context.xScale(from.x)}
									y1={context.yScale(from.y)}
									x2={context.xScale(to.x)}
									y2={context.yScale(to.y)}
									pathLength="1"
								/>
							{/if}
						{/each}
					</g>
					<g>
						{#each nodes as node (node.id)}
							{@const is_current = node.id === current}
							{@const is_old = node.id === superseded}
							<g
								class={['node', lit && !lit.has(node.id) && 'is-dim']}
								style:--wave={wave(node.id)}
								transform="translate({context.xScale(
									node.x,
								)} {context.yScale(node.y)})"
								role="presentation"
								onpointerenter={() => (active = node.id)}
								onpointerleave={() => (active = null)}
								onclick={() =>
									(active = active === node.id ? null : node.id)}
							>
								<g class="pop">
									<circle class="hit" r={radius(node) + 6} />
									<circle
										r={radius(node)}
										fill={is_current
											? '#ffffff'
											: is_old
												? 'var(--destructive)'
												: node.orphan
													? 'transparent'
													: color(node.folder)}
										stroke={node.orphan
											? color(node.folder)
											: 'var(--background)'}
										stroke-width="1.5"
									/>
									{#if is_current || is_old}
										<text
											x={radius(node) + 6}
											y="4"
											class={['label', is_old && 'is-old']}
										>
											{label(node.id)}
										</text>
									{/if}
								</g>
							</g>
						{/each}
					</g>
				</Svg>
				<Html pointerEvents={false}>
					{#if active_node}
						<div
							class="tip"
							style:left="{context.xScale(active_node.x)}px"
							style:top="{context.yScale(active_node.y)}px"
							transition:fade={{ duration: 150 }}
						>
							<p class="font-medium">{active_node.title}</p>
							<p class="font-mono text-xs break-all opacity-75">
								{active_node.id}
							</p>
							<p class="mt-1 text-xs opacity-75">
								{neighbours.get(active_node.id)?.size ?? 0} linked documents{active_node.orphan
									? ', nothing links here'
									: ''}
							</p>
						</div>
					{/if}
				</Html>
			{/snippet}
		</Chart>
	</div>
	<ul
		class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"
	>
		<li class="flex items-center gap-1.5">
			<span class="size-2.5 rounded-full bg-white"></span>
			current decision
		</li>
		<li class="flex items-center gap-1.5">
			<span class="size-2.5 rounded-full bg-destructive"></span>
			replaced decision
		</li>
		{#each folders as folder (folder)}
			<li class="flex items-center gap-1.5">
				<span
					class="size-2.5 rounded-full"
					style:background={color(folder)}
				></span>
				{folder}
			</li>
		{/each}
		<li class="flex items-center gap-1.5">
			<span
				class="size-2.5 rounded-full border border-muted-foreground"
			></span>
			nothing links here
		</li>
	</ul>
</div>

<style>
	.edge {
		stroke: currentColor;
		stroke-opacity: 0.3;
		stroke-width: 1;
		stroke-dasharray: 1;
		stroke-dashoffset: 0;
		transition:
			stroke-dashoffset 0.9s cubic-bezier(0.65, 0, 0.35, 1)
				calc(0.2s + var(--wave) * 1.2s),
			stroke-opacity 0.25s,
			stroke-width 0.25s;
	}

	.edge.is-story {
		stroke: #ffffff;
		stroke-opacity: 1;
		stroke-width: 3.5;
	}

	.edge.is-dim {
		stroke-opacity: 0.08;
	}

	.edge.is-lit {
		stroke: #ffffff;
		stroke-opacity: 0.9;
		stroke-width: 2;
	}

	.node {
		cursor: pointer;
		transition: opacity 0.25s;
	}

	.node.is-dim {
		opacity: 0.25;
	}

	.hit {
		fill: transparent;
	}

	.pop {
		transition:
			opacity 0.5s ease-out calc(var(--wave) * 1.2s),
			scale 0.6s cubic-bezier(0.2, 1.4, 0.4, 1)
				calc(var(--wave) * 1.2s);
	}

	[data-seen='false'] .edge {
		stroke-dashoffset: 1;
	}

	[data-seen='false'] .pop {
		opacity: 0;
		scale: 0.2;
	}

	.label {
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 650;
		fill: #ffffff;
		paint-order: stroke;
		stroke: var(--background);
		stroke-width: 4px;
	}

	.label.is-old {
		fill: var(--destructive);
	}

	.tip {
		position: absolute;
		transform: translate(-50%, calc(-100% - 18px));
		width: max-content;
		max-width: 16rem;
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-md);
		background: #ffffff;
		color: #2e1065;
		font-size: 0.85rem;
		box-shadow: 0 12px 30px -10px rgb(10 2 30 / 0.6);
	}

	@media (prefers-reduced-motion: reduce) {
		.edge,
		.pop {
			transition: none;
		}
	}
</style>
