# wiki0-web

SvelteKit web app for wiki0. This is the human-facing UI layer for
browsing and working with wiki0 content; shared parsing/indexing logic
should live in the workspace packages rather than in the app.

## Development

From the repository root:

```sh
pnpm install
pnpm --filter wiki0-web dev
```

Open the local URL printed by Vite.

## Scripts

```sh
pnpm --filter wiki0-web dev       # start the Vite dev server
pnpm --filter wiki0-web build     # build for production
pnpm --filter wiki0-web preview   # preview the production build
pnpm --filter wiki0-web lint      # run Vite+ lint
pnpm --filter wiki0-web check     # run svelte-check with TypeScript 7
pnpm --filter wiki0-web test      # run unit/component and e2e tests
pnpm --filter wiki0-web share-cards # render static/og/*.png
```

## Share cards

Each page's link-preview image is a PNG in `static/og`, rendered by
`scripts/generate-share-cards.ts` with resvg in the site's fonts and
colours. Head tags and JSON-LD come from svead, through
`src/lib/components/seo.svelte`. Run `share-cards` again and commit
the PNG when the headline, the cited section in
`src/lib/data/show.json` or the look of the hero changes.

## Tooling

- SvelteKit + Svelte 5
- Vite+ for dev/build/preview, workspace linting, and unit tests
- svelte-check with the TypeScript 7 native checker
- Vitest + Playwright for tests
- Tailwind CSS via the Vite plugin
- mdsvex for Markdown/Svelte content

## Notes

This app is part of the wiki0 pnpm workspace. Prefer adding reusable
wiki behavior to `packages/*` and importing it here, rather than
coupling core logic to the web UI.
