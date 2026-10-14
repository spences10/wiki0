import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Keep test indexes out of the real user cache.
process.env.WIKI0_CACHE_DIR = mkdtempSync(
	join(tmpdir(), 'wiki0-test-cache-'),
);
delete process.env.WIKI0_INDEX;
