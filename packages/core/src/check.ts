import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { read_config } from './config.js';
import { index_wiki } from './indexer.js';
import { lint_wiki } from './lint.js';
import {
	open_index_or_throw,
	resolve_project_root,
} from './storage.js';
import type {
	CheckOptions,
	CheckResult,
	LintIssue,
	LintSeverity,
} from './types.js';

type PageRow = { path: string; doc_type: string | null };
type ChunkRow = {
	path: string;
	heading: string | null;
	start_line: number;
	end_line: number;
	body: string;
};
type LinkRow = { from_path: string; line: number; to_path: string };
type Change = { added: number; deleted: number; new_file: boolean };

// Sections shorter than this are never compared; short sections such
// as "## Install" match each other without repeating anything.
const min_overlap_chars = 200;
const min_overlap_shingles = 20;
// Share of the smaller section's 3-word phrases found in the other.
const overlap_threshold = 0.6;
// Additions below this many lines are too small to flag.
const min_growth_lines = 10;
// git's empty tree, for a repo with no commits yet.
const empty_tree = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';

// Checks docs after an agent edits them. Re-indexes, then reports
// problems in the changed files only (or `paths`, or `all`), so an
// existing repo's old issues don't bury the new ones.
export async function check_docs(
	root = '.',
	options: CheckOptions = {},
): Promise<CheckResult> {
	const project_root = resolve_project_root(root);
	await index_wiki(project_root);
	const disabled = new Set(read_config(project_root).check_disable);

	const db = open_index_or_throw(project_root);
	let pages: PageRow[];
	let chunks: ChunkRow[];
	let links: LinkRow[];
	try {
		pages = db
			.prepare('SELECT path, doc_type FROM pages ORDER BY path')
			.all() as PageRow[];
		chunks = db
			.prepare(
				'SELECT path, heading, start_line, end_line, body FROM page_chunks ORDER BY path, start_line',
			)
			.all() as ChunkRow[];
		links = db
			.prepare(
				'SELECT from_path, line, to_path FROM links WHERE to_path IS NOT NULL',
			)
			.all() as LinkRow[];
	} finally {
		db.close();
	}

	const indexed = new Set(pages.map((page) => page.path));
	const warnings: string[] = [];
	const changes = options.all
		? null
		: changed_files(project_root, options.base ?? 'HEAD');
	let files: string[];
	if (options.paths && options.paths.length > 0) {
		files = [];
		for (const path of options.paths) {
			if (indexed.has(path)) files.push(path);
			else warnings.push(`${path} is not an indexed document`);
		}
	} else if (options.all) {
		files = [...indexed];
	} else if (changes === null) {
		warnings.push(
			'Not a git repository; checked every document. Pass paths to check fewer.',
		);
		files = [...indexed];
	} else {
		files = [...changes.keys()].filter((path) => indexed.has(path));
	}
	const scope = new Set(files);

	const issues = [
		...lint_wiki(project_root).issues.filter((issue) =>
			scope.has(issue.path),
		),
		...id_issues(project_root, files, pages, links),
		...overlap_issues(chunks, scope),
		...growth_issues(changes, files),
	].filter((issue) => !disabled.has(issue.rule));

	const counts: Record<LintSeverity, number> = {
		error: 0,
		warning: 0,
		info: 0,
	};
	for (const issue of issues) counts[issue.severity] += 1;
	return {
		root: project_root,
		ok: counts.error === 0,
		files: files.sort(),
		issue_count: issues.length,
		counts,
		issues: issues.sort(
			(a, b) =>
				a.path.localeCompare(b.path) ||
				(a.line ?? 0) - (b.line ?? 0) ||
				a.rule.localeCompare(b.rule),
		),
		warnings,
	};
}

