import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite-plus';

// Builds the browser app into dist/web; the server serves it from
// there. Server code is compiled separately with tsc.
export default defineConfig({
	plugins: [svelte()],
	root: 'src/web',
	base: '/',
	build: {
		outDir: '../../dist/web',
		emptyOutDir: true,
	},
	test: {
		root: '.',
		include: ['src/**/*.test.ts'],
		environment: 'node',
		expect: { requireAssertions: true },
		setupFiles: ['../../tools/test-setup.ts'],
	},
});
