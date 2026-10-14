# Benchmarks

`corpus/` is a made-up project ("Lanternfish") with planted traps:
superseded ADRs, a renamed flag, meeting notes that contradict a later
decision, an outdated FAQ, a question the docs cannot answer, and a
question worded differently from its answer. `tasks.json` lists each
question with the expected answer, the authoritative file and any
stale files.

## Retrieval (free, deterministic)

```sh
pnpm bench:retrieval
```

Runs each question through `search` and reports hit@1, MRR@5 and how
often a stale document ranks above the authoritative one. Run it after
any ranking change.

## Agent (uses Claude usage)

```sh
pnpm bench:agent -- --reps 3 --model claude-sonnet-5-5
```

Runs `claude -p` per task with two tool sets: grep-only (`Read`,
`Grep`, `Glob`) and wiki0 (`Read` plus the MCP search, show and
context tools). Reports correctness, whether the authoritative file
was cited, how often a stale file led to a wrong answer, and median
tokens, cache reads, cost and turns. Raw runs go to `results/`
(ignored by git).

The corpus is small and written for these tasks, so a perfect
retrieval score means no regressions, not that ranking is solved. Add
tasks whenever a real search goes wrong.

## Another corpus

Both scripts take `--corpus <dir> --tasks <file>` to run against
another project's git-tracked Markdown with your own task file in the
same format as `tasks.json`. Keep task files for private projects
outside this repo.
