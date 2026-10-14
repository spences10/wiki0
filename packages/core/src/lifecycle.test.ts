import { describe, expect, it } from 'vite-plus/test';
import { index_wiki } from './indexer.js';
import {
	numbered_references,
	read_header_lifecycle,
} from './lifecycle.js';
import { search } from './search.js';
import { make_wiki_root, write_doc } from './test-utils.js';

describe('read_header_lifecycle', () => {
	it('reads status and references from header lines', () => {
		const content = [
			'# ADR 0011: Shared keys',
			'',
			'**Status:** Accepted — 2026-08-27',
			'- **Supersedes:** the wording in ADR 0010',
			'Amends: [ADR-0002](0002-registry.md)',
			'',
			'## Context',
			'',
			'Status: ignored after the header',
		].join('\n');

		expect(read_header_lifecycle(content)).toEqual({
			status: 'accepted',
			references: [
				{
					relation: 'supersedes',
					line: 4,
					text: 'the wording in ADR 0010',
				},
				{
					relation: 'amends',
					line: 5,
					text: '[ADR-0002](0002-registry.md)',
				},
			],
		});
	});

	it('reads a Status section and a successor in it', () => {
		const content = '# Old\n\n## Status\n\nSuperseded by ADR-12\n';

		expect(read_header_lifecycle(content)).toEqual({
			status: 'superseded',
			references: [
				{ relation: 'superseded_by', line: 5, text: 'ADR-12' },
			],
		});
	});
});

describe('numbered_references', () => {
	const paths = [
		'adr/0005-flags.md',
		'adr/0010-email.md',
		'adr/0011-keys.md',
		'other/0010-x.md',
	];

	it('matches ADR numbers and zero-padded numbers in the same folder', () => {
		expect(
			numbered_references(
				'ADR 10 and `0005`, from 2026-08-27, package 1',
				'adr/0011-keys.md',
				paths,
			),
		).toEqual(['adr/0010-email.md', 'adr/0005-flags.md']);
	});
});

describe('header lifecycle in search', () => {
	it('demotes a doc that says it is superseded and points to its successor', async () => {
		const root = make_wiki_root();
		write_doc(
			root,
			'adr/0001-json.md',
			'# ADR 1: JSON wire format\n\nStatus: Superseded by ADR-2\n\nMessages use the JSON wire format.',
		);
		write_doc(
			root,
			'adr/0002-msgpack.md',
			'# ADR 2: MessagePack\n\nStatus: Accepted\n\nMessages use the MessagePack wire format.',
		);
		await index_wiki(root);

		const { results } = search('wire format', root);

		expect(results[0]?.path).toBe('adr/0002-msgpack.md');
		expect(results[1]).toMatchObject({
			path: 'adr/0001-json.md',
			superseded_by: 'adr/0002-msgpack.md',
		});
	});

	it('marks a doc amended by a newer doc without hiding it', async () => {
		const root = make_wiki_root();
		write_doc(
			root,
			'adr/0010-email.md',
			'# ADR 10\n\nEmail is the login key.',
		);
		write_doc(
			root,
			'adr/0011-keys.md',
			'# ADR 11\n\nSupersedes: the login wording in ADR 0010\n\nOne login per person.',
		);
		await index_wiki(root);

		expect(search('email login key', root).results[0]).toMatchObject({
			path: 'adr/0010-email.md',
			amended_by: 'adr/0011-keys.md',
			superseded_by: null,
		});
	});
});
