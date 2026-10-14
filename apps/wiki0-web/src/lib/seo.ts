import type { SchemaOrgProps, SeoConfig } from 'svead';
import { share_card_url, site } from './site.js';

type Schema = Extract<SchemaOrgProps['schema'], unknown[]>;

export interface PageSeo {
	title: string;
	description: string;
	/** From the root, e.g. `/`. */
	path: string;
	/** The page's card in static/og, without the extension */
	card: string;
	card_alt: string;
}

const absolute = (path: string) => `${site.url}${path}`;

/** Everything svead's Head needs, the per-page parts filled in */
export function seo_config(page: PageSeo): SeoConfig {
	return {
		title: page.title,
		description: page.description,
		url: absolute(page.path),
		// twitter:domain, so the host rather than the origin
		website: new URL(site.url).host,
		language: 'en_GB',
		site_name: site.name,
		author_name: site.author.name,
		twitter_handle: site.author.twitter,
		twitter_card_type: 'summary_large_image',
		open_graph_image: share_card_url(page.card),
		open_graph_image_alt: page.card_alt,
	};
}

// Nodes refer to each other by @id, so the graph reads as one site
// made by one person about one piece of software
const ids = {
	website: `${site.url}/#website`,
	author: `${site.url}/#author`,
	software: `${site.url}/#software`,
	source: `${site.url}/#source`,
};

const author = {
	'@type': 'Person',
	'@id': ids.author,
	name: site.author.name,
	url: site.author.url,
	sameAs: [`https://x.com/${site.author.twitter.slice(1)}`],
} as const;

export const home_seo: PageSeo = {
	title: site.title,
	description: site.description,
	path: '/',
	card: 'home',
	card_alt:
		'Docs search for your coding agent. wiki0, beside an editor showing the lines of a decision record it cited.',
};

/** The site, the page, the CLI and its source */
export function home_schema(): Schema {
	const page = home_seo;
	const url = absolute(page.path);
	const card = share_card_url(page.card);

	return [
		author,
		{
			'@type': 'WebSite',
			'@id': ids.website,
			name: site.name,
			url,
			description: site.description,
			inLanguage: 'en-GB',
			publisher: { '@id': ids.author },
		},
		{
			'@type': 'WebPage',
			'@id': `${url}#webpage`,
			name: page.title,
			description: page.description,
			url,
			inLanguage: 'en-GB',
			isPartOf: { '@id': ids.website },
			about: { '@id': ids.software },
			primaryImageOfPage: {
				'@type': 'ImageObject',
				url: card,
				width: `${site.share_card.width}`,
				height: `${site.share_card.height}`,
				caption: page.card_alt,
			},
		},
		{
			'@type': 'SoftwareApplication',
			'@id': ids.software,
			name: site.name,
			description: site.description,
			url,
			image: card,
			applicationCategory: 'DeveloperApplication',
			applicationSubCategory: 'Documentation search',
			operatingSystem: 'Linux, macOS, Windows',
			softwareRequirements: 'Node.js 24.15 or later',
			downloadUrl: site.npm,
			license: 'https://opensource.org/licenses/MIT',
			isAccessibleForFree: true,
			offers: {
				'@type': 'Offer',
				price: '0',
				priceCurrency: 'USD',
			},
			author: { '@id': ids.author },
			sameAs: [site.repo, site.npm],
		},
		{
			'@type': 'SoftwareSourceCode',
			'@id': ids.source,
			name: site.name,
			codeRepository: site.repo,
			programmingLanguage: 'TypeScript',
			runtimePlatform: 'Node.js',
			license: 'https://opensource.org/licenses/MIT',
			author: { '@id': ids.author },
			targetProduct: { '@id': ids.software },
		},
	];
}
