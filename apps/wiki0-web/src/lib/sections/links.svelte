<script lang="ts">
	import ChartBox from '#lib/components/chart-box.svelte';
	import Section from '#lib/components/section.svelte';
	import Terminal from '#lib/components/terminal.svelte';
	import { Reveal } from '#lib/motion/reveal.svelte.js';
	import LinkGraph from '#lib/scenes/link-graph.svelte';
	import type {
		GraphEdge,
		GraphNode,
		LintIssue,
	} from '#lib/story.js';

	let {
		graph,
		lint,
		counts,
		current,
		superseded,
	}: {
		graph: { nodes: GraphNode[]; edges: GraphEdge[] };
		lint: { files: Record<string, string>; issues: LintIssue[] };
		counts: { documents: number; links: number; broken: number };
		current: string;
		superseded: string;
	} = $props();

	const graph_reveal = new Reveal();
	const lint_reveal = new Reveal();
	const runbook = $derived(lint.files['runbook.md'] ?? '');
	const broken = $derived(
		new Set(lint.issues.map((issue) => issue.line)),
	);
	const fix = (issue: LintIssue) =>
		issue.suggestions?.length
			? `did you mean #${issue.suggestions[0]}?`
			: issue.rule === 'missing-file'
				? 'no such file'
				: '';
</script>

<Section
	id="links"
	title="Links resolve, and lint finds the broken ones"
	band
>
	{#snippet copy()}
		<p>
			wiki0 resolves Markdown links and <code
				class="font-mono text-[0.9em]">[[wikilinks]]</code
			>, down to the heading. That's how the replaced decision points
			to the one that replaced it, and why docs that others link to
			rank a little higher.
		</p>
	{/snippet}

	<figure class="graph-scene" {@attach graph_reveal.attach}>
		<div class="graph">
			<ChartBox
				ratio="16 / 8"
				min_height="20rem"
				label="This repo's link graph: {counts.documents} documents and {counts.links} links, with the link from the replaced decision to the current one highlighted"
			>
				<LinkGraph
					nodes={graph.nodes}
					edges={graph.edges}
					{current}
					{superseded}
					seen={graph_reveal.seen}
				/>
			</ChartBox>
		</div>
		<figcaption class="facts">
			<p><span class="big">{counts.documents}</span> documents</p>
			<p><span class="big">{counts.links}</span> links</p>
			<p>
				<span class="big">{counts.broken}</span> broken
			</p>
			<p class="text-sm">
				This repo's docs, drawn outward from the current decision.
			</p>
		</figcaption>
	</figure>

	<div
		class="lint"
		data-seen={lint_reveal.seen}
		{@attach lint_reveal.attach}
	>
		<p class="lint-copy">
			<code class="font-mono text-[0.9em]">wiki0 lint</code> reports
			every link that points nowhere with its file and line, and
			suggests the heading you probably meant.
			{counts.broken === 0
				? "This repo's docs have no broken links, so here it is on a two-file example."
				: 'Here it is on a two-file example.'}
		</p>
		<Terminal title="wiki0 lint">
			<pre
				class="whitespace-pre-wrap text-muted-foreground">{#each runbook.split('\n') as text, index (index)}<span
						class={[broken.has(index + 1) && 'broken']}>{text}</span
					>{'\n'}{/each}</pre>
			<ul class="mt-2 grid gap-1">
				{#each lint.issues as issue (issue.line)}
					<li>
						<span class="text-destructive">{issue.rule}</span>
						{issue.path}:{issue.line}
						<span class="text-muted-foreground">{fix(issue)}</span>
					</li>
				{/each}
			</ul>
		</Terminal>
	</div>
</Section>

<style>
	.graph-scene {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 2rem;
	}

	@media (min-width: 64rem) {
		.graph-scene {
			grid-template-columns: minmax(0, 1fr) 13rem;
			align-items: center;
		}
	}

	.facts {
		display: grid;
		gap: 0.75rem;
		color: var(--muted-foreground);
	}

	.facts p {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		font-size: 1.1rem;
	}

	.big {
		font-size: clamp(2.8rem, 5vw, 4.5rem);
		font-stretch: 125%;
		font-weight: 800;
		line-height: 1;
		letter-spacing: -0.04em;
		color: var(--foreground);
	}

	.lint {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1.5rem;
		align-items: center;
	}

	@media (min-width: 64rem) {
		.lint {
			grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
		}
	}

	.lint-copy {
		font-size: clamp(1.05rem, 1.4vw, 1.25rem);
		color: var(--muted-foreground);
	}

	.lint {
		transition:
			opacity 0.6s ease-out,
			transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.lint[data-seen='false'] {
		opacity: 0;
		transform: translateY(2rem);
	}

	.broken {
		color: var(--foreground);
		text-decoration: underline wavy var(--destructive);
		text-underline-offset: 4px;
	}
</style>
