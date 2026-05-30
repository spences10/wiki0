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
