<script lang="ts">
	import type { DocumentHeading } from '@wiki0/core';

	let {
		headings,
		container,
	}: {
		headings: DocumentHeading[];
		// The rendered document, to follow which heading is in view.
		container: HTMLElement | undefined;
	} = $props();

	let active = $state<string | null>(null);
	const top_depth = $derived(
		Math.min(...headings.map((heading) => heading.depth)),
	);

	$effect(() => {
		if (!container) return;
		const elements = headings
			.map((heading) => container.ownerDocument.getElementById(heading.slug))
			.filter((element): element is HTMLElement => element !== null);
		const observer = new IntersectionObserver(
			(entries) => {
				const visible = entries
					.filter((entry) => entry.isIntersecting)
					.sort(
						(a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
					);
				if (visible[0]) active = visible[0].target.id;
			},
			{ rootMargin: '-64px 0px -70% 0px' },
		);
		for (const element of elements) observer.observe(element);
		return () => observer.disconnect();
	});
</script>

<nav aria-label="On this page" class="space-y-2">
	<h2 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
		On this page
	</h2>
	<ul class="space-y-1 border-l border-border text-sm">
		{#each headings as heading (heading.slug)}
			<li style:padding-left="{(heading.depth - top_depth) * 0.75 + 0.75}rem">
				<a
					href="#{heading.slug}"
					class={[
						'-ml-px block border-l py-0.5 transition-colors',
						active === heading.slug
							? 'border-accent text-foreground'
							: 'border-transparent text-muted-foreground hover:text-foreground',
					]}
				>
					{heading.text}
				</a>
			</li>
		{/each}
	</ul>
</nav>
