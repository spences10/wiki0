---
status: superseded
superseded_by: docs/adr/0007-deploy-with-coolify.md
---

# ADR 0003: Deploy with GitHub Actions

The service is deployed by a GitHub Actions workflow that builds a
container image and pushes it to the production VM over SSH.
