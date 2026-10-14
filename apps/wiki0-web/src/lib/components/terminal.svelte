<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		class: class_name = '',
		children,
	}: { title: string; class?: string; children: Snippet } = $props();
</script>

<figure
	class={[
		'overflow-hidden rounded-xl border bg-card font-mono text-[0.8rem] leading-relaxed shadow-[0_1px_0_var(--border),0_24px_48px_-24px_color-mix(in_oklab,var(--foreground)_25%,transparent)]',
		class_name,
	]}
>
	<figcaption
		class="flex items-center gap-2 border-b px-4 py-2 text-xs text-muted-foreground"
	>
		<span class="flex gap-1.5" aria-hidden="true">
			<span class="size-2.5 rounded-full bg-foreground/15"></span>
			<span class="size-2.5 rounded-full bg-foreground/15"></span>
			<span class="size-2.5 rounded-full bg-foreground/15"></span>
		</span>
		<span class="ml-2 truncate">{title}</span>
	</figcaption>
	<div class="overflow-x-auto px-4 py-3">
		{@render children()}
	</div>
</figure>
