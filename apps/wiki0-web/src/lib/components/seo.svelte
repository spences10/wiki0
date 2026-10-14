<script lang="ts">
	import ShareCardSize from '#lib/components/share-card-size.svelte';
	import { seo_config, type PageSeo } from '#lib/seo.js';
	import { Head, SchemaOrg, type SchemaOrgProps } from 'svead';

	// Every page's head goes through here: svead's meta tags, the
	// share card's size and the page's structured data
	let {
		page,
		schema,
	}: { page: PageSeo; schema: SchemaOrgProps['schema'] } = $props();
</script>

<Head seo_config={seo_config(page)} />
<!-- svead sets og:image. Its size tells platforms how to lay the card
     out before fetching it -->
<ShareCardSize />
<SchemaOrg {schema} />
