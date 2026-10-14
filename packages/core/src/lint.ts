import type { SQLOutputValue } from 'node:sqlite';
import {
	open_index_or_throw,
	resolve_project_root,
} from './storage.js';
import type { LintIssue, LintResult, LintSeverity } from './types.js';

type LinkRow = {
	from_path: string;
	line: number;
	kind: string;
	raw_text: string;
	target: string;
	to_path: string | null;
	status: string;
	quality: string | null;
	candidates: string[];
};

// Lints the indexed docs. Run `index_wiki` first; the index is the
// source for links, anchors and names.
export function lint_wiki(root = '.'): LintResult {
	const project_root = resolve_project_root(root);
	const db = open_index_or_throw(project_root);
	let links: LinkRow[];
	let pages: { path: string; title: string; aliases: string[] }[];
	try {
		links = (
			db
				.prepare(
					`SELECT from_path, line, kind, raw_text, target, to_path,
						status, quality, candidates
					FROM links ORDER BY from_path, line`,
				)
				.all() as Record<string, SQLOutputValue>[]
		).map((row) => ({
			from_path: String(row.from_path),
			line: Number(row.line),
			kind: String(row.kind),
			raw_text: String(row.raw_text),
			target: String(row.target),
			to_path: row.to_path === null ? null : String(row.to_path),
			status: String(row.status),
			quality: row.quality === null ? null : String(row.quality),
			candidates: JSON.parse(String(row.candidates)) as string[],
		}));
		pages = (
			db.prepare('SELECT path, title, aliases FROM pages').all() as {
				path: string;
				title: string;
				aliases: string;
			}[]
		).map((row) => ({
			...row,
			aliases: JSON.parse(row.aliases) as string[],
		}));
	} finally {
		db.close();
	}

	const issues = [
		...links.flatMap(link_issues),
		...duplicate_name_issues(pages),
		...orphan_issues(pages, links),
	];
	const counts: Record<LintSeverity, number> = {
		error: 0,
		warning: 0,
		info: 0,
	};
	for (const issue of issues) counts[issue.severity] += 1;

	return {
		root: project_root,
		ok: counts.error === 0,
		issue_count: issues.length,
		counts,
		issues: issues.sort(
			(a, b) =>
				a.path.localeCompare(b.path) ||
				(a.line ?? 0) - (b.line ?? 0) ||
				a.rule.localeCompare(b.rule),
		),
	};
}

function link_issues(link: LinkRow): LintIssue[] {
	const base = {
		path: link.from_path,
		line: link.line,
		target: link.target,
	};
	switch (link.status) {
		case 'missing-file':
			return [
				{
					...base,
					rule:
						link.kind === 'embed'
							? 'embed-target-missing'
							: 'missing-file',
					severity: 'error',
					message: `${link.raw_text} points to a file that does not exist`,
				},
			];
		case 'missing-heading':
			return [
				{
					...base,
					rule: 'missing-heading',
					severity: 'error',
					message: `${link.raw_text}: ${link.to_path} has no matching heading`,
					suggestions: link.candidates,
				},
			];
		case 'missing-block-id':
			return [
				{
					...base,
					rule: 'missing-block-id',
					severity: 'error',
					message: `${link.raw_text}: ${link.to_path} has no matching ^block-id`,
				},
			];
		case 'line-out-of-range':
			return [
				{
					...base,
					rule: 'line-out-of-range',
					severity: 'error',
					message: `${link.raw_text}: line is past the end of ${link.to_path}`,
				},
			];
		case 'outside-root':
			return [
				{
					...base,
					rule: 'link-outside-root',
					severity: 'error',
					message: `${link.raw_text} points outside the project`,
				},
			];
		case 'ambiguous':
			return [
				{
					...base,
					rule: 'ambiguous-wikilink',
					severity: 'warning',
					message: `${link.raw_text} matches ${link.candidates.length} documents; using ${link.to_path}`,
					suggestions: link.candidates,
				},
			];
		case 'undefined-reference':
			return [
				{
					...base,
					rule: 'undefined-reference',
					severity: 'warning',
					message: `${link.raw_text} uses a reference with no definition`,
				},
			];
	}
	if (link.quality === 'case-insensitive') {
		return [
			{
				...base,
				rule: 'case-mismatch',
				severity: 'warning',
				message: `${link.raw_text} only matches ${link.to_path} when case is ignored; it breaks on case-sensitive systems`,
			},
		];
	}
	if (link.quality === 'text' && link.kind !== 'wikilink') {
		return [
			{
				...base,
				rule: 'fragment-non-canonical',
				severity: 'info',
				message: `${link.raw_text} matches a heading by text, not by its GitHub anchor`,
			},
		];
	}
	return [];
}

function duplicate_name_issues(
	pages: { path: string; title: string; aliases: string[] }[],
): LintIssue[] {
	const seen = new Map<string, string>();
	const issues: LintIssue[] = [];
	for (const page of pages) {
		for (const name of [page.title, ...page.aliases]) {
			const key = name.trim().toLowerCase();
			const existing = seen.get(key);
			if (!key) continue;
			if (existing && existing !== page.path) {
				issues.push({
					rule: 'duplicate-name',
					severity: 'info',
					path: page.path,
					line: null,
					target: name,
					message: `Title or alias "${name}" is also used by ${existing}`,
				});
			} else {
				seen.set(key, page.path);
			}
		}
	}
	return issues;
}

function orphan_issues(
	pages: { path: string }[],
	links: LinkRow[],
): LintIssue[] {
	const linked = new Set(
		links
			.filter(
				(link) => link.to_path && link.to_path !== link.from_path,
			)
			.map((link) => link.to_path),
	);
	return pages
		.filter((page) => !linked.has(page.path))
		.map((page) => ({
			rule: 'orphan-page',
			severity: 'info' as const,
			path: page.path,
			line: null,
			message: 'No other document links here',
		}));
}
