import {
	list_markdown_page_paths,
	read_page_by_path,
} from './pages.js';
import { resolve_wiki_root, wikilink_target_path } from './paths.js';
import type { LintIssue, LintResult } from './types.js';

export function lint_wiki(root = '.'): LintResult {
	const wiki_root = resolve_wiki_root(root);
	const page_paths = list_markdown_page_paths(wiki_root);
	const known_paths = new Set(page_paths);
	const issues: LintIssue[] = [];
	const names = new Map<string, string>();
	const pages = page_paths.map((page_path) =>
		read_page_by_path(page_path, wiki_root),
	);

	for (const page of pages) {
		const aliases = page.frontmatter.aliases;
		const alias_list = Array.isArray(aliases)
			? aliases
			: typeof aliases === 'string'
				? [aliases]
				: [];

		for (const name of [page.title, ...alias_list]) {
			const normalized_name = name.trim().toLowerCase();
			if (!normalized_name) continue;
			const existing_path = names.get(normalized_name);
			if (existing_path && existing_path !== page.path) {
				issues.push({
					code: 'duplicate-name',
					severity: 'warning',
					path: page.path,
					target: name,
					message: `Duplicate title or alias "${name}" also used by wiki/${existing_path}`,
				});
				continue;
			}
			names.set(normalized_name, page.path);
		}
	}

	for (const page of pages) {
		for (const link of page.links) {
			const target_path = wikilink_target_path(link.target);
			const target_name =
				link.target.split('#')[0]?.trim().toLowerCase() ?? '';
			if (known_paths.has(target_path) || names.has(target_name)) {
				continue;
			}
			issues.push({
				code: 'unresolved-wikilink',
				severity: 'error',
				path: page.path,
				target: link.target,
				message: `Unresolved wikilink ${link.raw}`,
			});
		}
	}

	return {
		root: wiki_root,
		ok: issues.every((issue) => issue.severity !== 'error'),
		issueCount: issues.length,
		issues: issues.sort((left, right) =>
			`${left.path}:${left.code}:${left.target ?? ''}`.localeCompare(
				`${right.path}:${right.code}:${right.target ?? ''}`,
			),
		),
	};
}
