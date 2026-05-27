#!/usr/bin/env node

import { defineCommand, runMain } from 'citty';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { schema_sql } from '@wiki0/core';

const main = defineCommand({
	meta: {
		name: 'wiki0',
		description: 'Local-first Markdown wiki memory for humans and agents',
	},
	subCommands: {
		init: defineCommand({
			meta: { description: 'Create a wiki0 folder structure' },
			args: {
				path: {
					type: 'positional',
					description: 'Wiki root path',
					default: '.',
				},
			},
			run({ args }) {
				const root = String(args.path ?? '.');
				for (const dir of [
					'wiki/inbox',
					'wiki/decisions',
					'wiki/people',
					'wiki/projects',
					'wiki/topics',
					'.wiki0',
				]) {
					mkdirSync(join(root, dir), { recursive: true });
				}
				writeFileSync(
					join(root, 'wiki/index.md'),
					'# Wiki0\n\nStart here. Link pages with `[[topics/example]]`.\n',
					{ flag: 'wx' },
				);
				writeFileSync(join(root, '.wiki0/schema.sql'), schema_sql);
				console.log(`Created wiki0 workspace at ${root}`);
			},
		}),
		index: defineCommand({
			meta: { description: 'Index Markdown pages into SQLite (planned)' },
			run() {
				console.log('index: planned');
			},
		}),
		search: defineCommand({
			meta: { description: 'Search indexed wiki pages (planned)' },
			args: { query: { type: 'positional', required: true } },
			run({ args }) {
				console.log(`search: planned for ${args.query}`);
			},
		}),
	},
});

void runMain(main);
