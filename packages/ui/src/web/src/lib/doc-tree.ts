import type { DocumentSummary } from '@wiki0/core';

export type TreeFolder = {
	kind: 'folder';
	name: string;
	path: string;
	children: TreeNode[];
	// Documents anywhere below, for filtering and counts.
	count: number;
};

export type TreeDocument = {
	kind: 'document';
	name: string;
	path: string;
	document: DocumentSummary;
};

export type TreeNode = TreeFolder | TreeDocument;

function sort_nodes(nodes: TreeNode[]): TreeNode[] {
	return nodes.sort((a, b) => {
		if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
		return a.name.localeCompare(b.name, undefined, { numeric: true });
	});
}

function matches(document: DocumentSummary, filter: string): boolean {
	if (!filter) return true;
	const needle = filter.toLowerCase();
	return [document.path, document.title, ...document.aliases].some(
		(value) => value.toLowerCase().includes(needle),
	);
}

/**
 * Folders and documents by path, folders first. A filter keeps the
 * documents whose path, title or alias contains it, and the folders
 * that still hold one.
 */
export function build_tree(
	documents: DocumentSummary[],
	filter = '',
): TreeNode[] {
	const root: TreeFolder = {
		kind: 'folder',
		name: '',
		path: '',
		children: [],
		count: 0,
	};
	for (const document of documents) {
		if (!matches(document, filter.trim())) continue;
		const parts = document.path.split('/');
		let folder = root;
		folder.count += 1;
		for (const [index, part] of parts.slice(0, -1).entries()) {
			const path = parts.slice(0, index + 1).join('/');
			let next = folder.children.find(
				(child): child is TreeFolder =>
					child.kind === 'folder' && child.name === part,
			);
			if (!next) {
				next = { kind: 'folder', name: part, path, children: [], count: 0 };
				folder.children.push(next);
			}
			next.count += 1;
			folder = next;
		}
		folder.children.push({
			kind: 'document',
			name: parts.at(-1) ?? document.path,
			path: document.path,
			document,
		});
	}
	const sort_deep = (nodes: TreeNode[]): TreeNode[] =>
		sort_nodes(nodes).map((node) =>
			node.kind === 'folder'
				? { ...node, children: sort_deep(node.children) }
				: node,
		);
	return sort_deep(root.children);
}

// The folders holding a path, so the tree can open them.
export function ancestor_folders(path: string): string[] {
	const parts = path.split('/').slice(0, -1);
	return parts.map((_, index) => parts.slice(0, index + 1).join('/'));
}

const home_names = ['readme.md', 'index.md'];

/**
 * The document to open at `/`: a README or index nearest the root,
 * otherwise the first document by path.
 */
export function home_document(
	documents: DocumentSummary[],
): DocumentSummary | null {
	const by_depth = [...documents].sort(
		(a, b) =>
			a.path.split('/').length - b.path.split('/').length ||
			a.path.localeCompare(b.path),
	);
	return (
		by_depth.find((document) =>
			home_names.includes(
				document.path.split('/').at(-1)?.toLowerCase() ?? '',
			),
		) ??
		by_depth[0] ??
		null
	);
}
