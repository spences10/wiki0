# MCP

The wiki0 MCP server is the agent-facing interface for reading,
writing, searching, and reviewing wiki memory.

## Responsibilities

- Let agents search and retrieve relevant wiki context.
- Let agents create and update pages using explicit Markdown files.
- Preserve citations and backlinks so memory remains inspectable.
- Scope every session to a selected wiki root.

## Packaging

The MCP server should be published to npm and depend on
[[packages/core]].
