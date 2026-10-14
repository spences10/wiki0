<script lang="ts">
	import { app } from '#lib/app-state.svelte.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';

	let { variant = 'outline' }: { variant?: 'outline' | 'default' } =
		$props();
</script>

<Button
	{variant}
	size="sm"
	onclick={() => app.reindex()}
	disabled={app.reindexing}
>
	{#if app.reindexing}<Spinner />{:else}<RefreshCwIcon />{/if}
	Reindex
</Button>
