<script lang="ts">
	import CopyButton from '#lib/components/copy-button.svelte';
	import * as Tabs from '#lib/components/ui/tabs/index.js';

	let {
		cli,
		mcp,
	}: {
		cli: { html: string; text: string };
		mcp: { html: string; text: string };
	} = $props();

	const prompts = [
		'Use pnpx @wiki0/cli to find where we decided how deploys work.',
		'Use pnpx @wiki0/cli and show me the docs.',
		'Use pnpx @wiki0/cli lint and fix the broken links in our docs.',
	];
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
	const tabs = [
		['agent', 'Ask your agent'],
		['cli', 'CLI'],
		['mcp', 'MCP'],
	];
	let tab = $state('agent');
</script>

{#snippet code_block(
	block: { html: string; text: string },
	label: string,
)}
	<div class="code">
		<div class="copy">
			<CopyButton text={block.text} {label} />
		</div>
		<!-- Highlighted at build time -->
		{@html block.html}
	</div>
{/snippet}

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

		<Tabs.Root bind:value={tab} class="min-w-0">
			<Tabs.List class="h-auto rounded-full border bg-card p-1">
				{#each tabs as [value, name] (value)}
					<Tabs.Trigger
						{value}
						class="rounded-full px-4 py-1.5 text-muted-foreground transition-colors hover:text-foreground data-active:bg-white data-active:text-[#2e1065] data-active:shadow-sm data-active:hover:text-[#2e1065] dark:data-active:bg-white dark:data-active:text-[#2e1065]"
						>{name}</Tabs.Trigger
					>
				{/each}
			</Tabs.List>
			<div class="panels">
				<Tabs.Content value="agent">
					{#snippet child({ props })}
						{@const { hidden, ...rest } = props}
						<div {...rest} class="panel" inert={Boolean(hidden)}>
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
						</div>
					{/snippet}
				</Tabs.Content>
				<Tabs.Content value="cli">
					{#snippet child({ props })}
						{@const { hidden, ...rest } = props}
						<div {...rest} class="panel" inert={Boolean(hidden)}>
							{@render code_block(cli, 'Copy commands')}
						</div>
					{/snippet}
				</Tabs.Content>
				<Tabs.Content value="mcp">
					{#snippet child({ props })}
						{@const { hidden, ...rest } = props}
						<div
							{...rest}
							class="panel grid gap-3"
							inert={Boolean(hidden)}
						>
							<p class="text-muted-foreground">
								For MCP clients, add <code
									class="font-mono text-[0.9em]">@wiki0/mcp</code
								>. The agent gets search, show, lint, index and the
								link graph as tools.
							</p>
							{@render code_block(mcp, 'Copy MCP config')}
						</div>
					{/snippet}
				</Tabs.Content>
			</div>
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

	/* Every panel shares one cell, so the box is always as tall as the
	   tallest and switching tabs only crossfades */
	.panels {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		margin-top: 1rem;
	}

	.panel {
		grid-area: 1 / 1;
		min-width: 0;
		transition:
			opacity 0.35s ease,
			transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1),
			visibility 0s linear 0s;
	}

	.panel[data-state='inactive'] {
		opacity: 0;
		transform: translateY(0.5rem);
		visibility: hidden;
		transition:
			opacity 0.2s ease,
			transform 0.2s ease,
			visibility 0s linear 0.2s;
	}

	.code {
		position: relative;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: var(--radius-xl);
		background: #1c0a3d;
		color: #ede9fe;
	}

	.copy {
		position: absolute;
		top: 0.4rem;
		right: 0.4rem;
	}

	.code :global(.twinkleplop) {
		margin: 0;
		padding: 1rem 3rem 1rem 0;
		background: transparent;
		color: inherit;
		font-size: 0.82rem;
		line-height: 1.7;
		overflow-x: auto;
	}

	.code :global(.l) {
		padding-inline: 1.1rem;
	}

	.code :global(:is(.comment)) {
		color: #8b7db5;
		font-style: normal;
	}

	.code :global(:is(.string)) {
		color: #fde68a;
	}

	.code :global(:is(.property)) {
		color: #c4b5fd;
	}

	.code :global(:is(.function, .command)) {
		color: #93c5fd;
	}

	.code :global(:is(.punctuation, .operator)) {
		color: #a99bcf;
	}

	@media (prefers-reduced-motion: reduce) {
		.panel,
		.panel[data-state='inactive'] {
			transition: none;
		}
	}
</style>
