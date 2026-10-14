import { prefersReducedMotion } from 'svelte/motion';
import type { Attachment } from 'svelte/attachments';

type RevealOptions = {
	/** Called when the set piece is held back below the fold */
	onhide?: () => void;
	/** Called when it scrolls into view */
	onshow?: () => void;
};

/**
 * Plays a set piece once, when it scrolls into view. Content is shown
 * by default, so the prerendered page, a page without JS and reduced
 * motion all get the finished state; only a set piece still below the
 * fold when the page loads is held back until it arrives.
 */
export class Reveal {
	seen = $state(true);
	#options: RevealOptions;

	constructor(options: RevealOptions = {}) {
		this.#options = options;
	}

	attach: Attachment<HTMLElement> = (element) => {
		if (prefersReducedMotion.current) return;
		if (element.getBoundingClientRect().top < window.innerHeight)
			return;
		this.seen = false;
		this.#options.onhide?.();
		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry?.isIntersecting) return;
				this.seen = true;
				this.#options.onshow?.();
				observer.disconnect();
			},
			// Plays once the set piece is a quarter of the way up the
			// screen, so it finishes while you are looking at it
			{ rootMargin: '0px 0px -25% 0px' },
		);
		observer.observe(element);
		return () => observer.disconnect();
	};
}
