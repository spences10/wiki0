import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
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
	const file_path = page_file_path(title, options.root);
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

	return read_page(title, options.root);
}

export function read_page(title: string, root = '.'): WikiPage {
	const page_path = resolve_page_path(title, root);
	return read_page_by_path(page_path, root);
}

export function set_page_frontmatter(
	title: string,
	frontmatter: Parameters<typeof serialize_frontmatter>[0],
	options: PageFrontmatterOptions = {},
): WikiPage {
	const page_path = resolve_page_path(title, options.root);
	const file_path = join(
		resolve_wiki_root(options.root),
		'wiki',
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
	return read_page_by_path(page_path, options.root);
}

export function append_page(
	title: string,
	body: string,
	root = '.',
): WikiPage {
	const page_path = resolve_page_path(title, root);
	const file_path = join(resolve_wiki_root(root), 'wiki', page_path);
	const append_body = body.startsWith('\n') ? body : `\n${body}`;
	writeFileSync(
		file_path,
		append_body.endsWith('\n') ? append_body : `${append_body}\n`,
		{
			flag: 'a',
		},
	);
	return read_page_by_path(page_path, root);
}

export function resolve_page_path(title: string, root = '.'): string {
	const wiki_root = resolve_wiki_root(root);
	const direct_path = page_relative_path(title);
	if (existsSync(join(wiki_root, 'wiki', direct_path))) {
		return direct_path;
	}

	const normalized_title = title.trim().toLowerCase();
	for (const page_path of list_markdown_page_paths(wiki_root)) {
		const page = read_page_by_path(page_path, wiki_root);
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

export function list_markdown_page_paths(root = '.'): string[] {
	const wiki_root = resolve_wiki_root(root);
	const wiki_dir = join(wiki_root, 'wiki');
	if (!existsSync(wiki_dir)) return [];

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
			page_paths.push(relative(wiki_dir, entry_path));
		}
	};

	visit_dir(wiki_dir);
	return page_paths.sort();
}

export function read_page_by_path(
	page_path: string,
	root = '.',
): WikiPage {
	const wiki_root = resolve_wiki_root(root);
	const file_path = join(wiki_root, 'wiki', page_path);
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
