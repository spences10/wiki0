const storage_key = 'wiki0-sidebar-width';

export const sidebar_width_min = 192;
export const sidebar_width_max = 512;

function clamp(px: number): number {
	return Math.round(
		Math.min(sidebar_width_max, Math.max(sidebar_width_min, px)),
	);
}

function read_width(): number | null {
	try {
		const stored = Number(localStorage.getItem(storage_key));
		if (stored > 0) return clamp(stored);
	} catch {
		// Storage can be unavailable; fall back to the default width.
	}
	return null;
}

class SidebarWidth {
	// Pixels set by dragging the sidebar edge; null keeps the default.
	px = $state<number | null>(read_width());
	// True while the edge is dragged, so the width skips its transition.
	resizing = $state(false);
	// Overrides the sidebar provider's default --sidebar-width.
	style = $derived(
		this.px === null ? undefined : `--sidebar-width: ${this.px}px;`,
	);

	set(px: number): void {
		this.px = clamp(px);
	}

	save(): void {
		try {
			if (this.px === null) localStorage.removeItem(storage_key);
			else localStorage.setItem(storage_key, String(this.px));
		} catch {
			// The width still applies for this page.
		}
	}
}

export const sidebar_width = new SidebarWidth();
