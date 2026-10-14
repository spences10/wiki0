<script lang="ts">
	import Seo from '#lib/components/seo.svelte';
	import Answer from '#lib/sections/answer.svelte';
	import Cite from '#lib/sections/cite.svelte';
	import Hero from '#lib/sections/hero.svelte';
	import IndexSection from '#lib/sections/index-section.svelte';
	import Links from '#lib/sections/links.svelte';
	import Rerank from '#lib/sections/rerank.svelte';
	import UiSection from '#lib/sections/ui-section.svelte';
	import UseIt from '#lib/sections/use-it.svelte';
	import { home_schema, home_seo } from '#lib/seo.js';
	import { site } from '#lib/site.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const { repo } = site;
</script>

<Seo page={home_seo} schema={home_schema()} />

<a
	href="#main"
	class="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
>
	Skip to content
</a>

<Hero
	citation={data.show.citation}
	tokens={data.current_chunks[0]?.tokens ?? data.show.tokens}
	code={data.code.hero}
	{repo}
/>

<main id="main">
	<Answer answer={data.answer} />
	<IndexSection
		current={data.current}
		chunks={data.current_chunks}
		skyline={data.skyline}
		counts={data.counts}
	/>
	<Rerank
		rows={data.rank}
		query={data.query}
		citation={data.show.citation}
	/>
	<Cite current={data.current} show={data.show} />
	<Links
		graph={data.graph}
		lint={data.lint}
		counts={data.counts}
		current={data.current.path}
		superseded={data.superseded.path}
	/>
	<UiSection />
	<UseIt
		cli={{ html: data.code.cli, text: data.code.cli_text }}
		mcp={{ html: data.code.mcp, text: data.code.mcp_text }}
	/>
</main>

<footer
	class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-10 text-sm text-muted-foreground sm:px-8"
>
	<p>wiki0 is MIT licensed.</p>
	<ul class="flex gap-4">
		<li><a class="hover:text-foreground" href={repo}>GitHub</a></li>
		<li>
			<a
				class="hover:text-foreground"
				href="https://www.npmjs.com/package/@wiki0/cli">npm</a
			>
		</li>
	</ul>
</footer>
