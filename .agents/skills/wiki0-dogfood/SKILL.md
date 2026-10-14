---
# prettier-ignore
name: wiki0-dogfood
description: Use wiki0 on this repo's own docs. Trigger when answering questions from the docs, editing Markdown in wiki/ or docs/, or checking links.
---

# wiki0 dogfooding

Build the CLI first: `pnpm --filter "./packages/*" run build:self`.

## Finding information

1. `node packages/cli/dist/index.js search "<question>"` to find the
   cited section.
2. `node packages/cli/dist/index.js show <citation>` to read it.
3. Read the full file only when the section is not enough.

## After editing Markdown

1. `node packages/cli/dist/index.js index`
2. `node packages/cli/dist/index.js lint` and fix any errors it
   reports.

If wiki0 gives a wrong or missing result, note the query and what you
expected; that is a bug to fix in the package, not a doc problem.
