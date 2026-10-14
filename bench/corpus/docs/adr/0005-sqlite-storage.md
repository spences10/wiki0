---
status: accepted
date: 2026-03-20
---

# ADR 0005: SQLite for message storage

Messages are stored in SQLite in WAL mode, one database file per
topic. Postgres was considered and rejected: a single broker never
needs a network database, and SQLite keeps backups to one file copy.
