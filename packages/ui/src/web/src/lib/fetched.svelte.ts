/**
 * The result of one request, as reactive state. Create it inside a
 * `$derived.by` so a new request starts when the derived's inputs
 * change; the old instance is dropped, so a late response for stale
 * inputs never shows. Pass the previous instance to keep showing its
 * value while this request loads.
 */
export class Fetched<T> {
	#result = $state.raw<{ value: T } | null>(null);
	#previous: Fetched<T> | null;
	error = $state<unknown>(null);
	loading = $state(true);

	constructor(
		request: Promise<T>,
		previous: Fetched<T> | null = null,
	) {
		this.#previous = previous;
		request
			.then((value) => {
				this.#result = { value };
			})
			.catch((caught: unknown) => {
				this.error = caught;
			})
			.finally(() => {
				this.#previous = null;
				this.loading = false;
			});
	}

	get value(): T | null {
		if (this.#result) return this.#result.value;
		if (this.error) return null;
		return this.#previous?.value ?? null;
	}
}
