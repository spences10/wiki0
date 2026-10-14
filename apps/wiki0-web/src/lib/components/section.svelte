<script lang="ts">
	import type { Snippet } from 'svelte';

	// A section of the story: its heading and copy, then the set piece
	// it is about. `band` puts it on full-bleed violet.
	let {
		id,
		title,
		band = false,
		copy,
		children,
	}: {
		id: string;
		title: string;
		band?: boolean;
		copy: Snippet;
		children: Snippet;
	} = $props();
</script>

<section
	{id}
	aria-labelledby="{id}-title"
	class={['section', band && 'band']}
>
	<div class="inner">
		<header class="copy">
			<h2 id="{id}-title" class="title">{title}</h2>
			{@render copy()}
		</header>
		{@render children()}
	</div>
</section>

<style>
	.section {
		padding-block: clamp(5rem, 12vw, 9rem);
	}

	.inner {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: clamp(2.5rem, 5vw, 4rem);
		max-width: 80rem;
		margin-inline: auto;
		padding-inline: 1rem;
	}

	@media (min-width: 40rem) {
		.inner {
			padding-inline: 2rem;
		}
	}

	.copy {
		display: grid;
		gap: 1rem;
		max-width: 44rem;
	}

	.copy :global(p) {
		font-size: clamp(1.05rem, 1.4vw, 1.25rem);
		line-height: 1.6;
		color: var(--muted-foreground);
	}

	.title {
		font-size: clamp(2.2rem, 5vw, 4.4rem);
		font-stretch: 122%;
		font-weight: 760;
		line-height: 0.98;
		letter-spacing: -0.035em;
	}
</style>
