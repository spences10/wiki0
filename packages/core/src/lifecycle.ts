// Reads document lifecycle fields written in the body, the way ADR
// templates do it: `Status: Accepted`, `**Superseded by:** ADR-12`,
// `Amends: [ADR-0002](0002-x.md)`, or a `## Status` section.

export type LifecycleRelation =
	| 'superseded_by'
	| 'supersedes'
	| 'amends'
	| 'amended_by';

export type HeaderReference = {
	relation: LifecycleRelation;
	line: number;
	text: string;
};

export type HeaderLifecycle = {
	status: string | null;
	references: HeaderReference[];
};

// Fields only count in the header: before the first `##` heading and
// within this many lines.
const header_line_limit = 30;

const field_pattern =
	/^\s*(?:[-*]\s+)?(status|supersedes|superseded by|replaces|replaced by|amends|amended by)\s*:\s*(.+)$/iu;

const relation_for: Record<string, LifecycleRelation> = {
	'superseded by': 'superseded_by',
	'replaced by': 'superseded_by',
	supersedes: 'supersedes',
	replaces: 'supersedes',
	amends: 'amends',
	'amended by': 'amended_by',
};

export function read_header_lifecycle(
	content: string,
	line_offset = 0,
): HeaderLifecycle {
	const lines = content.split('\n');
	let status: string | null = null;
	const references: HeaderReference[] = [];
	let in_code = false;
	let status_section = false;

	for (const [index, raw] of lines.entries()) {
		const line_number = line_offset + index + 1;
		if (/^\s*(```|~~~)/u.test(raw)) in_code = !in_code;
		if (in_code) continue;
		const heading = raw.match(/^(#{1,6})\s+(.*)$/u);
		if (heading) {
			status_section = /^status$/iu.test(heading[2]?.trim() ?? '');
			if (!status_section && (heading[1]?.length ?? 0) >= 2) {
				if (index >= header_line_limit) break;
				// Past the header, only a `## Status` section still counts.
				continue;
			}
			continue;
		}
		const in_header =
			index < header_line_limit && !has_h2_before(lines, index);
		const text = raw.replace(/\*\*/gu, '').replace(/__/gu, '');
		if (status_section && status === null && text.trim()) {
			status = status_word(text);
			add_superseded_ref(text, line_number, references);
			continue;
		}
		if (!in_header) continue;
		const field = text.match(field_pattern);
		if (!field) continue;
		const name = (field[1] ?? '').toLowerCase();
		const value = field[2] ?? '';
		if (name === 'status') {
			status ??= status_word(value);
			add_superseded_ref(value, line_number, references);
		} else {
			references.push({
				relation: relation_for[name] ?? 'amends',
				line: line_number,
				text: value,
			});
		}
	}
	return { status, references };
}

function has_h2_before(lines: string[], index: number): boolean {
	for (let i = 0; i < index; i += 1) {
		if (/^##\s/u.test(lines[i] ?? '')) return true;
	}
	return false;
}

function status_word(value: string): string | null {
	return value.match(/[a-z]+/iu)?.[0]?.toLowerCase() ?? null;
}

// `Status: Superseded by ADR-0012` carries the successor too.
function add_superseded_ref(
	value: string,
	line: number,
	references: HeaderReference[],
): void {
	const match = value.match(
		/(?:superseded|replaced) by\s*:?\s*(.+)$/iu,
	);
	if (match?.[1]) {
		references.push({
			relation: 'superseded_by',
			line,
			text: match[1],
		});
	}
}

// Bare ADR numbers in a field value, such as `ADR 0010`, `ADR-12` or
// `0005`, matched against sibling files that start with that number.
export function numbered_references(
	text: string,
	from_path: string,
	paths: string[],
): string[] {
	const folder = from_path.includes('/')
		? from_path.slice(0, from_path.lastIndexOf('/') + 1)
		: '';
	const found = new Set<string>();
	// Only `ADR-12`/`ADR 12` or zero-padded numbers such as `0005`, so
	// dates and counts do not match.
	for (const match of text.matchAll(
		/\badr[- ]?(\d{1,4})\b|\b(0\d{2,3})\b/giu,
	)) {
		const number = Number(match[1] ?? match[2]);
		for (const path of paths) {
			if (path === from_path || !path.startsWith(folder)) continue;
			const name = path.slice(folder.length);
			if (name.includes('/')) continue;
			const prefix = name.match(/^0*(\d{1,4})[-_]/u);
			if (prefix && Number(prefix[1]) === number) found.add(path);
		}
	}
	return [...found];
}
