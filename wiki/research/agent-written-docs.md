---
title: Agent-written docs research
type: notes
date: 2026-10-21
---

# Agent-written docs research

Why coding agents pad docs, invent facts and let docs sprawl, and what
has measured effect. Gathered 2026-10-21. [read] means the primary
source was read; [snippet] means only a search result or abstract.

## Failure modes seen in wiki0 sessions

- Unmeasured number presented as data: a "768 lines read" counter on
  the landing page was the length of 16 hand-picked files.
- Copy that overstated the problem it solved ("opens every file …
  reads each one to the end").
- Lines with no content ("The current section of your Markdown, cited
  to the line.").
- Undefined labels in reports ("the gap", a decision number with no
  title).
- The answer to a question placed below unrelated status.

## Why models pad

- 70–90% of RLHF reward gains are explained by output length; a
  length-only reward matched standard RLHF (56% vs 58% win rate on
  WebGPT). [read] <https://arxiv.org/abs/2310.03716>
- LLM judges favour length; controlling for it raised AlpacaEval's
  correlation with Chatbot Arena from 0.94 to 0.98. [read]
  <https://arxiv.org/abs/2404.04475>
- Verbose answers go with uncertainty: GPT-4 was verbose 50.4% of the
  time, and verbose answers scored 27.61% lower on Qasper. [snippet]
  <https://arxiv.org/abs/2411.07858>
- Asked to improve a summary, Mistral 7B lengthened it in 59.4–75.1%
  of cases. [snippet] <https://arxiv.org/abs/2409.02569>
- GPT-4 and GPT-4o show a stronger bias to add rather than remove than
  humans do. [snippet]
  <https://www.nature.com/articles/s44271-026-00403-0>

## Why models invent specifics

- Training and grading reward guessing over saying "I don't know"; an
  argument, no measured fix. [read] <https://arxiv.org/abs/2509.04664>
- The best ALCE models lack full citation support on 50% of ELI5
  answers. [read] <https://arxiv.org/abs/2305.14627>

## Overcorrection when told to be brief

- "Answer briefly" cut hallucination resistance by up to 20% (Phare
  benchmark). [read]
  <https://www.giskard.ai/knowledge/good-answers-are-not-necessarily-factual-answers-an-analysis-of-hallucination-in-leading-llms>
- Examples: Gemini 1.5 Pro 84% to 64%, GPT-4o 74% to 63%; Claude 3.5
  and 3.7 Sonnet stayed largely stable. [snippet]
  <https://the-decoder.com/confident-user-prompts-make-llms-more-likely-to-hallucinate/>
- GPT-4 Turbo broke "at most N words" almost 50% of the time. [read]
  <https://arxiv.org/abs/2406.17744>
- Larger models did worse on negated ("don't") prompts. [read]
  <https://arxiv.org/abs/2209.12711>
- No study found on undefined labels or shorthand under brevity
  instructions.

## What has measured effect

- Verify then revise: FactScore precision 55.9 to 71.4, facts per
  answer 16.6 to 12.3. [read] <https://arxiv.org/abs/2309.11495>
- Self-correction with no outside feedback did not help reasoning.
  [snippet] <https://arxiv.org/abs/2310.01798>
- Prompting to ground in a named source raised verbatim grounding.
  [read] <https://arxiv.org/abs/2305.13252>
- Lint feedback looped back to GPT-4o cut readability violations from
  over 80% to 11% within 10 rounds. [read, abstract]
  <https://arxiv.org/html/2508.14419>
- Counter-evidence (code): shown lint warnings, top models cleared
  about 90% of them but about a third of working files then failed
  tests, against 5% with warnings withheld. Fixes were often large
  rewrites. [read, secondary]
  <https://theintelligentcommit.com/research/showing-the-model-the-warnings-is-what-broke-the-code/>
- Structured feedback repairs better than unstructured; gains flatten
  after 2–3 rounds. [read, abstract]
  <https://doi.org/10.48550/arxiv.2504.06939>

## Context files (AGENTS.md, CLAUDE.md)

- LLM-generated context files: success −0.5% (SWE-bench) and −2% (not
  significant), cost +20–23%. Developer-written files: +2.4% (not
  significant), 7% better than generated ones (p=0.038). [read]
  <https://arxiv.org/html/2602.11988v3>
- Same study: agents follow the files; repository overviews did not
  help; files should state only minimal requirements. [read]
- An AGENTS.md went with 28.64% lower median runtime and 16.58% fewer
  output tokens (10 repos, 124 PRs). [read]
  <https://arxiv.org/html/2601.20404>
- Context strategy did not measurably change correctness over 288
  Claude Code and Codex runs. [read]
  <https://arxiv.org/abs/2607.27250>
- Best frontier model: 68% accuracy at 500 simultaneous instructions;
  earlier instructions win. [read] <https://arxiv.org/abs/2507.11538>
- Claude Code docs: keep CLAUDE.md under 200 lines; use hooks to
  enforce. [read] <https://code.claude.com/docs/en/memory>

## MCP guidance channels

- `instructions` is a hint clients MAY add; the 2026-07-28 spec moves
  it to `server/discover`. [read]
  <https://dev.to/rulestack/20-of-20-runs-sent-serverdiscover-to-our-stdio-mcp-server-off-by-default-per-the-docs-and-its-12m2>
- Claude Code 2.1.285 injects `instructions` in the first user turn
  and truncates at 2,048 characters
  (`CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH`). [read] same source
- Claude.ai web drops `instructions`. [read]
  <https://github.com/anthropics/claude-ai-mcp/issues/131>
- Claude Desktop stores but never reads them; Claude Code subagents do
  not receive them. [read]
  <https://github.com/anthropics/claude-code/issues/43749>
- VS Code, ChatGPT and Codex support `instructions`; OpenAI advises
  key details in the first 512 characters. [read]
  <https://code.visualstudio.com/api/extension-guides/ai/mcp>,
  <https://developers.openai.com/plugins/build/mcp-server>
- No source confirms Cursor support. [read]
  <https://canmyagentuse.com/features/mcp-server-instructions>
- MCP prompts are user-selected, so not an automatic channel. [read]
  <https://github.com/microsoft/vscode/issues/250017>

## Docs-for-agents tools

- llms.txt is rarely fetched: 0.1% of 62,100 AI-bot hits; 97% of 137K
  files never fetched. [snippet]
  <https://otterly.ai/blog/the-llms-txt-experiment>,
  <https://ahrefs.com/blog/llmstxt-study>
- Context7: 59% current-API-only responses (vendor test); a
  third-party test saw accuracy fall from 73.8% to 59%. [read]
  <https://upstash.com/blog/context7-vs-exa>,
  <https://dzone.com/articles/testing-context7-with-zk-documentation>

## Sprawl fixes with numbers

- Archive history and check each claim against code: required reading
  1,085 to 266 lines. [read] <https://github.com/aka-luan/doc-cleanup>
- 317 agent artifacts across 14 repos, 54% stale or orphaned. [read]
  <https://github.com/szp2005/mdsweep>
- Archiving cut active docs from about 150 to 60; cause: each session
  creates docs instead of consolidating. [read]
  <https://github.com/Aman-CERP/amanmcp/blob/main/docs/articles/ai-native-documentation-lessons.md>
- 39 files and 13,155 lines deleted, mostly review transcripts. [read]
  <https://venturecrane.com/log/2026-02-14-docs-cleanup/>
- All AI-written docs deleted after the AI edited code to match stale
  docs. [read]
  <https://blog.lukasjhan.com/i-deleted-every-document-the-ai-had-written>

## Prose linters in practice

- Proselint scores rules by penalising false positives and ignoring
  false negatives. [read]
  <https://suchow.io/assets/docs/pacer2016proselint.pdf>
- Crossplane: 7 Vale packages gave about 11,000 violations; authors
  added ignore comments everywhere. [read]
  <https://github.com/crossplane/docs/issues/1029>
- Teams turn off write-good TooWordy, Weasel, E-Prime and Microsoft
  Wordiness as too noisy. [read]
  <https://github.com/smallstep/docs/blob/main/.vale.ini>,
  <https://github.com/seqeralabs/docs/blob/master/.vale.ini>
- GitLab blocks only on error-level Vale rules. [read]
  <https://docs.gitlab.com/development/documentation/testing/vale/>

## AI-tell linters

- Antislop finds over-used n-grams against a human baseline; lists are
  domain-specific. [read] <https://arxiv.org/html/2510.15061v2>
- vale-ai-tells keeps only phrases with zero hits in seven pre-LLM
  corpora. [read] <https://github.com/tbhb/vale-ai-tells>
- slop-linter requires zero alerts on clean technical writing and has
  an "unsourced brag metric" rule. [read]
  <https://github.com/thrash-d/slop-linter>
- textlint-ja preset-ai-writing runs as write, check over MCP, revise.
  [read]
  <https://github.com/textlint-ja/textlint-rule-preset-ai-writing>

## Claim, definition and freshness checks

- Vale `conditional` checks require an acronym to be defined; Google's
  version exempts about 60 common ones. [read]
  <https://vale.sh/docs/checks/conditional>
- Verbatim quote check: normalise, then exact substring; claims with
  digits always go to review. [read]
  <https://www.vaquill.ai/engineering/verify-ai-citations-in-code>
- `last_verified:` frontmatter, warn at 90 days, fail at 180. [read]
  <https://github.com/RatesEngine/rates-engine/blob/main/docs/architecture/repo-hygiene-plan.md>
- `sources:` frontmatter compared with stored git SHAs of cited files.
  [read]
  <https://skillsmp.com/creators/hmcts/cft-workspace/claude-skills-docs-drift>

## Duplicate sections

- SimHash on 3-word shingles, Hamming ≤ 6, skipping blocks under 60
  characters or 2 lines. [read]
  <https://github.com/dPeluChe/trs/blob/main/docs/features/audit-docs.md>
- Verbatim paragraphs repeated across files, minimum 200 characters.
  [read] <https://mdsmith.dev/rules/mds037-duplicated-content/>
- Embedding cosine plus lexical Jaccard, floor 0.7; title-only matches
  never count. [read]
  <https://glama.ai/mcp/servers/jgravelle/jdocmunch-mcp/tools/find_similar_sections>
