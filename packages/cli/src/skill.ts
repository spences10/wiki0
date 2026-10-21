import { readFileSync } from 'node:fs';

// The agent skill shipped with the package. `wiki0 skill` prints it so
// the user or agent saves it; wiki0 never writes project files.
export function skill_text(): string {
	return readFileSync(
		new URL('../skills/wiki0/SKILL.md', import.meta.url),
		'utf-8',
	);
}
