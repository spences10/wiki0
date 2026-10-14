<script lang="ts">
	import * as Collapsible from '#lib/components/ui/collapsible/index.js';
	import * as Sidebar from '#lib/components/ui/sidebar/index.js';
	import type { TreeNode } from '#lib/doc-tree.js';
	import { encode_doc_path } from '#lib/router.js';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import Self from './doc-tree-node.svelte';

	let {
		node,
		active_path,
		open_folders,
		force_open = false,
	}: {
		node: TreeNode;
		active_path: string | null;
		// Folders holding the active document start open.
		open_folders: ReadonlySet<string>;
		// Open every folder while filtering.
		force_open?: boolean;
	} = $props();

	let toggled = $state<boolean | null>(null);
	const open = $derived(
		force_open || (toggled ?? open_folders.has(node.path)),
	);
</script>

{#if node.kind === 'document'}
	{@const document = node.document}
	{@const superseded =
		document.superseded_by !== null ||
		document.status === 'superseded'}
	<Sidebar.MenuItem>
		<Sidebar.MenuButton
			isActive={active_path === node.path}
			class={superseded ? 'text-muted-foreground line-through' : ''}
			tooltipContent={document.path}
		>
			{#snippet child({ props })}
				<a href="/docs/{encode_doc_path(node.path)}" {...props}>
					<FileTextIcon />
					<span>{document.title}</span>
				</a>
			{/snippet}
		</Sidebar.MenuButton>
	</Sidebar.MenuItem>
{:else}
	<Sidebar.MenuItem>
		<Collapsible.Root
			{open}
			onOpenChange={(value) => (toggled = value)}
			class="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
		>
			<Collapsible.Trigger>
				{#snippet child({ props })}
					<Sidebar.MenuButton {...props}>
						<ChevronRightIcon class="transition-transform" />
						<FolderIcon />
						<span>{node.name}</span>
						<span
							class="ml-auto text-xs text-muted-foreground tabular-nums"
						>
							{node.count}
						</span>
					</Sidebar.MenuButton>
				{/snippet}
			</Collapsible.Trigger>
			<Collapsible.Content>
				<Sidebar.MenuSub class="mr-0 pr-0">
					{#each node.children as child (child.path)}
						<Self
							node={child}
							{active_path}
							{open_folders}
							{force_open}
						/>
					{/each}
				</Sidebar.MenuSub>
			</Collapsible.Content>
		</Collapsible.Root>
	</Sidebar.MenuItem>
{/if}
