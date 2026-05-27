import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vite-plus';

const config = {
	plugins: [tailwindcss(), sveltekit()],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	},
	fmt: {
		ignorePatterns: ['.svelte-kit/**', 'build/**', 'dist/**', 'worker-configuration.d.ts'],
		useTabs: true,
		singleQuote: true,
		printWidth: 100,
		trailingComma: 'none'
	},
	lint: {
		ignorePatterns: ['.svelte-kit/**', 'build/**', 'dist/**', 'worker-configuration.d.ts'],
		options: {
			typeAware: true,
			typeCheck: true
		}
	}
};

export default defineConfig(config as never);
