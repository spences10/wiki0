import {
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import {
	open_index,
	open_index_or_throw,
	open_index_readonly,
	resolve_index,
	resolve_project_root,
	worktree_key,
} from './storage.js';
import { make_wiki_root } from './test-utils.js';

const original_index_env = process.env.WIKI0_INDEX;

afterEach(() => {
	if (original_index_env === undefined)
		delete process.env.WIKI0_INDEX;
	else process.env.WIKI0_INDEX = original_index_env;
});

describe('resolve_project_root', () => {
	it('walks up to the folder holding .git', () => {
		const root = make_wiki_root();
		mkdirSync(join(root, '.git'));
		mkdirSync(join(root, 'docs/adr'), { recursive: true });

		expect(resolve_project_root(join(root, 'docs/adr'))).toBe(root);
	});

	it('treats a .git file (worktree) and wiki0.toml as markers', () => {
		const root = make_wiki_root();
		writeFileSync(join(root, '.git'), 'gitdir: /elsewhere\n');
		const nested = join(root, 'sub');
		mkdirSync(join(nested, 'deeper'), { recursive: true });
		writeFileSync(join(nested, 'wiki0.toml'), '');

		expect(resolve_project_root(join(nested, 'deeper'))).toBe(nested);
		expect(resolve_project_root(root)).toBe(root);
	});
});

describe('resolve_index', () => {
	it('puts the index in the cache, keyed per worktree', () => {
		const root = make_wiki_root();
		const location = resolve_index(root);

		expect(location.source).toBe('cache');
		expect(location.index_path).toBe(
			join(
				process.env.WIKI0_CACHE_DIR ?? '',
				worktree_key(root),
				'index.db',
			),
		);
		expect(location.worktree_key).toMatch(
			/^wiki0-core-.+-[0-9a-f]{12}$/u,
		);
	});

	it('uses a local index when wiki0.toml asks for one', () => {
		const root = make_wiki_root();
		writeFileSync(
			join(root, 'wiki0.toml'),
			'[index]\nlocation = "local"\n',
		);

		const location = resolve_index(root);
		expect(location.source).toBe('local');
		expect(location.index_path).toBe(
			join(root, '.wiki0', 'index.db'),
		);

		open_index(root).close();
		expect(
			readFileSync(join(root, '.wiki0/.gitignore'), 'utf-8'),
		).toBe('*\n');
	});

	it('lets WIKI0_INDEX override every other location', () => {
		const root = make_wiki_root();
		process.env.WIKI0_INDEX = join(root, 'custom.db');

		expect(resolve_index(root)).toMatchObject({
			source: 'env',
			index_path: join(root, 'custom.db'),
		});
	});
});

describe('open_index_readonly', () => {
	it('returns null without creating anything when there is no index', () => {
		const root = make_wiki_root();

		expect(open_index_readonly(root)).toBeNull();
		expect(existsSync(resolve_index(root).index_path)).toBe(false);
		expect(() => open_index_or_throw(root)).toThrow(/wiki0 index/u);
	});

	it('opens an index created by open_index', () => {
		const root = make_wiki_root();
		open_index(root).close();

		const db = open_index_readonly(root);
		expect(db).not.toBeNull();
		expect(() =>
			db?.exec('CREATE TABLE nope (id INTEGER)'),
		).toThrow();
		db?.close();
	});

	it('ignores an index from another schema version until rebuilt', () => {
		const root = make_wiki_root();
		const db = open_index(root);
		db.exec('PRAGMA user_version = 999');
		db.close();

		expect(open_index_readonly(root)).toBeNull();
		open_index(root).close();
		expect(open_index_readonly(root)).not.toBeNull();
	});
});
