#!/usr/bin/env node

import {
	append_page,
	create_page,
	read_page,
	schema_sql,
} from '@wiki0/core';
import { defineCommand, runMain } from 'citty';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const main = defineCommand({
	meta: {
		name: 'wiki0',
		description:
			'Local-first Markdown wiki memory for humans and agents',
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
		page: defineCommand({
			meta: { description: 'Create, read, and append wiki pages' },
			subCommands: {
				create: defineCommand({
					meta: { description: 'Create a wiki page' },
					args: {
						title: {
							type: 'positional',
							required: true,
							description: 'Page title or path',
						},
						body: { type: 'string', description: 'Markdown body' },
						file: {
							type: 'string',
							description: 'Read Markdown body from a file',
						},
						root: {
							type: 'string',
							description: 'Wiki root path',
							default: '.',
						},
						overwrite: {
							type: 'boolean',
							description: 'Overwrite an existing page',
						},
					},
					run({ args }) {
						const body = args.file
							? readFileSync(String(args.file), 'utf-8')
							: String(args.body ?? '');
						const page = create_page(String(args.title), body, {
							root: String(args.root ?? '.'),
							overwrite: Boolean(args.overwrite),
						});
						console.log(JSON.stringify(page, null, 2));
					},
				}),
				read: defineCommand({
					meta: { description: 'Read a wiki page' },
					args: {
						title: {
							type: 'positional',
							required: true,
							description: 'Page title or path',
						},
						root: {
							type: 'string',
							description: 'Wiki root path',
							default: '.',
						},
					},
					run({ args }) {
						const page = read_page(
							String(args.title),
							String(args.root ?? '.'),
						);
						console.log(JSON.stringify(page, null, 2));
					},
				}),
				append: defineCommand({
					meta: { description: 'Append Markdown to a wiki page' },
					args: {
						title: {
							type: 'positional',
							required: true,
							description: 'Page title or path',
						},
						body: {
							type: 'string',
							description: 'Markdown body to append',
						},
						file: {
							type: 'string',
							description: 'Read Markdown body from a file',
						},
						root: {
							type: 'string',
							description: 'Wiki root path',
							default: '.',
						},
					},
					run({ args }) {
						const body = args.file
							? readFileSync(String(args.file), 'utf-8')
							: String(args.body ?? '');
						const page = append_page(
							String(args.title),
							body,
							String(args.root ?? '.'),
						);
						console.log(JSON.stringify(page, null, 2));
					},
				}),
			},
		}),
		index: defineCommand({
			meta: {
				description: 'Index Markdown pages into SQLite (planned)',
			},
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

void void runMain(main);
