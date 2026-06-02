import { existsSync } from 'node:fs';
import { dirname, join, normalize, resolve } from 'node:path';

export function slugify_title(title: string): string {
	return title
		.trim()
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/gu, '')
		.replace(/[^a-z0-9]+/gu, '-')
		.replace(/^-+|-+$/gu, '');
}

export function normalize_wiki_dir(wiki_dir = 'wiki'): string {
	const normalized = normalize(wiki_dir).replace(/^\/+|\/+$/gu, '');
	if (
		normalized.length === 0 ||
		normalized === '.' ||
		normalized.startsWith('..')
	) {
		throw new Error('wiki_dir must be a relative folder name.');
	}
	return normalized;
}

export function resolve_wiki_root(
	start_path = '.',
	wiki_dir = 'wiki',
): string {
	let current_path = resolve(start_path);
	const content_dir = normalize_wiki_dir(wiki_dir);

	while (true) {
		if (
			existsSync(join(current_path, '.wiki0')) ||
			existsSync(join(current_path, content_dir))
		) {
			return current_path;
		}

		const parent_path = dirname(current_path);
		if (parent_path === current_path) {
			return resolve(start_path);
		}
		current_path = parent_path;
	}
}

export function wiki_content_dir(
	root = '.',
	wiki_dir = 'wiki',
): string {
	return join(
		resolve_wiki_root(root, wiki_dir),
		normalize_wiki_dir(wiki_dir),
	);
}

export function page_relative_path(title: string): string {
	const path_parts = title
		.split('/')
		.map((part) => slugify_title(part))
		.filter((part) => part.length > 0);

	if (path_parts.length === 0) {
		throw new Error(
			'Page title must include at least one slug character',
		);
	}

	return `${path_parts.join('/')}.md`;
}

export function page_file_path(
	title: string,
	root = '.',
	wiki_dir = 'wiki',
): string {
	return join(
		wiki_content_dir(root, wiki_dir),
		page_relative_path(title),
	);
}

export function wikilink_target_path(target: string): string {
	const clean_target = target.split('#')[0]?.trim() ?? '';
	return page_relative_path(clean_target);
}

export function display_page_title(title: string): string {
	return title.split('/').filter(Boolean).at(-1)?.trim() ?? title;
}
