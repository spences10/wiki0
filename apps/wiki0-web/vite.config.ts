import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite-plus';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			// Every page is prerendered; the build is a static site.
			adapter: adapter({ strict: true }),
			compilerOptions: {
				// Force runes mode for the project, except for libraries.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules')
						? undefined
						: true,
			},
		}),
	],
});
