import type { DocumentSummary } from '@wiki0/core';
import { api, is_not_indexed, type Meta } from './api.js';

const poll_interval_ms = 15_000;

/**
 * What every view shares: the wikilink syntax, the document list and
 * whether the project is indexed. `version` changes whenever the
 * index is rebuilt, here or by `wiki0 index`, so views refetch.
 */
class AppState {
	meta = $state<Meta | null>(null);
	documents = $state.raw<DocumentSummary[]>([]);
	paths = $derived(new Set(this.documents.map((document) => document.path)));
	not_indexed = $state(false);
	error = $state<string | null>(null);
	loading = $state(true);
	reindexing = $state(false);
	version = $state(0);
	#indexed_at: string | null = null;

	async load(): Promise<void> {
		try {
			this.meta ??= await api.meta();
			const { status } = await api.status();
			this.#indexed_at = status.indexed_at;
			this.documents = await api.documents();
			this.not_indexed = false;
			this.error = null;
		} catch (error) {
			if (is_not_indexed(error)) {
				this.not_indexed = true;
				this.documents = [];
			} else {
				this.error = error instanceof Error ? error.message : String(error);
			}
		} finally {
			this.loading = false;
		}
	}

	async reindex(): Promise<void> {
		this.reindexing = true;
		try {
			await api.reindex();
			await this.load();
			this.version += 1;
		} catch (error) {
			this.error = error instanceof Error ? error.message : String(error);
		} finally {
			this.reindexing = false;
		}
	}

	// Picks up an index rebuilt outside the UI.
	async check_for_changes(): Promise<void> {
		if (this.reindexing || document.visibilityState !== 'visible') return;
		try {
			const { status } = await api.status();
			if (status.indexed_at !== this.#indexed_at) {
				await this.load();
				this.version += 1;
			}
		} catch {
			// The next poll tries again.
		}
	}

	start_polling(): () => void {
		const timer = setInterval(
			() => void this.check_for_changes(),
			poll_interval_ms,
		);
		return () => clearInterval(timer);
	}

	title_for(path: string): string {
		return (
			this.documents.find((document) => document.path === path)?.title ??
			path
		);
	}
}

export const app = new AppState();
