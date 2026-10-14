<script lang="ts">
	import { ApiError, api, is_not_indexed } from '#lib/api.js';
	import { app } from '#lib/app-state.svelte.js';
	import CopyButton from '#lib/components/copy-button.svelte';
	import DocOutline from '#lib/components/doc-outline.svelte';
	import NotIndexed from '#lib/components/not-indexed.svelte';
	import StatusBadges from '#lib/components/status-badges.svelte';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import * as Breadcrumb from '#lib/components/ui/breadcrumb/index.js';
	import * as Empty from '#lib/components/ui/empty/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { home_document } from '#lib/doc-tree.js';
	import { handle_copy_click } from '#lib/markdown/code-block.js';
	import { render_document } from '#lib/markdown/render.js';
	import { encode_doc_path, parse_line_range } from '#lib/router.js';
	import { router } from '#lib/router.svelte.js';
	import type {
		BacklinkResult,
		DocumentContent,
		DocumentLink,
	} from '@wiki0/core';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import FileQuestionIcon from '@lucide/svelte/icons/file-question';
	import HistoryIcon from '@lucide/svelte/icons/history';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import { tick } from 'svelte';

	type Loaded = {
		path: string;
		document: DocumentContent;
		links: DocumentLink[];
		backlinks: BacklinkResult[];
		highlight: typeof import('#lib/markdown/highlighter.js').highlight_code;
	};

	let {
		path,
		fragment,
		highlight,
	}: {
		path: string | null;
		fragment: string | null;
		highlight: [number, number] | null;
	} = $props();

	// The highlighter carries every grammar, so it loads once, on the
	// first document, in its own chunk.
	let highlighter: Promise<
		typeof import('#lib/markdown/highlighter.js')
	> | null = null;
	function load_highlighter() {
		highlighter ??= import('#lib/markdown/highlighter.js');
		return highlighter;
	}

	const target = $derived(
		path ?? home_document(app.documents)?.path ?? null,
	);

	let loaded = $state.raw<Loaded | null>(null);
	let error = $state<unknown>(null);
	let loading = $state(false);
	let article = $state<HTMLElement>();
	let asset_urls: string[] = [];

	$effect(() => {
		const current = target;
		void app.version;
		if (!current) return;
		let cancelled = false;
		loading = true;
		Promise.all([
			api.doc(current),
			api.links(current),
			api.backlinks(current),
			load_highlighter(),
		])
			.then(([document, links, backlinks, module]) => {
				if (cancelled) return;
				loaded = {
					path: current,
					document,
					links,
					backlinks,
					highlight: module.highlight_code,
				};
				error = null;
			})
			.catch((caught: unknown) => {
				if (cancelled) return;
				loaded = null;
				error = caught;
			})
			.finally(() => {
				if (!cancelled) loading = false;
			});
		return () => {
			cancelled = true;
		};
	});

	const summary = $derived(
		app.documents.find((document) => document.path === loaded?.path),
	);

	const rendered = $derived.by(() => {
		if (!loaded || !app.meta) return null;
		return render_document(
			{
				path: loaded.path,
				markdown: loaded.document.markdown,
				body_start_line: loaded.document.body_start_line,
			},
			{
				links: loaded.links,
				headings: summary?.headings ?? [],
				documents: app.paths,
				wikilink_pattern_source: app.meta.wikilink_pattern_source,
				highlight: loaded.highlight,
			},
		);
	});

	// Links to this document, one row per linking document.
	const linked_from = $derived.by(() => {
		const by_path = new Map<
			string,
			{ path: string; title: string; lines: number[] }
		>();
		for (const backlink of loaded?.backlinks ?? []) {
			const entry = by_path.get(backlink.path) ?? {
				path: backlink.path,
				title: backlink.title,
				lines: [],
			};
			entry.lines.push(backlink.line);
			by_path.set(backlink.path, entry);
		}
		return [...by_path.values()];
	});

	const segments = $derived(loaded?.path.split('/') ?? []);
	const is_markdown = $derived(loaded?.document.kind === 'markdown');

	// Loads embedded images with the token, since <img src> can't
	// send the Authorization header.
	async function load_assets(
		container: HTMLElement,
		doc_path: string,
	) {
		for (const url of asset_urls.splice(0)) URL.revokeObjectURL(url);
		for (const image of container.querySelectorAll<HTMLImageElement>(
			'img[data-wiki0-asset]',
		)) {
			const asset = image.dataset.wiki0Asset;
			if (!asset) continue;
			try {
				const url = URL.createObjectURL(
					await api.asset(doc_path, asset),
				);
				asset_urls.push(url);
				image.src = url;
			} catch {
				image.alt = `${image.alt} (image not available)`;
			}
		}
	}

	function block_for_line(container: HTMLElement, line: number) {
		let found: HTMLElement | null = null;
		for (const block of container.querySelectorAll<HTMLElement>(
			':scope > [data-line]',
		)) {
			if (Number(block.dataset.line) <= line) found = block;
			else break;
		}
		return found;
	}

	// Marks the blocks a search hit or line link covers, then scrolls
	// to the heading or line the fragment names.
	async function place(
		container: HTMLElement,
		fragment_value: string | null,
		range: [number, number] | null,
	) {
		await tick();
		for (const block of container.querySelectorAll(
			'[data-highlighted]',
		)) {
			block.removeAttribute('data-highlighted');
		}
		const line_range = range ?? parse_line_range(fragment_value);
		if (line_range) {
			for (const block of container.querySelectorAll<HTMLElement>(
				':scope > [data-line]',
			)) {
				const start = Number(block.dataset.line);
				const end = Number(block.dataset.endLine ?? start);
				if (end >= line_range[0] && start <= line_range[1]) {
					block.setAttribute('data-highlighted', '');
				}
			}
		}
		const by_id = fragment_value
			? container.ownerDocument.getElementById(fragment_value)
			: null;
		const scroll_to =
			by_id ??
			(line_range ? block_for_line(container, line_range[0]) : null);
		scroll_to?.scrollIntoView({ block: 'start' });
	}

	$effect(() => {
		if (!article || !rendered || !loaded) return;
		void load_assets(article, loaded.path);
		void place(article, fragment, highlight);
	});

	$effect(() => () => {
		for (const url of asset_urls) URL.revokeObjectURL(url);
	});

	function doc_href(doc_path: string, anchor = '') {
		return `/docs/${encode_doc_path(doc_path)}${anchor}`;
	}
