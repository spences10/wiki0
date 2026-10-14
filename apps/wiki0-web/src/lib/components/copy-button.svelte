<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import { onDestroy } from 'svelte';

	let { text, label = 'Copy' }: { text: string; label?: string } =
		$props();

	let status = $state('');
	let timer: ReturnType<typeof setTimeout> | undefined;
	onDestroy(() => clearTimeout(timer));

	async function copy() {
		try {
			await navigator.clipboard.writeText(text);
			status = 'Copied';
		} catch {
			status = 'Copy failed';
		}
		clearTimeout(timer);
		timer = setTimeout(() => (status = ''), 2000);
	}
</script>

<Button
	variant="ghost"
	size="icon-sm"
	class="text-muted-foreground"
	onclick={copy}
	aria-label={label}
	title={status || label}
>
	{#if status === 'Copied'}<CheckIcon />{:else}<CopyIcon />{/if}
</Button>
<span class="sr-only" role="status">{status}</span>
