import { defineConfig } from 'vite-plus';

const config = {
	test: {
		expect: { requireAssertions: true },
		environment: 'node',
		include: ['packages/**/*.test.ts', 'src/**/*.test.ts'],
	},
	fmt: {
		useTabs: true,
		singleQuote: true,
		printWidth: 70,
		trailingComma: 'all',
		proseWrap: 'always',
		overrides: [
			{
				files: ['apps/wiki0-web/**/*.svelte'],
				options: { svelte: true },
			},
		],
	},
	lint: {
		ignorePatterns: [
			'apps/wiki0-web/**',
			'apps/wiki0-web/.svelte-kit/**',
			'apps/wiki0-web/build/**',
			'apps/wiki0-web/dist/**',
		],
		options: {
			typeAware: true,
			typeCheck: true,
		},
	},
};

export default defineConfig(config as never);
