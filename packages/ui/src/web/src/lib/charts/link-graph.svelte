<script lang="ts">
	import {
		graph_layout,
		type GraphNodeDatum,
	} from '#lib/chart-data.js';
	import { encode_doc_path } from '#lib/router.js';
	import { router } from '#lib/router.svelte.js';
	import type { GraphResult } from '@wiki0/core';
	import {
		forceCollide,
		forceLink,
		forceManyBody,
		forceX,
		forceY,
		type SimulationLinkDatum,
		type SimulationNodeDatum,
	} from 'd3-force';
	import { Chart, Svg } from 'layerchart';
	import { ForceSimulation } from 'layerchart/force';

	type Node = GraphNodeDatum & SimulationNodeDatum;
	type Link = SimulationLinkDatum<Node> & { resolved: boolean };

	let {
		graph,
		group_by,
		show_unresolved,
		show_orphans,
	}: {
		graph: GraphResult;
		group_by: 'doc_type' | 'status' | 'folder';
		show_unresolved: boolean;
		show_orphans: boolean;
	} = $props();

	const palette = [
		'var(--chart-1)',
		'var(--chart-2)',
		'var(--chart-3)',
		'var(--chart-4)',
		'var(--chart-5)',
	];

	const layout = $derived(
		graph_layout(graph, { group_by, show_unresolved, show_orphans }),
	);
	const data = $derived({
		nodes: layout.nodes.map((node) => ({ ...node })) as Node[],
		links: layout.links.map((link) => ({ ...link })) as Link[],
	});
	// The simulation moves these objects; the snippet gets reactive copies.
	const simulation_nodes = $derived(
		new Map(data.nodes.map((node) => [node.id, node])),
	);
	const color = (group: string) =>
		palette[layout.groups.indexOf(group) % palette.length] ??
		'var(--muted-foreground)';
	const radius = (node: Node) =>
		node.missing ? 4 : 4 + Math.min(10, Math.sqrt(node.degree) * 2);

	const forces = $derived({
		link: forceLink<Node, Link>(data.links)
			.id((node) => node.id)
			.distance(42)
			.strength(0.6),
		charge: forceManyBody<Node>().strength(-90),
		collide: forceCollide<Node>().radius((node) => radius(node) + 3),
		x: forceX<Node>(0).strength(0.06),
		y: forceY<Node>(0).strength(0.08),
	});

	let hovered = $state<Node | null>(null);
	// Raised while a node is dragged so the simulation keeps running.
	let alpha_target = $state(0);

	// Pointer travel before a press counts as a drag, not a click.
	const drag_threshold = 3;

	let drag: {
		node: Node;
		x: number;
		y: number;
		moved: boolean;
	} | null = null;
	let dragged = false;

	// Maps the pointer into the simulation's coordinates, through the
	// chart's pan and zoom.
	function simulation_point(
		element: SVGGraphicsElement,
		event: PointerEvent,
	) {
		const matrix = element.getScreenCTM();
		if (!matrix) return null;
		return new DOMPoint(event.clientX, event.clientY).matrixTransform(
			matrix.inverse(),
		);
	}

	function onpointerdown(
		event: PointerEvent & { currentTarget: SVGCircleElement },
		node: Node,
	) {
		if (event.button !== 0) return;
		// Keep the chart from panning; the node moves instead.
		event.stopPropagation();
		event.currentTarget.setPointerCapture(event.pointerId);
		const simulated = simulation_nodes.get(node.id);
		if (!simulated) return;
		drag = {
			node: simulated,
			x: event.clientX,
			y: event.clientY,
			moved: false,
		};
	}

	function onpointermove(
		event: PointerEvent & { currentTarget: SVGCircleElement },
	) {
		if (!drag) return;
		if (
			!drag.moved &&
			Math.hypot(event.clientX - drag.x, event.clientY - drag.y) <
				drag_threshold
		)
			return;
		const point = simulation_point(event.currentTarget, event);
		if (!point) return;
		drag.moved = true;
		alpha_target = 0.3;
		// Pin it to the pointer; x and y keep it where it is dropped.
		drag.node.fx = drag.node.x = point.x;
		drag.node.fy = drag.node.y = point.y;
	}

	function onpointerup() {
		if (!drag) return;
		dragged = drag.moved;
		drag.node.fx = null;
		drag.node.fy = null;
		drag = null;
		alpha_target = 0;
	}

	function open(node: Node) {
		// A drag ends with a click; only a plain press opens the document.
		if (dragged) {
			dragged = false;
			return;
		}
		if (!node.missing)
			router.navigate(`/docs/${encode_doc_path(node.id)}`);
	}
