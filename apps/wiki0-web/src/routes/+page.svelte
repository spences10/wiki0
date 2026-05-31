<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
	} from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Separator } from '$lib/components/ui/separator';
	import WikiGraph from '$lib/wiki-graph.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const unresolved_count = $derived(
		data.graph.edges.filter((edge) => edge.status === 'unresolved')
			.length,
	);

	function select_page(path: string) {
		const params = new URLSearchParams();
		if (data.query) params.set('q', data.query);
		params.set('page', path);
		goto(resolve(`/?${params.toString()}`), {
			keepFocus: true,
			noScroll: true,
		});
	}
</script>

<svelte:head>
	<title>wiki0</title>
</svelte:head>

<main class="min-h-screen bg-background p-4 text-foreground">
	<header class="mb-4 flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold">wiki0 web</h1>
			<p class="text-sm text-muted-foreground">{data.root}</p>
		</div>
		<form class="flex gap-2" method="GET">
			<Input
				class="w-72"
				name="q"
				placeholder="Search wiki"
				value={data.query}
			/>
			<Button type="submit" variant="outline">Search</Button>
		</form>
	</header>

	<section class="mb-4 grid gap-3 md:grid-cols-4">
		<Card>
			<CardHeader><CardTitle>Pages</CardTitle></CardHeader>
			<CardContent class="text-2xl font-semibold">
				{data.graph.nodes.length}
			</CardContent>
		</Card>
		<Card>
			<CardHeader><CardTitle>Edges</CardTitle></CardHeader>
			<CardContent class="text-2xl font-semibold">
				{data.graph.edges.length}
			</CardContent>
		</Card>
		<Card>
			<CardHeader><CardTitle>Unresolved</CardTitle></CardHeader>
			<CardContent class="text-2xl font-semibold">
				{unresolved_count}
			</CardContent>
		</Card>
		<Card>
			<CardHeader><CardTitle>Review</CardTitle></CardHeader>
			<CardContent class="text-2xl font-semibold">
				{data.review.length}
			</CardContent>
		</Card>
	</section>

	{#if data.status.stale}
		<div
			class="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
		>
			Index was stale: {data.status.reasons.join(', ')}
		</div>
	{/if}

	<WikiGraph
		nodes={data.graph.nodes}
		edges={data.graph.edges}
		selectedPath={data.selected_path}
		onselect={select_page}
	/>

	{#if data.selected_page}
		<Card class="mt-4">
			<CardHeader>
				<CardTitle>{data.selected_page.title}</CardTitle>
			</CardHeader>
			<CardContent class="grid gap-4 lg:grid-cols-[1fr_18rem]">
				<ScrollArea class="max-h-96 rounded-md border p-3">
					<pre class="whitespace-pre-wrap text-sm">{data.selected_page
							.content}</pre>
				</ScrollArea>
				<div class="space-y-3 text-sm">
					<div>
						<p class="font-medium">Path</p>
						<p class="break-all text-muted-foreground">
							{data.selected_page.path}
						</p>
					</div>
					<div>
						<p class="font-medium">Backlinks</p>
						{#each data.backlinks as backlink (backlink.path + backlink.raw_text)}
							<button
								class="block text-left text-muted-foreground hover:text-foreground"
								type="button"
								onclick={() => select_page(backlink.path)}
							>
								{backlink.title}
							</button>
						{:else}
							<p class="text-muted-foreground">No backlinks.</p>
						{/each}
					</div>
				</div>
			</CardContent>
		</Card>
	{/if}

	{#if data.query}
		<Card class="mt-4">
			<CardHeader>
				<CardTitle>Search results</CardTitle>
			</CardHeader>
			<CardContent>
				<ScrollArea class="max-h-80">
					{#each data.search as result (result.path)}
						<article class="py-3">
							<div class="mb-1 flex items-center gap-2">
								<p class="font-medium">{result.title}</p>
								<Badge variant="outline">{result.path}</Badge>
							</div>
							<p class="text-sm text-muted-foreground">
								{result.snippet}
							</p>
						</article>
						<Separator />
					{:else}
						<p class="text-sm text-muted-foreground">No results.</p>
					{/each}
				</ScrollArea>
			</CardContent>
		</Card>
	{/if}
</main>
