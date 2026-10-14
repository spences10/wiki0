<script lang="ts">
	import { has_token } from '#lib/api.js';
	import { app } from '#lib/app-state.svelte.js';
	import CommandPalette from '#lib/components/command-palette.svelte';
	import AppSidebar from '#lib/components/app-sidebar.svelte';
	import ThemeToggle from '#lib/components/theme-toggle.svelte';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Empty from '#lib/components/ui/empty/index.js';
	import { Kbd } from '#lib/components/ui/kbd/index.js';
	import * as Sidebar from '#lib/components/ui/sidebar/index.js';
	import * as Tooltip from '#lib/components/ui/tooltip/index.js';
	import { router } from '#lib/router.svelte.js';
	import { theme } from '#lib/theme.svelte.js';
	import DocsView from '#lib/views/docs-view.svelte';
	import KeyRoundIcon from '@lucide/svelte/icons/key-round';
	import SearchIcon from '@lucide/svelte/icons/search';
	import { onMount } from 'svelte';

	// Health views carry the charts and graph, so they load on demand.
	const load_health = () => import('#lib/views/health-view.svelte');
	const load_search = () => import('#lib/views/search-view.svelte');

	let palette_open = $state(false);

	$effect(() => theme.apply());

	onMount(() => {
		void app.load();
		return app.start_polling();
	});

	const route = $derived(router.route);
</script>

<svelte:window onpopstate={router.sync} onhashchange={router.sync} />
<svelte:document onclick={router.handle_click} />

<Tooltip.Provider>
	{#if !has_token()}
		<Empty.Root class="min-h-svh">
			<Empty.Header>
				<Empty.Media variant="icon"><KeyRoundIcon /></Empty.Media>
				<Empty.Title
					>Open the link from <code>wiki0 ui</code></Empty.Title
				>
				<Empty.Description>
					This page needs the access token in the URL that
					<code class="font-mono">wiki0 ui</code> prints. Run it again to
					get the link.
				</Empty.Description>
			</Empty.Header>
		</Empty.Root>
	{:else}
		<Sidebar.Provider>
			<AppSidebar />
			<Sidebar.Inset>
				<header
					class="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur"
				>
					<Sidebar.Trigger class="-ml-1" />
					<Button
						variant="outline"
						class="ml-2 w-full max-w-sm justify-start text-muted-foreground"
						onclick={() => (palette_open = true)}
					>
						<SearchIcon />
						Search docs
						<Kbd class="ml-auto">⌘K</Kbd>
					</Button>
					<div class="ml-auto flex items-center gap-1">
						<ThemeToggle />
					</div>
				</header>

				{#if app.error}
					<Alert.Root variant="destructive" class="m-6 max-w-2xl">
						<Alert.Title>Couldn't reach the wiki0 server</Alert.Title>
						<Alert.Description>{app.error}</Alert.Description>
					</Alert.Root>
				{/if}

				<main class="min-w-0 flex-1">
					{#if route.name === 'docs'}
						<DocsView
							path={route.path}
							fragment={route.fragment}
							highlight={route.highlight}
						/>
					{:else if route.name === 'search'}
						{#await load_search() then module}
							<module.default query={route.query} />
						{/await}
					{:else if route.name === 'health'}
						{#await load_health() then module}
							<module.default tab={route.tab} />
						{/await}
					{:else}
						<Empty.Root class="min-h-[60vh]">
							<Empty.Header>
								<Empty.Title>Page not found</Empty.Title>
								<Empty.Description>
									<a href="/" class="underline">Back to the docs</a>
								</Empty.Description>
							</Empty.Header>
						</Empty.Root>
					{/if}
				</main>
			</Sidebar.Inset>
		</Sidebar.Provider>
		<CommandPalette bind:open={palette_open} />
	{/if}
</Tooltip.Provider>
