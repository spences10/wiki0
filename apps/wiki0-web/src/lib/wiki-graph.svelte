<script lang="ts">
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
	} from '$lib/components/ui/card';
	import type { GraphEdge, GraphNode } from '@wiki0/core';
	import { clamp } from '@layerstack/utils';
	import {
		forceCenter,
		forceCollide,
		forceLink,
		forceManyBody,
		type Simulation,
		type SimulationLinkDatum,
		type SimulationNodeDatum,
	} from 'd3-force';
	import { curveLinear } from 'd3-shape';
	import { Chart, Layer, Link, Tooltip } from 'layerchart';
	import { ForceSimulation } from 'layerchart/force';

	type Node = GraphNode &
		SimulationNodeDatum & { id: string; degree: number };
	type Edge = SimulationLinkDatum<Node> & GraphEdge & { key: string };
	type MoveEvent = CustomEvent<{
		dx: number;
		dy: number;
		x: number;
		y: number;
	}>;
	type MovableOptions = {
		onMoveStart?: () => void;
		onMove?: (event: MoveEvent) => void;
		onMoveEnd?: (event: MoveEvent) => void;
	};
	let {
		nodes,
		edges,
		selectedPath = null,
		onselect,
	}: {
		nodes: GraphNode[];
		edges: GraphEdge[];
		selectedPath?: string | null;
		onselect?: (path: string) => void;
	} = $props();

	let local_selected_path = $state<string | null>(null);
	let sticky = $state(true);
	let dragging = $state(false);

	const graph_nodes = $derived.by<Node[]>(() => {
		const degree: Record<string, number> = {};
		for (const edge of edges) {
			degree[edge.from] = (degree[edge.from] ?? 0) + 1;
			degree[edge.to] = (degree[edge.to] ?? 0) + 1;
		}
		const seen: Record<string, boolean> = Object.fromEntries(
			nodes.map((node) => [node.path, true]),
		);
		const resolved = nodes.map((node) => ({
			...node,
			id: node.path,
			degree: degree[node.path] ?? 0,
		}));
		const unresolved = edges
			.filter((edge) => {
				if (edge.status !== 'unresolved' || seen[edge.to])
					return false;
				seen[edge.to] = true;
				return true;
			})
			.map((edge) => ({
				id: edge.to,
				path: edge.to,
				title: edge.target,
				degree: degree[edge.to] ?? 0,
			}));
		return [...resolved, ...unresolved];
	});

	const active_path = $derived(local_selected_path ?? selectedPath);
	const selected = $derived(
		graph_nodes.find((node) => node.path === active_path) ?? null,
	);

	const graph_edges = $derived.by<Edge[]>(() => {
		const counts: Record<string, number> = {};

		return edges.map((edge) => {
			const base_key = `${edge.from}->${edge.to}:${edge.raw_text}`;
			const count = counts[base_key] ?? 0;
			counts[base_key] = count + 1;

			return {
				...edge,
				key: `${base_key}:${count}`,
				source: edge.from,
				target: edge.to,
			};
		});
	});

	const charge_force = forceManyBody<Node>().strength(-170);
	const center_force = forceCenter<Node>();
	const collide_force = forceCollide<Node>().radius(
		(node) => radius(node) + 6,
	);
	const link_force = $derived(
		forceLink<Node, Edge>(graph_edges)
			.id((node) => node.id)
			.distance((edge) => (edge.status === 'resolved' ? 80 : 120)),
	);

	function radius(node: Node) {
		return Math.min(24, 7 + node.degree * 2);
	}

	function select_node(node: Node) {
		local_selected_path = node.path;
		onselect?.(node.path);
	}

	function movable(node: HTMLElement | SVGElement, options: MovableOptions) {
		let last_x = 0;
		let last_y = 0;
		let moved = false;

		function move_event(event: MouseEvent, dx = 0, dy = 0): MoveEvent {
			return new CustomEvent('move', {
				detail: {
					dx,
					dy,
					x: event.clientX,
					y: event.clientY,
				},
			});
		}

		function on_mouse_down(event: MouseEvent) {
			last_x = event.clientX;
			last_y = event.clientY;
			moved = false;
			options.onMoveStart?.();
			window.addEventListener('mousemove', on_mouse_move);
			window.addEventListener('mouseup', on_mouse_up);
		}

		function on_mouse_move(event: MouseEvent) {
			moved = true;
			const dx = event.clientX - last_x;
			const dy = event.clientY - last_y;
			last_x = event.clientX;
			last_y = event.clientY;
			options.onMove?.(move_event(event, dx, dy));
		}

		function on_mouse_up(event: MouseEvent) {
			last_x = event.clientX;
			last_y = event.clientY;
			options.onMoveEnd?.(move_event(event));
			window.removeEventListener('mousemove', on_mouse_move);
			window.removeEventListener('mouseup', on_mouse_up);
		}

		function on_click(event: MouseEvent) {
			if (moved) event.stopImmediatePropagation();
		}

		node.addEventListener('mousedown', on_mouse_down);
		node.addEventListener('click', on_click);

		return {
			update(new_options: MovableOptions) {
				options = new_options;
			},
			destroy() {
				node.removeEventListener('mousedown', on_mouse_down);
				node.removeEventListener('click', on_click);
			},
		};
	}
