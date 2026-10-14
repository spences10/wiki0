<script lang="ts">
	import CopyButton from '#lib/components/copy-button.svelte';
	import * as Tabs from '#lib/components/ui/tabs/index.js';

	const prompts = [
		'Use pnpx @wiki0/cli to find where we decided how deploys work.',
		'Use pnpx @wiki0/cli and show me the docs.',
		'Use pnpx @wiki0/cli lint and fix the broken links in our docs.',
	];
	const commands = [
		['npx @wiki0/cli index', 'index the project docs'],
		[
			'npx @wiki0/cli search "how do deploys work"',
			'one cited section per doc',
		],
		[
			'npx @wiki0/cli show docs/deploys.md:12-40',
			'read a cited section',
		],
		['npx @wiki0/cli lint', 'broken links and anchors'],
		['npx @wiki0/cli ui', 'open the local docs browser'],
	];
	const mcp_config = JSON.stringify(
		{
			mcpServers: {
				wiki0: { command: 'npx', args: ['-y', '@wiki0/mcp'] },
			},
		},
		null,
		2,
	);
	const principles = [
		[
			'Never calls an LLM',
			'Search is SQLite full-text search with ranking rules you can read.',
		],
		[
			'Never changes your files',
			'It reads your docs. The index lives in your user cache.',
		],
		[
			'No folder layout to adopt',
			'It works with the Markdown you already have. Frontmatter is optional.',
		],
		[
			'Runs on your machine',
			'The docs browser listens on 127.0.0.1 and needs a token.',
		],
	];
</script>

<div class="band">
	<section
		id="use"
		aria-labelledby="use-title"
		class="mx-auto grid max-w-7xl gap-12 px-4 py-28 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)]"
	>
		<div class="grid content-start gap-4">
			<h2 id="use-title" class="use-title">Use it</h2>
			<p class="text-lg text-muted-foreground">
				Ask your coding agent. It runs wiki0 for you, reads the cited
				section and tells you where it came from.
			</p>
		</div>

		<Tabs.Root value="agent" class="min-w-0">
			<Tabs.List>
				<Tabs.Trigger value="agent">Ask your agent</Tabs.Trigger>
				<Tabs.Trigger value="cli">CLI</Tabs.Trigger>
				<Tabs.Trigger value="mcp">MCP</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="agent" class="mt-4">
				<ul class="grid gap-2">
					{#each prompts as prompt (prompt)}
						<li
							class="flex items-start gap-2 rounded-lg border bg-card py-2 pr-2 pl-4"
						>
							<p class="flex-1 py-1">{prompt}</p>
							<CopyButton text={prompt} label="Copy prompt" />
						</li>
					{/each}
				</ul>
			</Tabs.Content>
			<Tabs.Content value="cli" class="mt-4">
				<ul
					class="grid gap-1 rounded-xl border bg-card p-2 font-mono text-[0.8rem]"
				>
					{#each commands as [command, note] (command)}
						<li
							class="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted"
						>
							<span class="min-w-0 flex-1">
								<span class="block break-all">{command}</span>
								<span class="block text-xs text-muted-foreground"
									>{note}</span
								>
							</span>
							<CopyButton text={command} label="Copy command" />
						</li>
					{/each}
				</ul>
			</Tabs.Content>
			<Tabs.Content value="mcp" class="mt-4 grid gap-3">
				<p class="text-muted-foreground">
					For MCP clients, add <code class="font-mono text-[0.9em]"
						>@wiki0/mcp</code
					>. The agent gets search, show, lint, index and the link
					graph as tools.
				</p>
				<div
					class="relative rounded-xl border bg-card p-4 font-mono text-[0.8rem]"
				>
					<pre class="overflow-x-auto">{mcp_config}</pre>
					<div class="absolute top-2 right-2">
						<CopyButton text={mcp_config} label="Copy MCP config" />
					</div>
				</div>
			</Tabs.Content>
		</Tabs.Root>
	</section>
</div>

<section aria-label="How wiki0 works" class="border-y bg-card">
	<dl
		class="mx-auto grid max-w-7xl gap-x-8 gap-y-6 px-4 py-14 sm:grid-cols-2 sm:px-8 lg:grid-cols-4"
	>
		{#each principles as [title, detail] (title)}
			<div>
				<dt class="font-semibold">{title}</dt>
				<dd class="mt-1 text-muted-foreground">{detail}</dd>
			</div>
		{/each}
	</dl>
</section>

<style>
	.use-title {
		font-size: clamp(2.2rem, 5vw, 4.4rem);
		font-stretch: 122%;
		font-weight: 760;
		line-height: 0.98;
		letter-spacing: -0.035em;
	}
</style>
