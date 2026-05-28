import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Welcome from './Welcome.svelte';

describe('Welcome.svelte', () => {
	it('renders greetings for host and guest', async () => {
		render(Welcome, { host: 'SvelteKit', guest: 'Vitest' });

		expect(document.body.textContent).toContain('Hello, SvelteKit!');
		expect(document.body.textContent).toContain('Hello, Vitest!');
	});
});
