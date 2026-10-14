import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'vp preview',
		port: 4173,
	},
	testDir: 'test',
	testMatch: '**/*.e2e.ts',
});
