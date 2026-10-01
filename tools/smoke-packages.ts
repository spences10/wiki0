import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';

const root = fileURLToPath(new URL('..', import.meta.url));
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const packages = [
	{
		name: '@wiki0/core',
		files: ['package/dist/index.js', 'package/dist/schema.sql'],
	},
	{
		name: '@wiki0/cli',
		files: ['package/dist/index.js'],
		executable: 'package/dist/index.js',
	},
	{
		name: '@wiki0/mcp',
		files: ['package/dist/index.js'],
		executable: 'package/dist/index.js',
	},
];

function run(command: string, args: string[], input?: string) {
	const result = spawnSync(command, args, {
		cwd: root,
		encoding: 'utf8',
		input,
	});

	if (result.status !== 0) {
		throw new Error(
			[
				`Command failed: ${command} ${args.join(' ')}`,
				result.stdout,
				result.stderr,
			]
				.filter(Boolean)
				.join('\n'),
		);
	}

	return result;
}

function tarEntries(buffer: Buffer) {
	const entries = new Map<string, number>();
	const tar = gunzipSync(buffer);

	for (let offset = 0; offset + 512 <= tar.length;) {
		const name = tar
			.subarray(offset, offset + 100)
			.toString('utf8')
			.replace(/\0.*$/, '');
		if (!name) break;

		const mode = Number.parseInt(
			tar
				.subarray(offset + 100, offset + 108)
				.toString('utf8')
				.replace(/\0.*$/, '')
				.trim() || '0',
			8,
		);
		const size = Number.parseInt(
			tar
				.subarray(offset + 124, offset + 136)
				.toString('utf8')
				.replace(/\0.*$/, '')
				.trim() || '0',
			8,
		);

		entries.set(name, mode);
		offset += 512 + Math.ceil(size / 512) * 512;
	}

	return entries;
}

const output = await mkdtemp(join(tmpdir(), 'wiki0-packages-'));

try {
	for (const packageInfo of packages) {
		const before = new Set(await readdir(output));
		run(pnpm, [
			'--filter',
			packageInfo.name,
			'pack',
			'--pack-destination',
			output,
		]);

		const tarball = (await readdir(output)).find(
			(file) => file.endsWith('.tgz') && !before.has(file),
		);
		if (!tarball) {
			throw new Error(`No tarball produced for ${packageInfo.name}`);
		}

		const entries = tarEntries(await readFile(join(output, tarball)));
		for (const file of packageInfo.files) {
			if (!entries.has(file)) {
				throw new Error(
					`${packageInfo.name} tarball is missing ${file}`,
				);
			}
		}

		if (
			packageInfo.executable &&
			!((entries.get(packageInfo.executable) ?? 0) & 0o111)
		) {
			throw new Error(
				`${packageInfo.name} binary is not executable in its tarball`,
			);
		}

		console.log(`Verified ${packageInfo.name}: ${tarball}`);
	}

	const cli = run(process.execPath, [
		'packages/cli/dist/index.js',
		'--help',
	]);
	if (!cli.stdout.includes('USAGE')) {
		throw new Error('CLI help smoke test returned unexpected output');
	}
	console.log('Verified @wiki0/cli binary');

	run(process.execPath, ['packages/mcp/dist/index.js'], '');
	console.log('Verified @wiki0/mcp binary');
} finally {
	await rm(output, { recursive: true, force: true });
}
