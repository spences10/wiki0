<script lang="ts">
	import { api, is_not_indexed } from '#lib/api.js';
	import { app } from '#lib/app-state.svelte.js';
	import LinkGraph from '#lib/charts/link-graph.svelte';
	import NotIndexed from '#lib/components/not-indexed.svelte';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import * as Select from '#lib/components/ui/select/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import type { GraphResult } from '@wiki0/core';

	let graph = $state.raw<GraphResult | null>(null);
	let error = $state<unknown>(null);
	let group_by = $state<'doc_type' | 'status' | 'folder'>('folder');
	let show_unresolved = $state(true);
	let show_orphans = $state(true);

	$effect(() => {
		void app.version;
		let cancelled = false;
		api
			.graph()
			.then((result) => {
				if (!cancelled) {
					graph = result;
					error = null;
				}
			})
			.catch((caught: unknown) => {
				if (!cancelled) error = caught;
			});
		return () => {
			cancelled = true;
		};
	});

	const group_labels = {
		folder: 'Colour by folder',
		doc_type: 'Colour by type',
		status: 'Colour by status',
	};
	const unresolved = $derived(
		graph?.edges.filter((edge) => edge.status !== 'resolved')
			.length ?? 0,
	);
	const orphans = $derived(
		graph?.nodes.filter((node) => node.orphan).length ?? 0,
	);
</script>

{#if app.not_indexed || is_not_indexed(error)}
	<NotIndexed />
{:else if error}
	<Alert.Root variant="destructive">
		<Alert.Title>Couldn't load the graph</Alert.Title>
		<Alert.Description>{String(error)}</Alert.Description>
	</Alert.Root>
{:else if !graph}
	<Skeleton class="h-136" />
{:else}
	<Card.Root>
		<Card.Header>
			<Card.Title>Link graph</Card.Title>
			<Card.Description>
				{graph.nodes.length} documents · {graph.edges.length} links ·
				{unresolved} broken · {orphans} orphans. Click a document to open
				it or drag it to move it; drag the background to pan, scroll to
				zoom.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="flex flex-wrap items-center gap-x-6 gap-y-3">
				<Select.Root type="single" bind:value={group_by}>
					<Select.Trigger class="w-48"
						>{group_labels[group_by]}</Select.Trigger
					>
					<Select.Content>
						{#each Object.entries(group_labels) as [value, label] (value)}
							<Select.Item {value}>{label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				<div class="flex items-center gap-2">
					<Switch
						id="show-unresolved"
						bind:checked={show_unresolved}
					/>
					<Label for="show-unresolved">Broken links</Label>
				</div>
				<div class="flex items-center gap-2">
					<Switch id="show-orphans" bind:checked={show_orphans} />
					<Label for="show-orphans">Orphans</Label>
				</div>
			</div>
			<LinkGraph
				{graph}
				{group_by}
				{show_unresolved}
				{show_orphans}
			/>
		</Card.Content>
	</Card.Root>
{/if}
