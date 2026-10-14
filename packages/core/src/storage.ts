import { createHash } from 'node:crypto';
import {
	existsSync,
	mkdirSync,
	realpathSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import {
	basename,
	dirname,
	isAbsolute,
	join,
	resolve,
} from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config_file_name, read_config } from './config.js';
import { index_schema_version, schema_sql } from './schema.js';

export type WikiDatabase = DatabaseSync;

export type IndexLocationSource = 'env' | 'local' | 'cache';

export type IndexLocation = {
	root: string;
	index_path: string;
	worktree_key: string;
	source: IndexLocationSource;
	config_path: string | null;
};

const index_file_name = 'index.db';
const busy_timeout_ms = 5000;

// Nearest folder with wiki0.toml or .git (a file in worktrees),
// falling back to the start path.
export function resolve_project_root(start_path = '.'): string {
	const start = resolve(start_path);
	let current_path = start;
	while (true) {
		if (
			existsSync(join(current_path, config_file_name)) ||
			existsSync(join(current_path, '.git'))
		) {
			return current_path;
		}
		const parent_path = dirname(current_path);
		if (parent_path === current_path) return start;
		current_path = parent_path;
	}
}

export function worktree_key(root: string): string {
	const real_root = realpathSync(root);
	const hash = createHash('sha256')
		.update(real_root)
		.digest('hex')
		.slice(0, 12);
	const name =
		basename(real_root)
			.toLowerCase()
			.replace(/[^a-z0-9]+/gu, '-')
			.replace(/^-+|-+$/gu, '') || 'root';
	return `${name}-${hash}`;
}

export function resolve_index(start_path = '.'): IndexLocation {
	const root = resolve_project_root(start_path);
	const config = read_config(root);
	const key = worktree_key(root);
	const env_path = process.env.WIKI0_INDEX;

	if (env_path) {
		return {
			root,
			index_path: resolve(env_path),
			worktree_key: key,
			source: 'env',
			config_path: config.config_path,
		};
	}
	if (config.index_location === 'local') {
		return {
			root,
			index_path: join(root, '.wiki0', index_file_name),
			worktree_key: key,
			source: 'local',
			config_path: config.config_path,
		};
	}
	return {
		root,
		index_path: join(cache_base_dir(), key, index_file_name),
		worktree_key: key,
		source: 'cache',
		config_path: config.config_path,
	};
}

function cache_base_dir(): string {
	const override = process.env.WIKI0_CACHE_DIR;
	if (override) return resolve(override);
	if (process.platform === 'darwin') {
		return join(homedir(), 'Library', 'Caches', 'wiki0');
	}
	if (process.platform === 'win32') {
		const local_app_data =
			process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local');
		return join(local_app_data, 'wiki0', 'Cache');
	}
	const xdg_cache = process.env.XDG_CACHE_HOME;
	// The XDG spec says relative paths must be ignored.
	const base =
		xdg_cache && isAbsolute(xdg_cache)
			? xdg_cache
			: join(homedir(), '.cache');
	return join(base, 'wiki0');
}

// Opens the index for writing. The index is a rebuildable cache, so
// a schema version mismatch deletes and recreates it.
export function open_index(start_path = '.'): WikiDatabase {
	const location = resolve_index(start_path);
	prepare_index_dir(location);

	let db = new DatabaseSync(location.index_path);
	if (read_user_version(db) !== index_schema_version) {
		db.close();
		remove_index_files(location.index_path);
		db = new DatabaseSync(location.index_path);
	}
	db.exec(`PRAGMA busy_timeout = ${busy_timeout_ms}`);
	db.exec(schema_sql);
	db.exec(`PRAGMA user_version = ${index_schema_version}`);
	return db;
}

// Opens an existing index without creating or migrating anything.
// Returns null when the index is missing or from another schema.
export function open_index_readonly(
	start_path = '.',
): WikiDatabase | null {
	const location = resolve_index(start_path);
	if (!existsSync(location.index_path)) return null;
	const db = new DatabaseSync(location.index_path, {
		readOnly: true,
	});
	db.exec(`PRAGMA busy_timeout = ${busy_timeout_ms}`);
	if (read_user_version(db) !== index_schema_version) {
		db.close();
		return null;
	}
	return db;
}

// Thrown by read functions when the project has no usable index, so
// callers can check `code` instead of matching the message.
export class IndexMissingError extends Error {
	readonly code = 'not-indexed';

	constructor() {
		super(
			'No usable wiki0 index for this project. Run `wiki0 index` first.',
		);
		this.name = 'IndexMissingError';
	}
}

export function open_index_or_throw(start_path = '.'): WikiDatabase {
	const db = open_index_readonly(start_path);
	if (!db) throw new IndexMissingError();
	return db;
}

function read_user_version(db: WikiDatabase): number {
	const row = db.prepare('PRAGMA user_version').get() as {
		user_version: number;
	};
	return row.user_version;
}

function prepare_index_dir(location: IndexLocation): void {
	const index_dir = dirname(location.index_path);
	mkdirSync(index_dir, { recursive: true });
	if (location.source === 'local') {
		// Keeps the local index out of git without editing the
		// project's own .gitignore.
		const gitignore_path = join(index_dir, '.gitignore');
		if (!existsSync(gitignore_path)) {
			writeFileSync(gitignore_path, '*\n');
		}
	}
}

function remove_index_files(index_path: string): void {
	for (const suffix of ['', '-wal', '-shm']) {
		rmSync(`${index_path}${suffix}`, { force: true });
	}
}
