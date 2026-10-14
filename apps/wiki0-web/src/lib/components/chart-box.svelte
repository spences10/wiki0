<script lang="ts">
	import { onMount, type Snippet } from 'svelte';

	// Charts draw in the browser: the box holds their space from the
	// first paint so nothing moves when they arrive, and shows the
	// fallback without JS. Its height follows its width by `ratio`
	// (as "16 / 7"), never below `min_height`, and never widens it.
	let {
		ratio,
		min_height = '18rem',
		label,
		children,
		fallback,
	}: {
		ratio: string;
		min_height?: string;
		label: string;
		children: Snippet;
		fallback?: Snippet;
	} = $props();

	const [w, h] = $derived(
		ratio.split('/').map((part) => Number(part)),
	);

	let mounted = $state(false);
	onMount(() => (mounted = true));
</script>

<div class="box" role="img" aria-label={label}>
	<div
		class="relative"
		style:height="max({min_height}, calc(100cqw * {h} / {w}))"
	>
		{#if mounted}
			<div class="absolute inset-0">{@render children()}</div>
		{:else}
			{@render fallback?.()}
		{/if}
	</div>
</div>

<style>
	.box {
		container-type: inline-size;
		width: 100%;
	}
</style>
