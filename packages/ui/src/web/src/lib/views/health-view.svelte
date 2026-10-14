<script lang="ts">
	import type { HealthTab } from '#lib/router.js';
	import GraphView from './graph-view.svelte';
	import LintView from './lint-view.svelte';
	import StatusView from './status-view.svelte';

	let { tab }: { tab: HealthTab } = $props();

	const titles: Record<
		HealthTab,
		{ title: string; description: string }
	> = {
		status: {
			title: 'Index status',
			description:
				'What wiki0 indexed, how it was chunked and whether it is current.',
		},
		lint: {
			title: 'Lint',
			description:
				'Links core could not resolve, and documents nothing links to.',
		},
		graph: {
			title: 'Link graph',
			description: 'How the documents link to each other.',
		},
	};
	const tabs: HealthTab[] = ['status', 'lint', 'graph'];
</script>

<div class="mx-auto max-w-6xl space-y-6 px-6 py-8">
	<header class="space-y-3">
		<nav class="flex gap-1 text-sm" aria-label="Health">
			{#each tabs as name (name)}
				<a
					href={name === 'status' ? '/health' : `/health/${name}`}
					aria-current={tab === name ? 'page' : undefined}
					class={[
						'rounded-md px-3 py-1.5 transition-colors',
						tab === name
							? 'bg-muted font-medium text-foreground'
							: 'text-muted-foreground hover:text-foreground',
					]}
				>
					{titles[name].title}
				</a>
			{/each}
		</nav>
		<div>
			<h1 class="text-2xl">{titles[tab].title}</h1>
			<p class="text-muted-foreground">{titles[tab].description}</p>
		</div>
	</header>

	{#if tab === 'status'}
		<StatusView />
	{:else if tab === 'lint'}
		<LintView />
	{:else}
		<GraphView />
	{/if}
</div>
