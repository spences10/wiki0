# @wiki0/cli

Command line interface for wiki0 local-first Markdown wiki memory.

## Install

```sh
pnpm add -g @wiki0/cli
```

The package exposes the `wiki0` binary.

## Commands

```sh
wiki0 init ./my-wiki
wiki0 page create "projects/wiki0" --body "Local-first [[topics/memory]]." --root ./my-wiki
wiki0 plan --sourceType codebase --scope "current repository" --sources README.md,package.json
wiki0 bootstrap --sourceType docs --scope "docs folder" --sources docs/guide.md --ingestSources --root ./my-wiki
wiki0 index --root ./my-wiki
wiki0 status --root ./my-wiki
wiki0 search "memory" --root ./my-wiki
wiki0 context "what is wiki0?" --root ./my-wiki
wiki0 show topics/memory.md:12 --root ./my-wiki
wiki0 lint --root ./my-wiki
wiki0 graph --root ./my-wiki
wiki0 facts add "Markdown is source of truth" --category decision --confidence high --root ./my-wiki
wiki0 facts list --root ./my-wiki
wiki0 review --root ./my-wiki
```

## Output

Most commands return JSON so agents and shell scripts can consume the
results. `wiki0 context` returns Markdown by default and supports
`--json` for structured output.
