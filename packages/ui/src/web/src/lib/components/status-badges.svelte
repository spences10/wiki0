<script lang="ts">
	import { Badge } from '#lib/components/ui/badge/index.js';

	// Frontmatter facts shown beside a document title or search hit.
	let {
		status,
		doc_type,
		date,
		superseded = false,
	}: {
		status?: string | null;
		doc_type?: string | null;
		date?: string | null;
		superseded?: boolean;
	} = $props();

	const demoted = new Set(['superseded', 'deprecated', 'archived']);
	const tentative = new Set(['draft', 'proposed']);
</script>

{#if superseded || (status && demoted.has(status))}
	<Badge variant="destructive">{status ?? 'superseded'}</Badge>
{:else if status}
	<Badge variant={tentative.has(status) ? 'outline' : 'secondary'}>
		{status}
	</Badge>
{/if}
{#if doc_type}
	<Badge variant="outline">{doc_type}</Badge>
{/if}
{#if date}
	<Badge variant="ghost" class="font-mono text-muted-foreground">
		{date}
	</Badge>
{/if}
