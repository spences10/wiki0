<script lang="ts">
	import type { GraphEdge, GraphNode } from '#lib/story.js';
	import { Chart, Svg } from 'layerchart';

	// This repo's link graph, laid out when the page was built. Each
	// node and edge carries its link distance from `current` as --wave,
	// so the page can draw the graph outward from it.
	let {
		nodes,
		edges,
		current,
		superseded,
	}: {
		nodes: GraphNode[];
		edges: GraphEdge[];
		current: string;
		superseded: string;
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
		5 + Math.min(11, Math.sqrt(node.degree) * 2.4);
	const by_id = $derived(
		new Map(nodes.map((node) => [node.id, node])),
	);

	// Link distance from the current decision; unreachable docs last
	const distance = $derived.by(() => {
		const neighbours = new Map<string, string[]>();
		for (const edge of edges) {
			neighbours.set(edge.from, [
				...(neighbours.get(edge.from) ?? []),
				edge.to,
			]);
			neighbours.set(edge.to, [
				...(neighbours.get(edge.to) ?? []),
				edge.from,
			]);
		}
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
</script>

<div class="flex h-full flex-col">
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
									class={['edge', is_story_edge(edge) && 'is-story']}
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
								class="node"
								style:--wave={wave(node.id)}
								transform="translate({context.xScale(
									node.x,
								)} {context.yScale(node.y)})"
							>
								<g class="pop">
									<circle
										r={radius(node) * (is_current ? 1.5 : 1)}
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
									>
										<title>{node.title}</title>
									</circle>
									{#if is_current || is_old}
										<text
											x={radius(node) * 1.5 + 6}
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
			no links in
		</li>
	</ul>
</div>

<style>
	.edge {
		stroke: currentColor;
		stroke-opacity: 0.3;
		stroke-width: 1;
	}

	.edge.is-story {
		stroke: #ffffff;
		stroke-opacity: 1;
		stroke-width: 3.5;
	}

	.label {
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 650;
		fill: #ffffff;
	}

	.label.is-old {
		fill: var(--destructive);
	}

	/* Drawn outward from the current decision as the graph scrolls
	   through; the --graph timeline comes from the page. */
	@media (prefers-reduced-motion: no-preference) {
		@supports (animation-timeline: view()) {
			.edge {
				stroke-dasharray: 1;
				animation: draw linear both;
				animation-timeline: --graph;
				animation-range: entry calc(40% + var(--wave) * 50%) cover
					calc(25% + var(--wave) * 30%);
			}
			.pop {
				animation: pop linear both;
				animation-timeline: --graph;
				animation-range: entry calc(30% + var(--wave) * 50%) entry
					calc(50% + var(--wave) * 50%);
			}
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

	@keyframes pop {
		from {
			opacity: 0;
			scale: 0.2;
		}
	}
</style>