</script>

<div class="grid gap-3 lg:grid-cols-[1fr_20rem]">
	<div
		class="h-[34rem] overflow-hidden rounded-md border bg-card p-4"
	>
		<Chart data={graph_nodes} ssr={false}>
			{#snippet children({ context })}
				<Layer>
					<ForceSimulation
						forces={{
							link: link_force,
							charge: charge_force,
							center: center_force
								.x(context.width / 2)
								.y(context.height / 2),
							collide: collide_force,
						}}
						data={{ nodes: graph_nodes, links: graph_edges }}
					>
						{#snippet children({
							nodes,
							simulation,
							linkPositions,
						}: {
							nodes: Node[];
							simulation: Simulation<Node, Edge>;
							linkPositions: {
								x1: number;
								y1: number;
								x2: number;
								y2: number;
							}[];
						})}
							{#key nodes}
								{#each graph_edges as edge, i (edge.key)}
									<Link
										data={edge}
										{...linkPositions[i]}
										curve={curveLinear}
										class={edge.status === 'resolved'
											? 'stroke-slate-300'
											: 'stroke-amber-300 stroke-dasharray-4'}
										stroke-width={edge.embed ? 2 : 1}
									/>
								{/each}
							{/key}

							{#each nodes as node, i (node.id)}
								{@const simulation_node = simulation.nodes()[
									i
								] as Node}
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<circle
									cx={node.x}
									cy={node.y}
									r={radius(node)}
									use:movable={{
										onMoveStart: () => {
											context.tooltip.hide();
											dragging = true;
										},
										onMove: (event) => {
											simulation_node.fx = clamp(
												(simulation_node.fx ?? simulation_node.x ?? 0) +
													event.detail.dx,
												0,
												context.width,
											);
											simulation_node.fy = clamp(
												(simulation_node.fy ?? simulation_node.y ?? 0) +
													event.detail.dy,
												0,
												context.height,
											);
											simulation.alpha(1).restart();
										},
										onMoveEnd: () => {
											dragging = false;
											if (!sticky) {
												delete simulation_node.fx;
												delete simulation_node.fy;
												simulation.alpha(1).restart();
											}
										},
									}}
									onclick={() => {
										if (simulation_node.fx) {
											delete simulation_node.fx;
											delete simulation_node.fy;
											simulation.alpha(1).restart();
										}
										select_node(node);
									}}
									onpointermove={(event) =>
										!dragging && context.tooltip.show(event, node)}
									onpointerleave={context.tooltip.hide}
									class={active_path === node.path
										? 'cursor-all-scroll fill-blue-600'
										: 'cursor-all-scroll fill-slate-800'}
								/>
							{/each}
						{/snippet}
					</ForceSimulation>
				</Layer>

				<Tooltip.Root>
					{context.tooltip.data?.title}
				</Tooltip.Root>
			{/snippet}
		</Chart>
	</div>

	<Card>
		<CardHeader>
			<CardTitle>Selection</CardTitle>
			<label
				class="flex items-center gap-2 text-sm text-muted-foreground"
			>
				<input type="checkbox" bind:checked={sticky} />
				Sticky drag
			</label>
		</CardHeader>
		<CardContent class="text-sm">
			{#if selected}
				<p class="font-medium">{selected.title}</p>
				<p class="break-all text-muted-foreground">{selected.path}</p>
				<p class="mt-2 text-muted-foreground">
					Degree: {selected.degree}
				</p>
			{:else}
				<p class="text-muted-foreground">Click or drag a node.</p>
			{/if}
		</CardContent>
	</Card>
</div>
