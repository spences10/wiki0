<script lang="ts">
	import { app } from '#lib/app-state.svelte.js';
	import * as Sidebar from '#lib/components/ui/sidebar/index.js';
	import * as Tooltip from '#lib/components/ui/tooltip/index.js';
	import { ancestor_folders, build_tree } from '#lib/doc-tree.js';
	import { router } from '#lib/router.svelte.js';
	import ActivityIcon from '@lucide/svelte/icons/activity';
	import NetworkIcon from '@lucide/svelte/icons/network';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import DocTreeNode from './doc-tree-node.svelte';
	import SidebarResizeHandle from './sidebar-resize-handle.svelte';

	let filter = $state('');

	const tree = $derived(build_tree(app.documents, filter));
	const active_path = $derived(
		router.route.name === 'docs' ? router.route.path : null,
	);
	const open_folders = $derived(
		new Set(active_path ? ancestor_folders(active_path) : []),
	);
	const project = $derived(
		app.meta?.root.split(/[\\/]/u).filter(Boolean).at(-1) ??
			'project',
	);

	const health = [
		{
			href: '/health',
			tab: 'status',
			label: 'Index status',
			icon: ActivityIcon,
		},
		{
			href: '/health/lint',
			tab: 'lint',
			label: 'Lint',
			icon: TriangleAlertIcon,
		},
		{
			href: '/health/graph',
			tab: 'graph',
			label: 'Link graph',
			icon: NetworkIcon,
		},
	] as const;
</script>

<Sidebar.Root>
	<Sidebar.Header>
		<a href="/" class="flex items-baseline gap-2 px-2 pt-1">
			<span
				class="text-lg font-bold tracking-tight font-stretch-112%"
			>
				wiki0
			</span>
			<span class="truncate font-mono text-xs text-muted-foreground">
				{project}
			</span>
		</a>
		<Sidebar.Input
			bind:value={filter}
			name="filter"
			placeholder="Filter docs"
			aria-label="Filter docs"
		/>
	</Sidebar.Header>
	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupLabel>
				Docs
				<span class="ml-auto tabular-nums"
					>{app.documents.length}</span
				>
			</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<!-- Paths show on hover, after a pause so scanning the tree stays quiet. -->
				<Tooltip.Provider delayDuration={500}>
					<Sidebar.Menu>
						{#each tree as node (node.path)}
							<DocTreeNode
								{node}
								{active_path}
								{open_folders}
								force_open={filter.trim() !== ''}
							/>
						{:else}
							<p class="px-2 py-1 text-sm text-muted-foreground">
								{filter ? 'No docs match.' : 'No docs indexed.'}
							</p>
						{/each}
					</Sidebar.Menu>
				</Tooltip.Provider>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>
	<Sidebar.Footer>
		<Sidebar.Menu>
			{#each health as item (item.href)}
				<Sidebar.MenuItem>
					<Sidebar.MenuButton
						isActive={router.route.name === 'health' &&
							router.route.tab === item.tab}
					>
						{#snippet child({ props })}
							<a href={item.href} {...props}>
								<item.icon />
								<span>{item.label}</span>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			{/each}
		</Sidebar.Menu>
	</Sidebar.Footer>
	<SidebarResizeHandle />
</Sidebar.Root>
