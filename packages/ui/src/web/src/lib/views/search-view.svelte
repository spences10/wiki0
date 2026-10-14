<script lang="ts">
	import { api, is_not_indexed } from '#lib/api.js';
	import { app } from '#lib/app-state.svelte.js';
	import { snippet_parts } from '#lib/chart-data.js';
	import ScoreChart from '#lib/charts/score-chart.svelte';
	import CopyButton from '#lib/components/copy-button.svelte';
	import NotIndexed from '#lib/components/not-indexed.svelte';
	import StatusBadges from '#lib/components/status-badges.svelte';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Collapsible from '#lib/components/ui/collapsible/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { encode_doc_path, hit_href } from '#lib/router.js';
	import { router } from '#lib/router.svelte.js';
	import type { SearchResponse } from '@wiki0/core';
	import ChartBarIcon from '@lucide/svelte/icons/chart-bar';
	import FilePenIcon from '@lucide/svelte/icons/file-pen';
	import HistoryIcon from '@lucide/svelte/icons/history';
	import SearchIcon from '@lucide/svelte/icons/search';

	let { query }: { query: string } = $props();

	let draft = $state('');
	let response = $state.raw<SearchResponse | null>(null);
	let error = $state<unknown>(null);
	let loading = $state(false);

	$effect(() => {
		draft = query;
	});

	$effect(() => {
		const current = query.trim();
		void app.version;
		if (!current) {
			response = null;
			return;
		}
		let cancelled = false;
		loading = true;
		api
			.search(current, 20)
			.then((result) => {
				if (!cancelled) {
					response = result;
					error = null;
				}
			})
			.catch((caught: unknown) => {
				if (!cancelled) error = caught;
			})
			.finally(() => {
				if (!cancelled) loading = false;
			});
		return () => {
			cancelled = true;
		};
	});

	function submit(event: SubmitEvent) {
		event.preventDefault();
		router.navigate(`/search?q=${encodeURIComponent(draft.trim())}`);
	}

	const relaxation_labels: Record<string, string> = {
		'all-terms': 'all terms matched',
		'without-stopwords': 'matched without stopwords',
		'dropped-terms': 'dropped terms no doc contains',
		'any-term': 'matched any term',
	};
</script>

<div class="mx-auto max-w-4xl space-y-6 px-6 py-8">
	<form onsubmit={submit} class="relative">
		<SearchIcon
			class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
		/>
		<Input
			bind:value={draft}
			placeholder="Search docs"
			class="h-11 pl-9 text-base"
			aria-label="Search docs"
		/>
	</form>

	{#if app.not_indexed || is_not_indexed(error)}
		<NotIndexed />
	{:else if error}
		<Alert.Root variant="destructive">
			<Alert.Title>Search failed</Alert.Title>
			<Alert.Description>{String(error)}</Alert.Description>
		</Alert.Root>
	{:else if loading && !response}
		{#each [1, 2, 3] as row (row)}
			<Skeleton class="h-28 w-full" />
		{/each}
	{:else if response}
		<div
			class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
		>
			<span>
				{response.results.length} document{response.results.length ===
				1
					? ''
					: 's'}
			</span>
			{#if response.relaxation}
				<Badge variant="outline">
					{relaxation_labels[response.relaxation] ??
						response.relaxation}
				</Badge>
			{/if}
		</div>
		{#each response.warnings as warning (warning)}
			<Alert.Root
				><Alert.Description>{warning}</Alert.Description></Alert.Root
			>
		{/each}

		<ol class="space-y-4" class:opacity-60={loading}>
			{#each response.results as hit, index (hit.citation)}
				<li>
					<Card.Root class="gap-3 py-4">
						<Card.Header class="gap-1 px-5">
							<div class="flex items-start gap-3">
								<span
									class="mt-0.5 font-mono text-xs text-muted-foreground tabular-nums"
								>
									{index + 1}
								</span>
								<div class="min-w-0 flex-1 space-y-1">
									<Card.Title class="text-base leading-snug">
										<a href={hit_href(hit)} class="hover:text-accent">
											{hit.breadcrumb.join(' › ') || hit.title}
										</a>
									</Card.Title>
									<div class="flex flex-wrap items-center gap-1.5">
										<StatusBadges
											status={hit.status}
											doc_type={hit.doc_type}
											date={hit.date}
											superseded={hit.superseded_by !== null}
										/>
										{#if hit.more_in_doc > 0}
											<Badge
												variant="ghost"
												class="text-muted-foreground"
											>
												+{hit.more_in_doc} more in this doc
											</Badge>
										{/if}
									</div>
								</div>
								<CopyButton
									text={hit.citation}
									label="Copy citation"
								/>
							</div>
						</Card.Header>
						<Card.Content class="space-y-3 px-5 pl-11">
							<p
								class="text-sm leading-relaxed text-muted-foreground"
							>
								{#each snippet_parts(hit.snippet, hit.match_ranges) as part, part_index (part_index)}
									{#if part.match}
										<mark
											class="rounded-sm bg-signal/20 px-0.5 text-foreground"
											>{part.text}</mark
										>
									{:else}{part.text}{/if}
								{/each}
							</p>
							{#if hit.superseded_by}
								<p
									class="flex items-center gap-1.5 text-sm text-warning"
								>
									<HistoryIcon class="size-4" />
									Superseded; read
									<a
										href="/docs/{encode_doc_path(hit.superseded_by)}"
										class="font-medium underline underline-offset-3"
									>
										{app.title_for(hit.superseded_by)}
									</a>
									instead.
								</p>
							{:else if hit.amended_by}
								<p
									class="flex items-center gap-1.5 text-sm text-muted-foreground"
								>
									<FilePenIcon class="size-4" />
									Partly replaced by
									<a
										href="/docs/{encode_doc_path(hit.amended_by)}"
										class="font-medium text-accent underline underline-offset-3"
									>
										{app.title_for(hit.amended_by)}
									</a>; read it too.
								</p>
							{/if}
							<Collapsible.Root>
								<Collapsible.Trigger
									class="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
								>
									<ChartBarIcon class="size-3.5" />
									Why this rank · score {hit.score.toFixed(3)}
								</Collapsible.Trigger>
								<Collapsible.Content class="pt-3">
									<ScoreChart parts={hit.score_parts} />
								</Collapsible.Content>
							</Collapsible.Root>
						</Card.Content>
					</Card.Root>
				</li>
			{:else}
				<li class="py-12 text-center text-muted-foreground">
					Nothing matches “{query}”.
				</li>
			{/each}
		</ol>
	{:else}
		<p class="py-12 text-center text-muted-foreground">
			Search returns the most authoritative matching section of each
			document. Press <kbd class="font-mono">⌘K</kbd> anywhere.
		</p>
	{/if}
</div>
