<script lang="ts">
	import { api, is_not_indexed } from '#lib/api.js';
	import { app } from '#lib/app-state.svelte.js';
	import LintRuleChart from '#lib/charts/lint-rule-chart.svelte';
	import NotIndexed from '#lib/components/not-indexed.svelte';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import * as Select from '#lib/components/ui/select/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import { encode_doc_path } from '#lib/router.js';
	import type { LintResult, LintSeverity } from '@wiki0/core';

	let result = $state.raw<LintResult | null>(null);
	let error = $state<unknown>(null);
	let rule = $state('all');
	let severity = $state<'all' | LintSeverity>('all');
	let path_filter = $state('');

	$effect(() => {
		void app.version;
		let cancelled = false;
		api
			.lint()
			.then((lint) => {
				if (!cancelled) {
					result = lint;
					error = null;
				}
			})
			.catch((caught: unknown) => {
				if (!cancelled) error = caught;
			});
		return () => {
			cancelled = true;
		};
	});

	const rules = $derived(
		[
			...new Set(result?.issues.map((issue) => issue.rule) ?? []),
		].sort(),
	);
	const shown = $derived(
		(result?.issues ?? []).filter(
			(issue) =>
				(rule === 'all' || issue.rule === rule) &&
				(severity === 'all' || issue.severity === severity) &&
				issue.path
					.toLowerCase()
					.includes(path_filter.trim().toLowerCase()),
		),
	);
	const severity_variant = {
		error: 'destructive',
		warning: 'outline',
		info: 'secondary',
	} as const;

	function issue_href(path: string, line: number | null) {
		return `/docs/${encode_doc_path(path)}${line ? `?lines=${line}-${line}#L${line}` : ''}`;
	}
</script>

<div class="space-y-6">
	{#if app.not_indexed || is_not_indexed(error)}
		<NotIndexed />
	{:else if error}
		<Alert.Root variant="destructive">
			<Alert.Title>Lint failed</Alert.Title>
			<Alert.Description>{String(error)}</Alert.Description>
		</Alert.Root>
	{:else if !result}
		<Skeleton class="h-64" />
	{:else}
		<div class="grid gap-4 sm:grid-cols-3">
			{#each [{ key: 'error', label: 'Errors', note: 'fail wiki0 lint', class: 'text-destructive' }, { key: 'warning', label: 'Warnings', note: 'likely to break', class: 'text-warning' }, { key: 'info', label: 'Info', note: 'never fail lint', class: 'text-muted-foreground' }] as const as tile (tile.key)}
				<Card.Root class="gap-1 py-4">
					<Card.Header class="px-5">
						<Card.Description>{tile.label}</Card.Description>
						<Card.Title class={['text-2xl tabular-nums', tile.class]}>
							{result.counts[tile.key]}
						</Card.Title>
					</Card.Header>
					<Card.Content class="px-5 text-xs text-muted-foreground">
						{tile.note}
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

		{#if result.issues.length > 0}
			<Card.Root>
				<Card.Header>
					<Card.Title>Findings by rule</Card.Title>
				</Card.Header>
				<Card.Content
					><LintRuleChart issues={result.issues} /></Card.Content
				>
			</Card.Root>
		{/if}

		<Card.Root>
			<Card.Header>
				<Card.Title>Findings</Card.Title>
				<Card.Description>
					{shown.length} of {result.issue_count}
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="flex flex-wrap gap-2">
					<Select.Root type="single" bind:value={rule}>
						<Select.Trigger class="w-56">
							{rule === 'all' ? 'All rules' : rule}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all">All rules</Select.Item>
							{#each rules as name (name)}
								<Select.Item value={name}>{name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<Select.Root type="single" bind:value={severity}>
						<Select.Trigger class="w-40">
							{severity === 'all' ? 'All severities' : severity}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all">All severities</Select.Item>
							<Select.Item value="error">error</Select.Item>
							<Select.Item value="warning">warning</Select.Item>
							<Select.Item value="info">info</Select.Item>
						</Select.Content>
					</Select.Root>
					<Input
						bind:value={path_filter}
						placeholder="Filter by path"
						class="w-56"
						aria-label="Filter by path"
					/>
				</div>
				{#if shown.length === 0}
					<p class="py-8 text-center text-muted-foreground">
						{result.issue_count === 0
							? 'No findings. Every link resolves.'
							: 'No findings match.'}
					</p>
				{:else}
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head class="w-24">Severity</Table.Head>
								<Table.Head>Rule</Table.Head>
								<Table.Head>Where</Table.Head>
								<Table.Head>Message</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each shown as issue, index (index)}
								<Table.Row>
									<Table.Cell>
										<Badge variant={severity_variant[issue.severity]}>
											{issue.severity}
										</Badge>
									</Table.Cell>
									<Table.Cell class="font-mono text-xs"
										>{issue.rule}</Table.Cell
									>
									<Table.Cell class="font-mono text-xs">
										<a
											href={issue_href(issue.path, issue.line)}
											class="hover:text-accent"
										>
											{issue.path}{issue.line ? `:${issue.line}` : ''}
										</a>
									</Table.Cell>
									<Table.Cell class="text-sm whitespace-normal">
										{issue.message}
										{#if issue.suggestions?.length}
											<span class="text-muted-foreground">
												Did you mean
												{#each issue.suggestions as suggestion, suggestion_index (suggestion)}
													{suggestion_index > 0 ? ', ' : ''}<code
														class="font-mono text-xs"
														>{suggestion}</code
													>
												{/each}?
											</span>
										{/if}
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}
</div>
