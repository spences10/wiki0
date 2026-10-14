// The shapes each scene draws, built from captured wiki0 output when
// the page is prerendered (src/routes/+page.server.ts).

export type StoryDocument = {
	path: string;
	title: string;
	source: string;
	status: string | null;
	superseded_by: string | null;
};

export type StoryChunk = {
	start_line: number;
	end_line: number;
	citation: string;
	heading: string | null;
	tokens: number;
};

export type RankRow = {
	citation: string;
	title: string;
	heading: string | null;
	status: string | null;
	superseded_by: string | null;
	text: number;
	score: number;
	parts: Record<string, number>;
	text_rank: number;
	final_rank: number;
};

export type GraphNode = {
	id: string;
	title: string;
	folder: string;
	x: number;
	y: number;
	degree: number;
	orphan: boolean;
};

export type GraphEdge = { from: string; to: string };

export type Tower = {
	path: string;
	position: number;
	tokens: number;
	citation: string;
	heading: string | null;
};

export type Skyline = {
	towers: Tower[];
	paths: string[];
	positions: number[];
	max: number;
};

export type LintIssue = {
	rule: string;
	severity: string;
	path: string;
	line: number | null;
	message: string;
	suggestions?: string[];
};

/** A file's lines, numbered from 1. */
export const lines_of = (source: string) =>
	source.replace(/\n$/u, '').split('\n');

export const file_name = (path: string) =>
	path.split('/').at(-1) ?? path;
