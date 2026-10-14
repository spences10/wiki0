# Agent instructions

## Rules

- Do not commit, push or create a changeset unless asked. Stop after
  validation so the change can be reviewed.
- Run `pnpm verify` before reporting work as done. Report failures; do
  not weaken checks to get a green result.
- After changing Markdown docs, run wiki0's own `index` and `lint` on
  this repo and fix the errors it reports.
- Changesets cover changes to the published packages' behaviour or
  runtime dependencies only.
- wiki0 must never write to the files it indexes; only the index is
  written.
- Keep Vite, Vitest and the browser provider on the exact versions the
  current `vite-plus` bundles, and import test APIs from
  `vite-plus/test`.
- Do not loosen the supply-chain settings in `pnpm-workspace.yaml`
  (release age, exclusions, peer rules, build allowlist), including
  when `vp migrate` proposes it.
- Apply dependency updates on `main`. Leave Renovate PRs alone;
  Renovate closes them itself.
- Keep each skill's frontmatter `description` on one line.

## Skills

Project skills live in `.agents/skills/<name>/SKILL.md`. Load the
matching skill before starting the task.
