import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { log_wiki_event } from './events.js';
import {
	page_title_from_markdown,
	parse_markdown,
	parse_wikilinks,
	serialize_frontmatter,
} from './markdown.js';
import {
	display_page_title,
	page_file_path,
	page_relative_path,
	resolve_wiki_root,
	wiki_content_dir,
} from './paths.js';
import type {
	PageFrontmatterOptions,
	PageWriteOptions,
	WikiPage,
} from './types.js';

export function create_page(
	title: string,
	body: string,
	options: PageWriteOptions = {},
): WikiPage {
	const file_path = page_file_path(
		title,
		options.root,
		options.wiki_dir,
	);
	const page_body = body.match(/^#\s+/mu)
		? body
		: `# ${display_page_title(title)}\n\n${body}`;

	mkdirSync(dirname(file_path), { recursive: true });
	writeFileSync(
		file_path,
		page_body.endsWith('\n') ? page_body : `${page_body}\n`,
		{
			flag: options.overwrite ? 'w' : 'wx',
		},
	);

	const page = read_page(title, options.root, options.wiki_dir);
	log_wiki_event({
		root: options.root,
		operation: options.overwrite ? 'overwrite_page' : 'create_page',
		summary: `Wrote wiki page ${page.path}`,
		target: page.path,
	});
	return page;
}

export function read_page(
	title: string,
	root = '.',
	wiki_dir = 'wiki',
): WikiPage {
	const page_path = resolve_page_path(title, root, wiki_dir);
	return read_page_by_path(page_path, root, wiki_dir);
}

export function set_page_frontmatter(
	title: string,
	frontmatter: Parameters<typeof serialize_frontmatter>[0],
	options: PageFrontmatterOptions = {},
): WikiPage {
	const page_path = resolve_page_path(
		title,
		options.root,
		options.wiki_dir,
	);
	const file_path = join(
		wiki_content_dir(options.root, options.wiki_dir),
		page_path,
	);
	const body = readFileSync(file_path, 'utf-8');
	const parsed_markdown = parse_markdown(body);
	const next_frontmatter = options.merge
		? { ...parsed_markdown.frontmatter, ...frontmatter }
		: frontmatter;
	const next_body = `${serialize_frontmatter(next_frontmatter)}${parsed_markdown.content}`;
	writeFileSync(
		file_path,
		next_body.endsWith('\n') ? next_body : `${next_body}\n`,
	);
	const page = read_page_by_path(
		page_path,
		options.root,
		options.wiki_dir,
	);
	log_wiki_event({
		root: options.root,
		operation: 'set_page_frontmatter',
		summary: `Updated frontmatter for ${page.path}`,
		target: page.path,
	});
	return page;
}

export function append_page(
	title: string,
	body: string,
	root = '.',
	wiki_dir = 'wiki',
): WikiPage {
	const page_path = resolve_page_path(title, root, wiki_dir);
	const file_path = join(wiki_content_dir(root, wiki_dir), page_path);
	const append_body = body.startsWith('\n') ? body : `\n${body}`;
	writeFileSync(
		file_path,
		append_body.endsWith('\n') ? append_body : `${append_body}\n`,
		{
			flag: 'a',
		},
	);
	const page = read_page_by_path(page_path, root, wiki_dir);
	log_wiki_event({
		root,
		operation: 'append_page',
		summary: `Appended wiki page ${page.path}`,
		target: page.path,
	});
	return page;
}

export function resolve_page_path(
	title: string,
	root = '.',
	wiki_dir = 'wiki',
): string {
	const wiki_root = resolve_wiki_root(root, wiki_dir);
	const content_dir = wiki_content_dir(wiki_root, wiki_dir);
	const direct_path = page_relative_path(title);
	if (existsSync(join(content_dir, direct_path))) {
		return direct_path;
	}

	const normalized_title = title.trim().toLowerCase();
	for (const page_path of list_markdown_page_paths(
		wiki_root,
		wiki_dir,
	)) {
		const page = read_page_by_path(page_path, wiki_root, wiki_dir);
		const aliases = page.frontmatter.aliases;
		const alias_list = Array.isArray(aliases)
			? aliases.filter((alias) => typeof alias === 'string')
			: typeof aliases === 'string'
				? [aliases]
				: [];
		const candidates = [page.title, ...alias_list].map((candidate) =>
			candidate.toLowerCase(),
		);
		if (candidates.includes(normalized_title)) return page_path;
	}

	return direct_path;
}

export function list_markdown_page_paths(
	root = '.',
	wiki_dir = 'wiki',
): string[] {
	const wiki_root = resolve_wiki_root(root, wiki_dir);
	const content_dir = wiki_content_dir(wiki_root, wiki_dir);
	if (!existsSync(content_dir)) return [];

	const page_paths: string[] = [];
	const visit_dir = (dir_path: string) => {
		for (const entry of readdirSync(dir_path, {
			withFileTypes: true,
		})) {
			const entry_path = join(dir_path, entry.name);
			if (entry.isDirectory()) {
				visit_dir(entry_path);
				continue;
			}
			if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
			page_paths.push(relative(content_dir, entry_path));
		}
	};

	visit_dir(content_dir);
	return page_paths.sort();
}

export function read_page_by_path(
	page_path: string,
	root = '.',
	wiki_dir = 'wiki',
): WikiPage {
	const wiki_root = resolve_wiki_root(root, wiki_dir);
	const file_path = join(
		wiki_content_dir(wiki_root, wiki_dir),
		page_path,
	);
	const body = readFileSync(file_path, 'utf-8');
	const title_fallback = display_page_title(
		page_path.replace(/\.md$/u, ''),
	);
	const parsed_markdown = parse_markdown(body);

	return {
		path: page_path,
		title: page_title_from_markdown(body, title_fallback),
		body,
		content: parsed_markdown.content,
		frontmatter: parsed_markdown.frontmatter,
		links: parse_wikilinks(body),
	};
}
