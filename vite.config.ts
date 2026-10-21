import { defineConfig } from 'vite-plus';

const config = {
	test: {
		expect: { requireAssertions: true },
		environment: 'node',
		include: ['packages/**/*.test.ts', 'src/**/*.test.ts'],
		setupFiles: ['tools/test-setup.ts'],
	},
	fmt: {
		useTabs: true,
		singleQuote: true,
		printWidth: 70,
		trailingComma: 'all',
		proseWrap: 'always',
		// Skill loaders need the frontmatter description on one line.
		ignorePatterns: [
			'.agents/skills/**/SKILL.md',
			'packages/cli/skills/**/SKILL.md',
		],
		overrides: [
			{
				files: [
					'apps/wiki0-web/**/*.svelte',
					'packages/ui/**/*.svelte',
				],
				options: { svelte: true },
			},
		],
	},
	lint: {
		ignorePatterns: [
			'apps/wiki0-web/.svelte-kit/**',
			'apps/wiki0-web/build/**',
			'apps/wiki0-web/dist/**',
			'packages/ui/dist/**',
		],
		options: {
			typeAware: true,
			typeCheck: true,
		},
	},
};

export default defineConfig(config as never);
