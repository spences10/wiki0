import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, normalize } from 'node:path';
import { parse } from 'smol-toml';

export const config_file_name = 'wiki0.toml';

export type IndexLocationSetting = 'cache' | 'local';

export type Wiki0Config = {
	include: string[];
	exclude: string[];
	index_location: IndexLocationSetting;
	// `wiki0 check` rules to skip, from `[check] disable`.
	check_disable: string[];
	config_path: string | null;
};

const default_include = ['**/*.md'];

export function read_config(root: string): Wiki0Config {
	const config_path = join(root, config_file_name);
	if (!existsSync(config_path)) {
		return {
			include: default_include,
			exclude: [],
			index_location: 'cache',
			check_disable: [],
			config_path: null,
		};
	}

	let data: Record<string, unknown>;
	try {
		data = parse(readFileSync(config_path, 'utf-8'));
	} catch (error) {
		throw new Error(
			`Invalid ${config_file_name}: ${(error as Error).message}`,
		);
	}

	const index = data.index;
	const location =
		index && typeof index === 'object' && 'location' in index
			? index.location
			: 'cache';
	if (location !== 'cache' && location !== 'local') {
		throw new Error(
			`Invalid ${config_file_name}: index.location must be "cache" or "local".`,
		);
	}

	const check = data.check;
	const disable =
		check && typeof check === 'object' && 'disable' in check
			? check.disable
			: [];
	if (
		!Array.isArray(disable) ||
		!disable.every((rule) => typeof rule === 'string')
	) {
		throw new Error(
			`Invalid ${config_file_name}: check.disable must be an array of rule names.`,
		);
	}

	return {
		include: read_globs(data.include, 'include') ?? default_include,
		exclude: read_globs(data.exclude, 'exclude') ?? [],
		index_location: location,
		check_disable: disable,
		config_path: config_path,
	};
}

function read_globs(value: unknown, key: string): string[] | null {
	if (value === undefined) return null;
	if (
		!Array.isArray(value) ||
		!value.every((item) => typeof item === 'string')
	) {
		throw new Error(
			`Invalid ${config_file_name}: ${key} must be an array of strings.`,
		);
	}
	for (const glob of value) {
		// Committed config must not reach outside the project.
		const segments = normalize(glob).split(/[\\/]/u);
		if (isAbsolute(glob) || segments.includes('..')) {
			throw new Error(
				`Invalid ${config_file_name}: ${key} pattern "${glob}" must stay inside the project.`,
			);
		}
	}
	return value;
}
