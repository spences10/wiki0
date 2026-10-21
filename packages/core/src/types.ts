export type FrontmatterValue =
	| string
	| number
	| boolean
	| null
	| FrontmatterValue[]
	| { [key: string]: FrontmatterValue };

export type WikiFrontmatter = Record<string, FrontmatterValue>;

export type ParsedMarkdown = {
	frontmatter: WikiFrontmatter;
	content: string;
};

export type IndexResult = {
	root: string;
	db_path: string;
	page_count: number;
	chunk_count: number;
	link_count: number;
	warnings: string[];
	indexed_at: string;
	schema_version: number;
	package_version: string;
};

export type IndexStatus = {
	root: string;
	db_path: string;
	exists: boolean;
	indexed_at: string | null;
	schema_version: number | null;
	current_schema_version: number;
	package_version: string | null;
	current_package_version: string;
	page_count: number;
	indexed_page_count: number;
	stale: boolean;
	reasons: string[];
	changes: { new: string[]; modified: string[]; deleted: string[] };
	warnings: string[];
};

export type SearchRelaxation =
	| 'all-terms'
	| 'without-stopwords'
	| 'dropped-terms'
	| 'any-term';

export type ScoreParts = {
	text: number;
	status: number;
	type: number;
	inlinks: number;
	recency: number;
	priority: number;
};

export type SearchHit = {
	path: string;
	start_line: number;
	end_line: number;
	citation: string;
	anchor: string | null;
	breadcrumb: string[];
	title: string;
	heading: string | null;
	status: string | null;
	// Set for a tentative status, e.g. "idea, not decided".
	status_note: string | null;
	doc_type: string | null;
	date: string | null;
	snippet: string;
	match_ranges: [number, number][];
	score: number;
	score_parts: ScoreParts;
	superseded_by: string | null;
	// A newer doc that replaces part of this one.
	amended_by: string | null;
	more_in_doc: number;
};

export type SearchOptions = {
	limit?: number;
	include_superseded?: boolean;
};

export type SearchResponse = {
	query: string;
	relaxation: SearchRelaxation | null;
	results: SearchHit[];
	warnings: string[];
};

export type ShowOptions = {
	token_budget?: number;
	neighbours?: number;
};

export type ShowResult = {
	path: string;
	start_line: number;
	end_line: number;
	citation: string;
	title: string;
	breadcrumb: string[];
	markdown: string;
	tokens: number;
	truncated: boolean;
	next: string | null;
	status: string | null;
	// Set for a tentative status, e.g. "idea, not decided".
	status_note: string | null;
	superseded_by: string | null;
	warnings: string[];
};

export type ContextResult = {
	query: string;
	relaxation: SearchRelaxation | null;
	results: SearchHit[];
	warnings: string[];
	markdown: string;
};

export type BacklinkResult = {
	path: string;
	title: string;
	line: number;
	kind: string;
	raw_text: string;
	alias: string | null;
	embed: boolean;
};

export type GraphNode = {
	path: string;
	title: string;
	status: string | null;
	doc_type: string | null;
	orphan: boolean;
};

export type GraphEdge = {
	from: string;
	to: string;
	target: string;
	raw_text: string;
	alias: string | null;
	embed: boolean;
	status: 'resolved' | 'unresolved';
	link_status: string;
	kind: string;
	line: number;
	to_anchor: string | null;
};

export type GraphResult = {
	root: string;
	nodes: GraphNode[];
	edges: GraphEdge[];
};

export type LintSeverity = 'error' | 'warning' | 'info';

export type LintIssue = {
	rule: string;
	severity: LintSeverity;
	path: string;
	line: number | null;
	message: string;
	target?: string;
	suggestions?: string[];
};

export type LintResult = {
	root: string;
	ok: boolean;
	issue_count: number;
	counts: Record<LintSeverity, number>;
	issues: LintIssue[];
};

export type DocumentHeading = {
	slug: string;
	text: string;
	depth: number;
	line: number;
};

export type DocumentSummary = {
	path: string;
	title: string;
	kind: string;
	status: string | null;
	doc_type: string | null;
	date: string | null;
	aliases: string[];
	supersedes: string[];
	superseded_by: string | null;
	amends: string[];
	line_count: number;
	headings: DocumentHeading[];
	in_link_count: number;
	out_link_count: number;
};

export type ChunkSummary = {
	start_line: number;
	end_line: number;
	citation: string;
	heading: string | null;
	depth: number;
	breadcrumb: string[];
	tokens: number;
};

export type DocumentContent = {
	path: string;
	title: string;
	kind: string;
	// Full current file text, frontmatter included.
	source: string;
	// Text after the frontmatter, and its first line number in the file.
	markdown: string;
	body_start_line: number;
	frontmatter: WikiFrontmatter;
	status: string | null;
	doc_type: string | null;
	date: string | null;
	superseded_by: string | null;
	warnings: string[];
};

export type DocumentLink = {
	line: number;
	kind: string;
	raw_text: string;
	target: string;
	alias: string | null;
	embed: boolean;
	to: string | null;
	to_anchor: string | null;
	link_status: string;
	rule: string | null;
	message: string | null;
	suggestions: string[];
};
