<script lang="ts">
	import {
		api,
		is_not_indexed,
		type DocumentChunks,
		type StatusResponse,
	} from '#lib/api.js';
	import { app } from '#lib/app-state.svelte.js';
	import { count_by } from '#lib/chart-data.js';
	import CountDonut from '#lib/charts/count-donut.svelte';
	import IndexSkyline from '#lib/charts/index-skyline.svelte';
	import TokenHistogram from '#lib/charts/token-histogram.svelte';
	import CopyButton from '#lib/components/copy-button.svelte';
	import NotIndexed from '#lib/components/not-indexed.svelte';
	import ReindexButton from '#lib/components/reindex-button.svelte';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import * as Tabs from '#lib/components/ui/tabs/index.js';
	import { encode_doc_path } from '#lib/router.js';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';

	let status = $state.raw<StatusResponse | null>(null);
	let chunks = $state.raw<DocumentChunks[]>([]);
	let error = $state<unknown>(null);

	$effect(() => {
		void app.version;
		let cancelled = false;
		Promise.all([api.status(), api.all_chunks().catch(() => [])])
			.then(([status_result, chunk_result]) => {
				if (cancelled) return;
				status = status_result;
				chunks = chunk_result;
				error = null;
			})
			.catch((caught: unknown) => {
				if (!cancelled) error = caught;
			});
		return () => {
			cancelled = true;
		};
	});

	const tokens = $derived(
		chunks.flatMap((document) =>
			document.chunks.map((chunk) => chunk.tokens),
		),
	);
	const chunk_count = $derived(tokens.length);
	const total_tokens = $derived(
		tokens.reduce((sum, value) => sum + value, 0),
	);
	const types = $derived(
		count_by(app.documents, (document) => document.doc_type),
	);
	const statuses = $derived(
		count_by(app.documents, (document) =>
			document.superseded_by ? 'superseded' : document.status,
		),
	);
	const change_tabs = $derived(
		status
			? (
					[
						['new', status.status.changes.new],
						['modified', status.status.changes.modified],
						['deleted', status.status.changes.deleted],
					] as const
				).filter(([, paths]) => paths.length > 0)
			: [],
	);

	function when(value: string | null) {
		if (!value) return 'never';
		return new Date(value).toLocaleString();
	}
</script>

<div class="space-y-6">
	{#if app.not_indexed || is_not_indexed(error)}
		<NotIndexed />
	{:else if error}
		<Alert.Root variant="destructive">
			<Alert.Title>Couldn't read the index</Alert.Title>
			<Alert.Description>{String(error)}</Alert.Description>
		</Alert.Root>
	{:else if !status}
		<div class="grid gap-4 md:grid-cols-4">
			{#each [1, 2, 3, 4] as tile (tile)}<Skeleton
					class="h-24"
				/>{/each}
		</div>
	{:else}
		{@const index = status.status}
		{#if index.stale}
			<Alert.Root class="border-warning/40 bg-warning/5">
				<TriangleAlertIcon class="text-warning!" />
				<Alert.Title>The index is out of date</Alert.Title>
				<Alert.Description>
					<p>{index.reasons.join(', ')}</p>
					{#if change_tabs.length > 0}
						<Tabs.Root value={change_tabs[0]![0]} class="mt-2 w-full">
							<Tabs.List>
								{#each change_tabs as [name, paths] (name)}
									<Tabs.Trigger value={name}>
										{name}
										<Badge variant="secondary">{paths.length}</Badge>
									</Tabs.Trigger>
								{/each}
							</Tabs.List>
							{#each change_tabs as [name, paths] (name)}
								<Tabs.Content value={name}>
									<ul
										class="max-h-48 overflow-y-auto font-mono text-xs"
									>
										{#each paths as path (path)}
											<li>
												{#if name === 'deleted'}{path}{:else}
													<a
														href="/docs/{encode_doc_path(path)}"
														class="hover:text-accent">{path}</a
													>
												{/if}
											</li>
										{/each}
									</ul>
								</Tabs.Content>
							{/each}
						</Tabs.Root>
					{/if}
					<div class="mt-3"><ReindexButton variant="default" /></div>
				</Alert.Description>
			</Alert.Root>
		{/if}

		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{#each [{ label: 'Documents', value: index.indexed_page_count, detail: `${index.page_count} in the project` }, { label: 'Chunks', value: chunk_count, detail: 'sections search returns' }, { label: 'Tokens', value: total_tokens.toLocaleString(), detail: chunk_count ? `${Math.round(total_tokens / chunk_count)} per chunk` : '' }, { label: 'Indexed', value: when(index.indexed_at), detail: `schema ${index.schema_version ?? '–'} · wiki0 ${index.package_version ?? '–'}` }] as tile (tile.label)}
				<Card.Root class="gap-1 py-4">
					<Card.Header class="px-5">
						<Card.Description>{tile.label}</Card.Description>
						<Card.Title class="text-2xl tabular-nums"
							>{tile.value}</Card.Title
						>
					</Card.Header>
					<Card.Content class="px-5 text-xs text-muted-foreground">
						{tile.detail}
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					{#if !index.stale}<CircleCheckIcon
							class="size-4 text-chart-3"
						/>{/if}
					Index
				</Card.Title>
				<Card.Description>
					{index.stale ? 'Stale' : 'Up to date'} · stored in
					{status.location.source === 'cache'
						? 'the user cache'
						: status.location.source === 'local'
							? 'the project (.wiki0/)'
							: 'WIKI0_INDEX'}
				</Card.Description>
				<Card.Action><ReindexButton /></Card.Action>
			</Card.Header>
			<Card.Content class="space-y-2 text-sm">
				<CopyButton
					text={status.location.index_path}
					label="Copy index path"
					class="-ml-3"
				/>
				{#if status.location.config_path}
					<p class="text-muted-foreground">
						Config: <span class="font-mono text-xs"
							>{status.location.config_path}</span
						>
					</p>
				{/if}
				{#if index.warnings.length > 0}
					<div class="pt-2">
						<p class="mb-1 font-medium">
							Warnings from the last index
						</p>
						<ul
							class="space-y-0.5 font-mono text-xs text-muted-foreground"
						>
							{#each index.warnings as warning (warning)}<li>
									{warning}
								</li>{/each}
						</ul>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		{#if chunks.length > 0}
			<Card.Root>
				<Card.Header>
					<Card.Title>Index skyline</Card.Title>
					<Card.Description
						>How the largest documents were chunked</Card.Description
					>
				</Card.Header>
				<Card.Content
					><IndexSkyline documents={chunks} /></Card.Content
				>
			</Card.Root>
		{/if}

		<div class="grid gap-4 lg:grid-cols-3">
			<Card.Root>
				<Card.Header>
					<Card.Title>Chunk sizes</Card.Title>
					<Card.Description>Chunks by token count</Card.Description>
				</Card.Header>
				<Card.Content><TokenHistogram {tokens} /></Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header>
					<Card.Title>Document types</Card.Title>
					<Card.Description
						>From frontmatter or folder</Card.Description
					>
				</Card.Header>
				<Card.Content
					><CountDonut counts={types} unit="docs" /></Card.Content
				>
			</Card.Root>
			<Card.Root>
				<Card.Header>
					<Card.Title>Statuses</Card.Title>
					<Card.Description
						>Superseded docs rank much lower</Card.Description
					>
				</Card.Header>
				<Card.Content
					><CountDonut counts={statuses} unit="docs" /></Card.Content
				>
			</Card.Root>
		</div>
	{/if}
</div>
