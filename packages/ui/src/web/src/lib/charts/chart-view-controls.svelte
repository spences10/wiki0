<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';
	import type { IsometricViewState } from '#lib/isometric-view.svelte.js';

	let {
		view,
		// What the buttons act on, for charts that share a page
		label = 'chart',
		// Only charts that still read from directly above offer it
		can_flatten = false,
	}: {
		view: IsometricViewState;
		label?: string;
		can_flatten?: boolean;
	} = $props();

	const turn_step = 45;
</script>

<div
	class="flex items-center gap-1"
	role="group"
	aria-label="{label} view"
>
	<Button
		variant="outline"
		size="icon-sm"
		aria-label="Turn {label} left"
		onclick={() => view.turn(-turn_step)}
	>
		<RotateCcw aria-hidden="true" />
	</Button>
	<Button
		variant="outline"
		size="icon-sm"
		aria-label="Turn {label} right"
		onclick={() => view.turn(turn_step)}
	>
		<RotateCw aria-hidden="true" />
	</Button>
	{#if can_flatten}
		<Button
			variant={view.flat ? 'default' : 'outline'}
			size="sm"
			aria-pressed={view.flat}
			aria-label="Show {label} flat"
			onclick={view.toggle_flat}
		>
			Flat
		</Button>
	{/if}
	<Button
		variant="outline"
		size="sm"
		aria-label="Reset {label} view"
		onclick={view.reset}
	>
		Reset
	</Button>
</div>
