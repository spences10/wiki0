<svelte:head>
	<title>wiki0: cited search over your project's docs</title>
	<meta
		name="description"
		content="wiki0 searches the docs already in a repo and returns the right section with a path:start-end citation, so coding agents read a section instead of whole documents."
	/>
</svelte:head>

<main
	class="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 px-4"
>
	<h1 class="text-4xl">wiki0</h1>
	<p class="text-muted-foreground">
		Search a project's docs and get the right section with a
		<code class="font-mono text-sm">path:start-end</code> citation, so agents
		don't read whole documents.
	</p>
	<pre class="font-mono text-sm"><code
			>npx @wiki0/cli search "how do deploys work"</code
		></pre>
</main>
