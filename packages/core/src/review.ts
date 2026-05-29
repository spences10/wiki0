import {
	list_markdown_page_paths,
	read_page_by_path,
} from './pages.js';
import type { ReviewResult } from './types.js';

export function review_wiki(root = '.'): ReviewResult[] {
	const review_statuses = new Set([
		'draft',
		'proposed',
		'review',
		'stale',
		'unverified',
	]);
	const review_tags = new Set([
		'review',
		'needs-review',
		'unverified',
		'stale',
	]);
	const results: ReviewResult[] = [];

	for (const page_path of list_markdown_page_paths(root)) {
		const page = read_page_by_path(page_path, root);
		const status = page.frontmatter.status;
		const tags = page.frontmatter.tags;
		const status_text = typeof status === 'string' ? status : null;
		const tag_list = Array.isArray(tags) ? tags : [];
		const matching_tag = tag_list.find((tag) => review_tags.has(tag));

		if (status_text && review_statuses.has(status_text)) {
			results.push({
				path: page.path,
				title: page.title,
				status: status_text,
				tags: tag_list,
				reason: `status:${status_text}`,
			});
			continue;
		}

		if (matching_tag) {
			results.push({
				path: page.path,
				title: page.title,
				status: status_text,
				tags: tag_list,
				reason: `tag:${matching_tag}`,
			});
		}
	}

	return results.sort((left, right) =>
		left.path.localeCompare(right.path),
	);
}
