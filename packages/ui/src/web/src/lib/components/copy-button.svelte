<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Tooltip from '#lib/components/ui/tooltip/index.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import { onDestroy } from 'svelte';

	let {
		text,
		label = 'Copy',
		class: class_name = '',
	}: { text: string; label?: string; class?: string } = $props();

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

<Tooltip.Root>
	<Tooltip.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="ghost"
				size="sm"
				class={['font-mono text-xs text-muted-foreground', class_name]}
				onclick={copy}
				aria-label={label}
			>
				{#if status === 'Copied'}<CheckIcon />{:else}<CopyIcon />{/if}
				{text}
			</Button>
		{/snippet}
	</Tooltip.Trigger>
	<Tooltip.Content>{status || label}</Tooltip.Content>
</Tooltip.Root>
<span class="sr-only" role="status">{status}</span>
