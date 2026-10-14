---
status: accepted
supersedes: [docs/adr/0003-deploy-with-github-actions.md]
---

# ADR 0007: Deploy with Coolify

The service is deployed with Coolify. Pushing to `main` triggers a
Coolify build from the Dockerfile; Coolify runs the health check at
`/healthz` before switching traffic.
