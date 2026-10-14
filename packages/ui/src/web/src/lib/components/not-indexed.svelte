<script lang="ts">
	import { app } from '#lib/app-state.svelte.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Empty from '#lib/components/ui/empty/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import DatabaseIcon from '@lucide/svelte/icons/database';
</script>

<Empty.Root class="min-h-[60vh]">
	<Empty.Header>
		<Empty.Media variant="icon"><DatabaseIcon /></Empty.Media>
		<Empty.Title>This project isn't indexed yet</Empty.Title>
		<Empty.Description>
			wiki0 reads the docs from its index. Build it here, or run
			<code class="font-mono">wiki0 index</code> in the project.
		</Empty.Description>
	</Empty.Header>
	<Empty.Content>
		<Button onclick={() => app.reindex()} disabled={app.reindexing}>
			{#if app.reindexing}<Spinner />{/if}
			Index the docs
		</Button>
	</Empty.Content>
</Empty.Root>
