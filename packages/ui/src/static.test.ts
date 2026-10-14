import { describe, expect, it } from 'vite-plus/test';
import { file_under, read_static } from './static.js';
import { make_temp_dir, write_file } from './test-utils.js';

function web_dir(): string {
	const dir = make_temp_dir();
	write_file(dir, 'index.html', '<div id="app"></div>');
	write_file(dir, 'assets/app.js', 'console.log(1)');
	return dir;
}

describe('file_under', () => {
	it('refuses paths that leave the base', () => {
		expect(file_under('/srv/web', '/../secret')).toBeNull();
		expect(file_under('/srv/web', '/%2e%2e/secret')).toBeNull();
		expect(file_under('/srv/web', '/a%00b')).toBeNull();
		expect(file_under('/srv/web', '/%E0%A4%A')).toBeNull();
		expect(file_under('/srv/web', '/assets/app.js')).toBe(
			'/srv/web/assets/app.js',
		);
	});
});

describe('read_static', () => {
	it('serves built assets as immutable', () => {
		const file = read_static(web_dir(), '/assets/app.js');
		expect(file?.content_type).toBe('text/javascript; charset=utf-8');
		expect(file?.immutable).toBe(true);
	});

	it('serves the app shell for client routes', () => {
		const file = read_static(web_dir(), '/docs/guide.md');
		expect(file?.body.toString()).toContain('id="app"');
		expect(file?.immutable).toBe(false);
	});

	it('404s missing assets instead of serving the shell', () => {
		expect(read_static(web_dir(), '/assets/missing.js')).toBeNull();
	});

	it('never serves files outside the web folder', () => {
		const file = read_static(web_dir(), '/%2e%2e/%2e%2e/etc/passwd');
		expect(file).toBeNull();
	});
});
