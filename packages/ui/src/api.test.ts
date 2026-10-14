import { describe, expect, it } from 'vite-plus/test';
import { create_reindexer } from './api.js';

describe('create_reindexer', () => {
	it('runs one reindex at a time', async () => {
		let finish: (value: unknown) => void = () => {};
		const reindex = create_reindexer(
			'/project',
			() => new Promise((resolve) => (finish = resolve)),
		);
		const first = reindex();
		expect(await reindex()).toMatchObject({
			status: 409,
			json: { code: 'busy' },
		});
		finish({ page_count: 1 });
		expect(await first).toEqual({
			status: 200,
			json: { page_count: 1 },
		});
		const again = reindex();
		finish({ page_count: 2 });
		expect((await again).status).toBe(200);
	});

	it('frees the lock when indexing fails', async () => {
		let calls = 0;
		const reindex = create_reindexer('/project', async () => {
			calls += 1;
			if (calls === 1) throw new Error('boom');
			return {};
		});
		await expect(reindex()).rejects.toThrow('boom');
		expect((await reindex()).status).toBe(200);
	});
});