</script>

{#if app.not_indexed}
	<NotIndexed />
{:else if !target && !app.loading}
	<Empty.Root class="min-h-[60vh]">
		<Empty.Header>
			<Empty.Media variant="icon"><FileQuestionIcon /></Empty.Media>
			<Empty.Title>No docs found</Empty.Title>
			<Empty.Description>
				The index has no documents. Check the include patterns in
				<code class="font-mono">wiki0.toml</code>, then reindex.
			</Empty.Description>
		</Empty.Header>
	</Empty.Root>
{:else if is_not_indexed(error)}
	<NotIndexed />
{:else if error instanceof ApiError && error.status === 404}
	<Empty.Root class="min-h-[60vh]">
		<Empty.Header>
			<Empty.Media variant="icon"><FileQuestionIcon /></Empty.Media>
			<Empty.Title>Not an indexed document</Empty.Title>
			<Empty.Description>
				<code class="font-mono">{target}</code> isn't in the index. It may
				be excluded, or new since the last index.
			</Empty.Description>
		</Empty.Header>
	</Empty.Root>
{:else if error}
	<Alert.Root variant="destructive" class="m-6 max-w-2xl">
		<TriangleAlertIcon />
		<Alert.Title>Couldn't load this document</Alert.Title>
		<Alert.Description>{String(error)}</Alert.Description>
	</Alert.Root>
{:else if !loaded || !rendered}
	<div class="mx-auto max-w-3xl space-y-4 p-8">
		<Skeleton class="h-4 w-48" />
		<Skeleton class="h-10 w-3/4" />
		<Skeleton class="h-4 w-full" />
		<Skeleton class="h-4 w-5/6" />
		<Skeleton class="h-4 w-2/3" />
	</div>
{:else}
	<div
		class="grid gap-10 px-6 py-8 lg:px-10 xl:grid-cols-[minmax(0,1fr)_16rem]"
		class:opacity-60={loading}
	>
		<div class="min-w-0">
			<header class="mx-auto mb-8 max-w-[46rem] space-y-3">
				<Breadcrumb.Root>
					<Breadcrumb.List>
						{#each segments as segment, index (index)}
							{#if index > 0}<Breadcrumb.Separator />{/if}
							<Breadcrumb.Item>
								{#if index === segments.length - 1}
									<Breadcrumb.Page class="font-mono text-xs">
										{segment}
									</Breadcrumb.Page>
								{:else}
									<span class="font-mono text-xs">{segment}</span>
								{/if}
							</Breadcrumb.Item>
						{/each}
					</Breadcrumb.List>
				</Breadcrumb.Root>
				<div class="flex flex-wrap items-center gap-2">
					<StatusBadges
						status={loaded.document.status}
						doc_type={loaded.document.doc_type}
						date={loaded.document.date}
						superseded={loaded.document.superseded_by !== null}
					/>
					<CopyButton
						text={loaded.path}
						label="Copy path"
						class="ml-auto"
					/>
				</div>
				{#if loaded.document.superseded_by}
					<Alert.Root class="border-warning/40 bg-warning/5">
						<HistoryIcon class="text-warning!" />
						<Alert.Title>Superseded</Alert.Title>
						<Alert.Description>
							<p>
								Read
								<a
									href={doc_href(loaded.document.superseded_by)}
									class="font-medium text-accent underline underline-offset-3"
								>
									{app.title_for(loaded.document.superseded_by)}
								</a>
								instead.
							</p>
						</Alert.Description>
					</Alert.Root>
				{/if}
				{#each loaded.document.warnings as warning (warning)}
					<Alert.Root>
						<TriangleAlertIcon />
						<Alert.Description>{warning}</Alert.Description>
					</Alert.Root>
				{/each}
			</header>

			<!-- Rendered from core's link records; clicks on copy buttons
			     are delegated because the CSP allows no inline handlers -->
			<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
			<article
				bind:this={article}
				class={[
					'prose mx-auto',
					is_markdown ? '' : 'whitespace-pre-wrap',
				]}
				onclick={(event) => void handle_copy_click(event)}
			>
				{@html rendered.html}
			</article>
		</div>

		<aside class="hidden xl:block">
			<div
				class="sticky top-20 max-h-[calc(100svh-6rem)] space-y-8 overflow-y-auto pb-8"
			>
				{#if summary && summary.headings.length > 1}
					<DocOutline
						headings={summary.headings}
						container={article}
					/>
				{/if}

				{#if summary && summary.supersedes.length > 0}
					<section class="space-y-2">
						<h2
							class="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
						>
							Replaces
						</h2>
						<ul class="space-y-1 text-sm">
							{#each summary.supersedes as old (old)}
								<li>
									<a
										href={doc_href(old)}
										class="text-muted-foreground line-through hover:text-foreground"
									>
										{app.title_for(old)}
									</a>
								</li>
							{/each}
						</ul>
					</section>
				{/if}

				<section class="space-y-2">
					<h2
						class="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
					>
						Linked from
						<span class="tabular-nums">({linked_from.length})</span>
					</h2>
					{#if linked_from.length === 0}
						<p class="text-sm text-muted-foreground">
							No other document links here.
						</p>
					{:else}
						<ul class="space-y-2 text-sm">
							{#each linked_from as source (source.path)}
								<li>
									<a
										href={doc_href(
											source.path,
											`#L${source.lines[0]}`,
										)}
										class="group flex items-start gap-1.5 hover:text-accent"
									>
										<ArrowRightIcon
											class="mt-1 size-3 shrink-0 rotate-180 text-muted-foreground group-hover:text-accent"
										/>
										<span class="min-w-0">
											<span class="block truncate"
												>{source.title}</span
											>
											<span
												class="block truncate font-mono text-xs text-muted-foreground"
											>
												{source.path}:{source.lines.join(', ')}
											</span>
										</span>
									</a>
								</li>
							{/each}
						</ul>
					{/if}
				</section>
			</div>
		</aside>
	</div>
{/if}