// Changed files relative to `root`, with line counts. Untracked files
// count as new. Null when `root` is not in a git work tree.
function changed_files(
	root: string,
	base: string,
): Map<string, Change> | null {
	const git = (args: string[]): string =>
		execFileSync('git', args, {
			cwd: root,
			encoding: 'utf-8',
			maxBuffer: 64 * 1024 * 1024,
			stdio: ['ignore', 'pipe', 'ignore'],
		});
	try {
		git(['rev-parse', '--is-inside-work-tree']);
	} catch {
		return null;
	}
	let from = base;
	try {
		git(['rev-parse', '--verify', `${base}^{commit}`]);
	} catch {
		if (base !== 'HEAD') {
			throw new Error(`Unknown git revision: ${base}`);
		}
		from = empty_tree;
	}

	const added_files = new Set(
		git([
			'diff',
			'--name-only',
			'-z',
			'--no-renames',
			'--relative',
			'--diff-filter=A',
			from,
		])
			.split('\0')
			.filter(Boolean),
	);
	const changes = new Map<string, Change>();
	const records = git([
		'diff',
		'--numstat',
		'-z',
		'--no-renames',
		'--relative',
		from,
	])
		.split('\0')
		.filter(Boolean);
	for (const record of records) {
		const [added = '0', deleted = '0', path] = record.split('\t');
		if (!path) continue;
		changes.set(path, {
			added: Number(added) || 0,
			deleted: Number(deleted) || 0,
			new_file: added_files.has(path),
		});
	}
	const untracked = git([
		'ls-files',
		'-z',
		'--others',
		'--exclude-standard',
	])
		.split('\0')
		.filter(Boolean);
	for (const path of untracked) {
		const file = join(root, path);
		const added = existsSync(file)
			? readFileSync(file, 'utf-8').split('\n').length
			: 0;
		changes.set(path, { added, deleted: 0, new_file: true });
	}
	return changes;
}

// IDs follow the repo's own numbered file names, such as
// `decisions/0004-name.md` or `ADR-012-name.md`. A mention like
// "Decision 0004" or "ADR-012" that matches no file is an error; one
// that matches a file but is not linked is a warning. Repos without
// numbered files get no ID checks.
function id_issues(
	root: string,
	files: string[],
	pages: PageRow[],
	links: LinkRow[],
): LintIssue[] {
	const schemes = id_schemes(pages);
	if (schemes.length === 0) return [];
	const linked = new Set(
		links.map(
			(link) => `${link.from_path}:${link.line}:${link.to_path}`,
		),
	);
	const issues: LintIssue[] = [];
	for (const path of files) {
		const file = join(root, path);
		if (!existsSync(file)) continue;
		for (const [line, text] of prose_lines(
			readFileSync(file, 'utf-8'),
		)) {
			// A prefix and a folder name can both match "ADR-012".
			const seen = new Set<number>();
			for (const scheme of schemes) {
				for (const match of text.matchAll(scheme.pattern)) {
					if (seen.has(match.index)) continue;
					seen.add(match.index);
					const id = Number(match[1]);
					const target = scheme.ids.get(id);
					const mention = match[0].trim();
					if (!target) {
						issues.push({
							rule: 'unresolved-id',
							severity: 'error',
							path,
							line,
							target: mention,
							message: `"${mention}" matches no document; link the one it means or remove it`,
						});
					} else if (
						target !== path &&
						!linked.has(`${path}:${line}:${target}`)
					) {
						issues.push({
							rule: 'unlinked-id',
							severity: 'warning',
							path,
							line,
							target: mention,
							message: `"${mention}" is not linked; link it to ${target}`,
							suggestions: [target],
						});
					}
				}
			}
		}
	}
	return issues;
}

type IdScheme = { pattern: RegExp; ids: Map<number, string> };

function id_schemes(pages: PageRow[]): IdScheme[] {
	const by_label = new Map<
		string,
		{ case_sensitive: boolean; ids: Map<number, string> }
	>();
	const add = (
		label: string,
		case_sensitive: boolean,
		id: number,
		path: string,
	): void => {
		const key = case_sensitive ? label : label.toLowerCase();
		const scheme = by_label.get(key) ?? {
			case_sensitive,
			ids: new Map<number, string>(),
		};
		scheme.ids.set(id, path);
		by_label.set(key, scheme);
	};
	for (const page of pages) {
		const match = basename(page.path).match(
			/^(?:([A-Za-z]+)-)?(\d{2,})[-_.]/u,
		);
		if (!match) continue;
		const id = Number(match[2]);
		// A prefix such as ADR or D is matched exactly: "ADR-012".
		if (match[1]) add(match[1], true, id, page.path);
		// Folder and type names are matched as words: "Decision 0004".
		const folder = basename(dirname(page.path)).replace(/s$/u, '');
		for (const word of [folder, page.doc_type ?? '']) {
			if (word.length >= 3 && /^[a-z]+$/iu.test(word)) {
				add(word, false, id, page.path);
			}
		}
	}
	return [...by_label.entries()].map(([label, scheme]) => ({
		ids: scheme.ids,
		pattern: scheme.case_sensitive
			? new RegExp(`\\b${label}-?(\\d+)\\b`, 'gu')
			: new RegExp(`\\b${label}s?[ #-]*(\\d+)\\b`, 'giu'),
	}));
}

