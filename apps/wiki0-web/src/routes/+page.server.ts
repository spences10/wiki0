import {
	backlinks_for_page,
	graph_wiki,
	index_status,
	index_wiki,
	lint_wiki,
	search,
	show,
	type BacklinkResult,
} from '@wiki0/core';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { PageServerLoad } from './$types';

function default_wiki_root() {
	let current = process.cwd();
	for (let i = 0; i < 5; i += 1) {
		if (existsSync(join(current, 'wiki'))) return current;
		current = dirname(current);
	}
	return process.cwd();
}

export const load: PageServerLoad = async ({ url }) => {
	const root = resolve(
		url.searchParams.get('root') ??
			process.env.WIKI0_ROOT ??
			default_wiki_root(),
	);
	const status = index_status(root);
	const indexed = status.stale ? await index_wiki(root) : null;
	const graph = graph_wiki(root);
	const review = lint_wiki(root).issues.filter(
		(issue) => issue.severity !== 'info',
	);
	const query = url.searchParams.get('q')?.trim() ?? '';
	const search_results = query
		? search(query, root, { limit: 8 }).results
		: [];
	const selected_path =
		url.searchParams.get('page') ?? graph.nodes[0]?.path ?? null;
	let selected_page: {
		title: string;
		path: string;
		content: string;
	} | null = null;
	let backlinks: BacklinkResult[] = [];
	if (selected_path) {
		const section = show(selected_path, root, { token_budget: 8000 });
		if (section) {
			selected_page = {
				title: section.title,
				path: section.path,
				content: section.markdown,
			};
			backlinks = backlinks_for_page(selected_path, root);
		}
	}

	return {
		root,
		status: status.stale ? index_status(root) : status,
		indexed,
		graph,
		review,
		query,
		search: search_results,
		selected_path,
		selected_page,
		backlinks,
	};
};
