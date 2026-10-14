<script lang="ts">
	import { api } from '#lib/api.js';
	import { app } from '#lib/app-state.svelte.js';
	import * as Command from '#lib/components/ui/command/index.js';
	import { hit_href } from '#lib/router.js';
	import { router } from '#lib/router.svelte.js';
	import { theme } from '#lib/theme.svelte.js';
	import type { SearchHit } from '@wiki0/core';
	import ActivityIcon from '@lucide/svelte/icons/activity';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import NetworkIcon from '@lucide/svelte/icons/network';
	import SearchIcon from '@lucide/svelte/icons/search';
	import SunIcon from '@lucide/svelte/icons/sun';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let query = $state('');
	let hits = $state.raw<SearchHit[]>([]);
	let searching = $state(false);
	let request = 0;

	// Search runs on the server, so results come from core's ranking;
	// titles are matched locally as well for jumping straight to a doc.
	const title_matches = $derived.by(() => {
		const needle = query.trim().toLowerCase();
		if (!needle) return app.documents.slice(0, 8);
		return app.documents
			.filter((document) =>
				[document.title, document.path, ...document.aliases].some(
					(value) => value.toLowerCase().includes(needle),
				),
			)
			.slice(0, 8);
	});

	$effect(() => {
		const current = query.trim();
		const id = ++request;
		if (current.length < 2) {
			hits = [];
			return;
		}
		searching = true;
		const timer = setTimeout(() => {
			api
				.search(current, 8)
				.then((response) => {
					if (id === request) hits = response.results;
				})
				.catch(() => {
					if (id === request) hits = [];
				})
				.finally(() => {
					if (id === request) searching = false;
				});
		}, 150);
		return () => clearTimeout(timer);
	});

	function go(href: string) {
		open = false;
		router.navigate(href);
	}

	function handle_keydown(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			open = !open;
		}
	}
</script>

<svelte:window onkeydown={handle_keydown} />

<Command.Dialog
	bind:open
	shouldFilter={false}
	class="sm:max-w-2xl"
	title="Search docs"
	description="Search this project's docs and jump to the section"
>
	<Command.Input bind:value={query} placeholder="Search docs…" />
	<Command.List class="max-h-[min(60vh,32rem)]">
		<Command.Empty>
			{searching ? 'Searching…' : 'Nothing matches that.'}
		</Command.Empty>

		{#if hits.length > 0}
			<Command.Group heading="Sections">
				{#each hits as hit (hit.citation)}
					<Command.Item
						value={`hit:${hit.citation}`}
						onSelect={() => go(hit_href(hit))}
					>
						<SearchIcon />
						<div class="flex min-w-0 flex-col">
							<span class="truncate">
								{hit.breadcrumb.join(' › ') || hit.title}
							</span>
							<span class="truncate font-mono text-xs text-muted-foreground">
								{hit.citation}
								{#if hit.superseded_by}· superseded{/if}
							</span>
						</div>
					</Command.Item>
				{/each}
				{#if query.trim()}
					<Command.Item
						value="search-page"
						onSelect={() =>
							go(`/search?q=${encodeURIComponent(query.trim())}`)}
					>
						<SearchIcon />
						See all results and why they rank
					</Command.Item>
				{/if}
			</Command.Group>
		{/if}

		{#if title_matches.length > 0}
			<Command.Group heading="Documents">
				{#each title_matches as document (document.path)}
					<Command.Item
						value={`doc:${document.path}`}
						onSelect={() =>
							go(
								`/docs/${document.path.split('/').map(encodeURIComponent).join('/')}`,
							)}
					>
						<FileTextIcon />
						<div class="flex min-w-0 flex-col">
							<span class="truncate">{document.title}</span>
							<span class="truncate font-mono text-xs text-muted-foreground">
								{document.path}
							</span>
						</div>
					</Command.Item>
				{/each}
			</Command.Group>
		{/if}

		{#if !query.trim()}
			<Command.Separator />
			<Command.Group heading="Health">
				<Command.Item value="health" onSelect={() => go('/health')}>
					<ActivityIcon /> Index status
				</Command.Item>
				<Command.Item value="lint" onSelect={() => go('/health/lint')}>
					<TriangleAlertIcon /> Lint
				</Command.Item>
				<Command.Item value="graph" onSelect={() => go('/health/graph')}>
					<NetworkIcon /> Link graph
				</Command.Item>
				<Command.Item
					value="theme"
					onSelect={() => {
						theme.set(theme.dark ? 'light' : 'dark');
						open = false;
					}}
				>
					{#if theme.dark}<SunIcon />{:else}<MoonIcon />{/if}
					Switch to {theme.dark ? 'light' : 'dark'} theme
				</Command.Item>
			</Command.Group>
		{/if}
	</Command.List>
</Command.Dialog>
