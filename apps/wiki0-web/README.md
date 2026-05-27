# wiki0-web

SvelteKit web app for wiki0. This is the human-facing UI layer for browsing and working with wiki0 content; shared parsing/indexing logic should live in the workspace packages rather than in the app.

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
pnpm --filter wiki0-web check     # run Vite+ checks and svelte-check
pnpm --filter wiki0-web test      # run unit/component and e2e tests
```

## Tooling

- SvelteKit + Svelte 5
- Vite+ for dev/build/preview/lint/check
- Vitest + Playwright for tests
- Tailwind CSS via the Vite plugin
- mdsvex for Markdown/Svelte content

## Notes

This app is part of the wiki0 pnpm workspace. Prefer adding reusable wiki behavior to `packages/*` and importing it here, rather than coupling core logic to the web UI.
