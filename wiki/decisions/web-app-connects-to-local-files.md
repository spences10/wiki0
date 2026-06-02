# Web app connects to local files

Status: proposed

## Context

The previous `wiki0 serve` direction makes the CLI responsible for
hosting the web UI, refreshing the index, and bridging local files
into a browser. That crosses package boundaries and makes the optional
web app depend on CLI/server behavior.

## Decision

Move `apps/wiki0-web` toward a browser-first model: the web app should
ask the user to choose a local wiki folder and then assess that folder
in the browser.

## Implementation notes

- Use the browser File System Access API where available for selecting
  a local wiki directory.
- Treat Markdown files as the source of truth.
- Build an in-browser assessment from `wiki/**/*.md`: page count,
  links, unresolved links, backlinks, graph data, search candidates,
  and review flags.
- Keep SQLite/index loading as an advanced or future option, not
  normal onboarding.
- Remove server load behavior that infers roots from `process.cwd()`,
  `WIKI0_ROOT`, or `?root=` for hosted use.
- Do not make the CLI serve or bundle the web UI for the first
  production path.

## Open questions

- What fallback should exist for browsers without directory picker
  support?
- Should users be able to import a zipped wiki as a fallback?
- Which checks belong in the first assessment report versus later
  graph/search features?
