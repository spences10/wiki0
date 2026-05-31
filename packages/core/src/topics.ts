import type { SQLOutputValue } from 'node:sqlite';
import { open_wiki_database } from './database.js';
import type { TopicThreadResult } from './types.js';

export function list_topic_threads(
	root = '.',
	limit = 50,
): TopicThreadResult[] {
	const db = open_wiki_database(root);
	const rows = db
		.prepare(
			`SELECT path, title, heading, page_tags FROM page_chunks
			ORDER BY path, sequence`,
		)
		.all() as Record<string, SQLOutputValue>[];
	db.close();

	const topics = new Map<
		string,
		{ paths: Set<string>; references: number; headings: Set<string> }
	>();
	for (const row of rows) {
		const path = String(row.path);
		const heading = row.heading === null ? null : String(row.heading);
		const tags = parse_tags(row.page_tags);
		for (const topic of [...tags, ...(heading ? [heading] : [])]) {
			const normalized_topic = topic.trim();
			if (!normalized_topic) continue;
			const bucket = topics.get(normalized_topic) ?? {
				paths: new Set<string>(),
				references: 0,
				headings: new Set<string>(),
			};
			bucket.paths.add(path);
			bucket.references += 1;
			if (heading) bucket.headings.add(heading);
			topics.set(normalized_topic, bucket);
		}
	}

	return [...topics]
		.map(([topic, bucket]) => ({
			topic,
			reference_count: bucket.references,
			page_count: bucket.paths.size,
			paths: [...bucket.paths].sort(),
			summary: [...bucket.headings].slice(0, 5).join('; '),
		}))
		.sort(
			(left, right) =>
				right.reference_count - left.reference_count ||
				left.topic.localeCompare(right.topic),
		)
		.slice(0, limit);
}

function parse_tags(value: SQLOutputValue): string[] {
	if (value === null) return [];
	try {
		const parsed = JSON.parse(String(value)) as unknown;
		return Array.isArray(parsed)
			? parsed.filter((tag): tag is string => typeof tag === 'string')
			: [];
	} catch {
		return [];
	}
}
