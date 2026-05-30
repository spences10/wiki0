export type WikiConfig = {
	root: string;
	wikiDir?: string;
	dbPath?: string;
};

export type WikiLink = {
	raw: string;
	target: string;
	alias?: string;
	embed: boolean;
};

export type FrontmatterValue = string | number | boolean | string[];

export type WikiFrontmatter = Record<string, FrontmatterValue>;

export type ParsedMarkdown = {
	frontmatter: WikiFrontmatter;
	content: string;
};

export type WikiPage = {
	path: string;
	title: string;
	body: string;
	content: string;
	frontmatter: WikiFrontmatter;
	links: WikiLink[];
};

export type PageWriteOptions = {
	root?: string;
	overwrite?: boolean;
};

export type PageFrontmatterOptions = {
	root?: string;
	merge?: boolean;
};

export type IndexResult = {
	root: string;
	dbPath: string;
	pageCount: number;
	linkCount: number;
};

export type SearchResult = {
	path: string;
	title: string;
	snippet: string;
	rank: number;
};

export type ContextResult = {
	query: string;
	results: SearchResult[];
	markdown: string;
};

export type BacklinkResult = {
	path: string;
	title: string;
	rawText: string;
	alias: string | null;
	embed: boolean;
};

export type GraphNode = {
	path: string;
	title: string;
};

export type GraphEdge = {
	from: string;
	to: string;
	target: string;
	rawText: string;
	alias: string | null;
	embed: boolean;
	status: 'resolved' | 'unresolved';
};

export type GraphResult = {
	root: string;
	nodes: GraphNode[];
	edges: GraphEdge[];
};

export type FactConfidence =
	| 'unknown'
	| 'low'
	| 'medium'
	| 'high'
	| 'verified';

export type Fact = {
	id: number;
	pagePath: string | null;
	category: string;
	summary: string;
	body: string | null;
	confidence: FactConfidence;
	createdAt: string;
};

export type FactWriteOptions = {
	root?: string;
	page?: string;
	category: string;
	summary: string;
	body?: string;
	confidence?: FactConfidence;
};

export type ReviewResult = {
	path: string;
	title: string;
	status: string | null;
	tags: string[];
	reason: string;
};

export type LintIssue = {
	code: string;
	severity: 'error' | 'warning';
	path: string;
	message: string;
	target?: string;
};

export type LintResult = {
	root: string;
	ok: boolean;
	issueCount: number;
	issues: LintIssue[];
};
