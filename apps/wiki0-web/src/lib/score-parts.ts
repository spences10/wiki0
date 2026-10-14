// A search score's parts as the local UI shows them: the text match is
// the base and the other parts multiply it, so they read as boosts or
// penalties either side of ×1.

export type ScorePart = {
	part: string;
	label: string;
	value: number;
	// Signed change from neutral: text match from 0, multipliers from 1
	effect: number;
};

const labels: Record<string, string> = {
	text: 'Text match',
	status: 'Status',
	type: 'Type',
	inlinks: 'In-links',
	priority: 'Priority',
	recency: 'Recency',
};

export const score_parts = (
	parts: Record<string, number>,
): ScorePart[] =>
	Object.keys(labels).map((part) => {
		const value = parts[part] ?? 1;
		return {
			part,
			label: labels[part] ?? part,
			value,
			effect: part === 'text' ? value : value - 1,
		};
	});

export const format_part = (row: ScorePart) =>
	row.part === 'text'
		? row.value.toFixed(3)
		: `×${row.value.toFixed(2)}`;
