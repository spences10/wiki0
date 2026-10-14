// What the head tags and the share card say about the site. Pages are
// prerendered, so URLs are built from the production origin.
export const site = {
	name: 'wiki0',
	url: 'https://wiki0.app',
	title: 'wiki0: docs search for your coding agent',
	description:
		'wiki0 indexes the Markdown in your repo so your coding agent gets back the relevant, current section with its file and line, instead of reading every file.',
	repo: 'https://github.com/spences10/wiki0',
	npm: 'https://www.npmjs.com/package/@wiki0/cli',
	// Made by `pnpm run share-cards`, one per page in static/og
	share_card: { width: 1200, height: 630 },
	author: {
		name: 'Scott Spence',
		url: 'https://scottspence.com',
		twitter: '@spences10',
	},
};

/** The link-preview card for a page, named as in static/og */
export const share_card_url = (name: string) =>
	`${site.url}/og/${name}.png`;
