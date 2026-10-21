import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';
import { read_config } from './config.js';
import { make_wiki_root } from './test-utils.js';

describe('read_config', () => {
	it('defaults to all Markdown and the cache index', () => {
		expect(read_config(make_wiki_root())).toEqual({
			include: ['**/*.md'],
			exclude: [],
			index_location: 'cache',
			check_disable: [],
			config_path: null,
		});
	});

	it('reads include, exclude and index location', () => {
		const root = make_wiki_root();
		writeFileSync(
			join(root, 'wiki0.toml'),
			[
				'include = ["docs/**/*.md", "adr/*.md"]',
				'exclude = ["docs/archive/**"]',
				'[index]',
				'location = "local"',
				'[check]',
				'disable = ["net-growth"]',
			].join('\n'),
		);

		expect(read_config(root)).toEqual({
			include: ['docs/**/*.md', 'adr/*.md'],
			exclude: ['docs/archive/**'],
			index_location: 'local',
			check_disable: ['net-growth'],
			config_path: join(root, 'wiki0.toml'),
		});
	});

	it.each([
		['include = ["../other/**"]', /inside the project/u],
		['include = ["/etc/**"]', /inside the project/u],
		['include = "docs"', /array of strings/u],
		['[index]\nlocation = "remote"', /cache" or "local/u],
		['include = [', /Invalid wiki0.toml/u],
		['[check]\ndisable = "net-growth"', /array of rule names/u],
	])('rejects %s', (body, message) => {
		const root = make_wiki_root();
		writeFileSync(join(root, 'wiki0.toml'), body);

		expect(() => read_config(root)).toThrow(message);
	});
});
