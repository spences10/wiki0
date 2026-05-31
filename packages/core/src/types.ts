export type WikiConfig = {
	root: string;
	wiki_dir?: string;
	db_path?: string;
};

export type WikiLink = {
	raw: string;
	target: string;
	alias?: string;
	embed: boolean;
};

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
	db_path: string;
	page_count: number;
	link_count: number;
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
};

export type SearchResult = {
	path: string;
	title: string;
	snippet: string;
	rank: number;
};

export type ChunkSearchResult = SearchResult & {
	chunk_id: number;
	heading: string | null;
	body: string;
	start_line: number;
	end_line: number;
	page_priority?: number;
	page_status?: string | null;
	page_tags?: string[];
};

export type ShowChunkResult = ChunkSearchResult;

export type ContextResult = {
	query: string;
	results: ChunkSearchResult[];
	warnings: string[];
	markdown: string;
};

export type BacklinkResult = {
	path: string;
	title: string;
	raw_text: string;
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
	raw_text: string;
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
	page_path: string | null;
	category: string;
	summary: string;
	body: string | null;
	confidence: FactConfidence;
	source_path: string | null;
	source_heading: string | null;
	source_start_line: number | null;
	source_end_line: number | null;
	source_quote: string | null;
	created_at: string;
};

export type FactWriteOptions = {
	root?: string;
	page?: string;
	category: string;
	summary: string;
	body?: string;
	confidence?: FactConfidence;
	source?: string;
	source_quote?: string;
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
	issue_count: number;
	issues: LintIssue[];
};

export type WikiSourceType =
	| 'general'
	| 'codebase'
	| 'docs'
	| 'research'
	| 'notes';

export type WikiPlanOptions = {
	source_type?: WikiSourceType;
	scope?: string;
	sources?: string[];
};

export type WikiPlanPage = {
	title: string;
	path: string;
	purpose: string;
	tags: string[];
};

export type WikiPlanResult = {
	source_type: WikiSourceType;
	scope: string;
	workflow: string;
	pages: WikiPlanPage[];
	next_steps: string[];
};

export type WikiDocumentSyncOptions = {
	root?: string;
	sources: string[];
	overwrite?: boolean;
	index?: boolean;
	include?: string[];
	ignore?: string[];
	derive_facts?: boolean;
	propose_pages?: boolean;
};

export type WikiDocumentSync = {
	source: string;
	page: string;
	kind: 'markdown' | 'text' | 'pdf' | 'docx' | 'unsupported';
	status: 'created' | 'updated' | 'unchanged' | 'changed' | 'warning';
	warnings: string[];
};

export type WikiDocumentSyncResult = {
	root: string;
	sources: string[];
	created: string[];
	skipped: string[];
	proposed_pages: string[];
	derived_facts: Fact[];
	synced_sources: WikiDocumentSync[];
	indexed: IndexResult | null;
};

export type WikiEvent = {
	id: number;
	operation: string;
	summary: string;
	target: string | null;
	details: string | null;
	created_at: string;
};

export type TopicThreadResult = {
	topic: string;
	reference_count: number;
	page_count: number;
	paths: string[];
	summary: string;
};
