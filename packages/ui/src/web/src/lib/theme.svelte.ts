export type ThemeMode = 'light' | 'dark' | 'system';

const storage_key = 'wiki0-theme';

function read_mode(): ThemeMode {
	try {
		const stored = localStorage.getItem(storage_key);
		if (stored === 'light' || stored === 'dark') return stored;
	} catch {
		// Storage can be unavailable; fall back to the system setting.
	}
	return 'system';
}

const system_dark = window.matchMedia('(prefers-color-scheme: dark)');

class Theme {
	mode = $state<ThemeMode>(read_mode());
	#system_dark = $state(system_dark.matches);
	dark = $derived(
		this.mode === 'dark' || (this.mode === 'system' && this.#system_dark),
	);

	constructor() {
		system_dark.addEventListener('change', (event) => {
			this.#system_dark = event.matches;
		});
	}

	set(mode: ThemeMode): void {
		this.mode = mode;
		try {
			if (mode === 'system') localStorage.removeItem(storage_key);
			else localStorage.setItem(storage_key, mode);
		} catch {
			// The choice still applies for this page.
		}
	}

	// Applies the class shadcn's tokens and twinkleplop follow.
	apply(): void {
		document.documentElement.classList.toggle('dark', this.dark);
		document.documentElement.style.colorScheme = this.dark
			? 'dark'
			: 'light';
	}
}

export const theme = new Theme();
