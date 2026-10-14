import type { SQLOutputValue } from 'node:sqlite';
import {
	open_index_or_throw,
	resolve_project_root,
} from './storage.js';
import type { GraphEdge, GraphNode, GraphResult } from './types.js';

export function graph_wiki(root = '.'): GraphResult {
	const project_root = resolve_project_root(root);
	const db = open_index_or_throw(project_root);
	try {
		const edges = (
			db
				.prepare(
					`SELECT from_path, to_path, to_anchor, target, raw_text, alias,
						kind, line, status
					FROM links
					ORDER BY from_path, line, target`,
				)
				.all() as Record<string, SQLOutputValue>[]
		).map(edge_from_row);
		const linked = new Set(
			edges
				.filter(
					(edge) =>
						edge.status === 'resolved' && edge.from !== edge.to,
				)
				.map((edge) => edge.to),
		);
		const nodes = (
			db
				.prepare(
					'SELECT path, title, status, doc_type FROM pages ORDER BY path',
				)
				.all() as Omit<GraphNode, 'orphan'>[]
		).map((node) => ({ ...node, orphan: !linked.has(node.path) }));
		return { root: project_root, nodes, edges };
	} finally {
		db.close();
	}
}

function edge_from_row(
	row: Record<string, SQLOutputValue>,
): GraphEdge {
	const link_status = String(row.status);
	return {
		from: String(row.from_path),
		to:
			row.to_path === null ? String(row.target) : String(row.to_path),
		to_anchor: row.to_anchor === null ? null : String(row.to_anchor),
		target: String(row.target),
		raw_text: String(row.raw_text),
		alias: row.alias === null ? null : String(row.alias),
		embed: row.kind === 'embed',
		kind: String(row.kind),
		line: Number(row.line),
		status: link_status === 'resolved' ? 'resolved' : 'unresolved',
		link_status,
	};
}
