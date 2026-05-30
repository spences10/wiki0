import { open_wiki_database } from './database.js';
import { resolve_wiki_root, wikilink_target_path } from './paths.js';
import type { GraphEdge, GraphNode, GraphResult } from './types.js';

export function graph_wiki(root = '.'): GraphResult {
	const wiki_root = resolve_wiki_root(root);
	const db = open_wiki_database(wiki_root);
	const nodes = db
		.prepare('SELECT path, title FROM pages ORDER BY path')
		.all() as GraphNode[];
	const edges = db
		.prepare(
			`SELECT pages.path AS "from",
				COALESCE(page_links.to_path, page_links.target) AS "to",
				page_links.target,
				page_links.raw_text AS rawText,
				page_links.alias,
				page_links.embed,
				page_links.status
			FROM page_links
			JOIN pages ON pages.id = page_links.from_page_id
			ORDER BY pages.path, page_links.target`,
		)
		.all() as unknown as GraphEdge[];
	db.close();

	return {
		root: wiki_root,
		nodes,
		edges: edges.map((edge) => ({
			...edge,
			to:
				edge.status === 'resolved'
					? edge.to
					: wikilink_target_path(edge.target),
			embed: Boolean(edge.embed),
		})),
	};
}
