<script lang="ts">
	import { site } from '#lib/site.js';
</script>

<!-- Open Graph reads these as properties of the og:image before them,
     so they render from a component after svead's Head: a component's
     own svelte:head comes out ahead of its children's -->
<svelte:head>
	<meta property="og:image:type" content="image/png" />
	<meta
		property="og:image:width"
		content={String(site.share_card.width)}
	/>
	<meta
		property="og:image:height"
		content={String(site.share_card.height)}
	/>
</svelte:head>