// Lines outside frontmatter and code blocks, with code spans removed.
function* prose_lines(text: string): Generator<[number, string]> {
	const lines = text.replace(/\r\n?/gu, '\n').split('\n');
	let index = 0;
	if (lines[0]?.trim() === '---') {
		index = lines.findIndex(
			(line, i) => i > 0 && line.trim() === '---',
		);
		index = index === -1 ? 0 : index + 1;
	}
	let fence: string | null = null;
	for (; index < lines.length; index += 1) {
		const line = lines[index] ?? '';
		const marker = line.match(/^\s*(`{3,}|~{3,})/u)?.[1];
		if (marker) {
			if (fence === null) fence = marker[0] ?? null;
			else if (marker[0] === fence) fence = null;
			continue;
		}
		if (fence !== null) continue;
		yield [index + 1, line.replace(/`[^`]*`/gu, '')];
	}
}

// Sections in changed files that repeat a section in another file.
// Each pair is reported once.
function overlap_issues(
	chunks: ChunkRow[],
	scope: Set<string>,
): LintIssue[] {
	const sections = chunks
		.filter((chunk) => !/(^|\/)changelog\.md$/iu.test(chunk.path))
		.map((chunk) => ({ ...chunk, shingles: shingles(chunk.body) }))
		.filter(
			(chunk) =>
				chunk.body.length >= min_overlap_chars &&
				chunk.shingles.size >= min_overlap_shingles,
		);
	const issues: LintIssue[] = [];
	for (const a of sections) {
		if (!scope.has(a.path)) continue;
		for (const b of sections) {
			if (a.path === b.path) continue;
			if (scope.has(b.path) && b.path < a.path) continue;
			let shared = 0;
			for (const phrase of a.shingles) {
				if (b.shingles.has(phrase)) shared += 1;
			}
			const smaller = Math.min(a.shingles.size, b.shingles.size);
			if (shared / smaller < overlap_threshold) continue;
			const other = `${b.path}:${b.start_line}-${b.end_line}`;
			issues.push({
				rule: 'overlapping-section',
				severity: 'warning',
				path: a.path,
				line: a.start_line,
				target: other,
				message: `${section_name(a)} repeats ${section_name(b)} at ${other}; keep one and delete the other`,
				suggestions: [other],
			});
		}
	}
	return issues;
}

function section_name(chunk: ChunkRow): string {
	return chunk.heading ? `"${chunk.heading}"` : 'This section';
}

function shingles(body: string): Set<string> {
	const words =
		body
			.replace(/```[\s\S]*?```/gu, ' ')
			.toLowerCase()
			.match(/[\p{L}\p{N}]+/gu) ?? [];
	const result = new Set<string>();
	for (let i = 0; i + 3 <= words.length; i += 1) {
		result.add(words.slice(i, i + 3).join(' '));
	}
	return result;
}

// A change that only adds lines. Models add rather than cut, so this
// asks the agent to look for text the change made wrong or repeated.
function growth_issues(
	changes: Map<string, Change> | null,
	files: string[],
): LintIssue[] {
	if (!changes) return [];
	const issues: LintIssue[] = [];
	for (const path of files) {
		const change = changes.get(path);
		if (
			!change ||
			change.deleted > 0 ||
			change.added < min_growth_lines
		) {
			continue;
		}
		issues.push({
			rule: 'net-growth',
			severity: 'info',
			path,
			line: null,
			message: change.new_file
				? `New document (+${change.added} lines): check no existing document already covers this, and delete what it replaces`
				: `Only additions (+${change.added}, -0): delete what this change made wrong, repeated or unneeded`,
		});
	}
	return issues;
}
