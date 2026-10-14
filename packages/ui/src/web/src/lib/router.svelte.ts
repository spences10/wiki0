import {
	is_app_navigation,
	parse_route,
	type Route,
} from './router.js';

class Router {
	url = $state(new URL(window.location.href));
	route: Route = $derived(parse_route(this.url));

	navigate(href: string, { replace = false } = {}): void {
		const next = new URL(href, window.location.href);
		const same_page =
			next.pathname === this.url.pathname &&
			next.search === this.url.search;
		if (replace) history.replaceState(null, '', next);
		else history.pushState(null, '', next);
		this.url = next;
		if (!same_page && !next.hash) window.scrollTo({ top: 0 });
	}

	// Keeps the route in step with back and forward, and with plain
	// `#heading` links the browser follows on its own.
	sync = (): void => {
		this.url = new URL(window.location.href);
	};

	handle_click = (event: MouseEvent): void => {
		const target = event.target;
		if (!(target instanceof Element)) return;
		const anchor = target.closest('a');
		if (
			!anchor ||
			!is_app_navigation(event, anchor, window.location.origin)
		) {
			return;
		}
		event.preventDefault();
		this.navigate(anchor.href);
	};
}

export const router = new Router();