</script>

<div class="relative">
	<div
		class="h-136 overflow-hidden rounded-lg border border-border bg-card"
	>
		<Chart
			data={data.nodes}
			transform={{ mode: 'canvas', scrollMode: 'scale' }}
			padding={{ top: 0, bottom: 0, left: 0, right: 0 }}
		>
			<Svg center>
				<ForceSimulation
					{forces}
					{data}
					cloneNodes={false}
					alphaTarget={alpha_target}
				>
					{#snippet children({ nodes, linkPositions })}
						<g class="links">
							{#each linkPositions as position, index (index)}
								{@const link = data.links[index]}
								<line
									x1={position.x1}
									y1={position.y1}
									x2={position.x2}
									y2={position.y2}
									class={[
										link?.resolved
											? 'stroke-foreground/20'
											: 'stroke-destructive/70',
									]}
									stroke-width={1}
									stroke-dasharray={link?.resolved
										? undefined
										: '3 3'}
								/>
							{/each}
						</g>
						<g class="nodes">
							{#each nodes as node (node.id)}
								<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
								<circle
									cx={node.x}
									cy={node.y}
									r={radius(node)}
									fill={node.missing || node.orphan
										? 'var(--card)'
										: color(node.group)}
									stroke={node.missing
										? 'var(--destructive)'
										: node.orphan
											? color(node.group)
											: 'var(--card)'}
									stroke-width={node.missing || node.orphan ? 1.5 : 1}
									stroke-dasharray={node.missing ? '2 2' : undefined}
									class={[
										'transition-[r]',
										'touch-none active:cursor-grabbing',
										node.missing ? 'cursor-help' : 'cursor-pointer',
										hovered?.id === node.id && 'brightness-125',
									]}
									onpointerdown={(event) =>
										onpointerdown(event, node)}
									{onpointermove}
									{onpointerup}
									onpointercancel={onpointerup}
									onpointerenter={() => (hovered = node)}
									onpointerleave={() => (hovered = null)}
									onclick={() => open(node)}
								>
									<title>{node.title}</title>
								</circle>
							{/each}
						</g>
					{/snippet}
				</ForceSimulation>
			</Svg>
		</Chart>
	</div>

	{#if hovered}
		<div
			class="pointer-events-none absolute top-3 left-3 max-w-xs rounded-md border border-border bg-popover px-3 py-2 text-sm shadow-sm"
		>
			<p class="font-medium">{hovered.title}</p>
			{#if hovered.missing}
				<p class="text-destructive">
					No document: a broken link target
				</p>
			{:else}
				<p class="font-mono text-xs break-all text-muted-foreground">
					{hovered.id}
				</p>
				<p class="mt-1 text-xs text-muted-foreground">
					{hovered.group} · {hovered.degree} link{hovered.degree === 1
						? ''
						: 's'}
					{#if hovered.orphan}· orphan{/if}
				</p>
			{/if}
		</div>
	{/if}

	<ul
		class="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground"
	>
		{#each layout.groups as group (group)}
			<li class="flex items-center gap-1.5">
				<span
					class="size-2.5 rounded-full"
					style:background={color(group)}
				></span>
				{group}
			</li>
		{/each}
		<li class="flex items-center gap-1.5">
			<span
				class="size-2.5 rounded-full border border-muted-foreground"
			></span>
			orphan
		</li>
		<li class="flex items-center gap-1.5">
			<span
				class="size-2.5 rounded-full border border-dashed border-destructive"
			></span>
			broken link target
		</li>
	</ul>
</div>
