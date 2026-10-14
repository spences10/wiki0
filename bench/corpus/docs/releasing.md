---
type: guide
---

# Releasing

1. Add a changeset describing the change.
2. Wait for CI to pass on `main`.
3. Run `pnpm release`, which versions packages, updates `CHANGELOG.md`
   and publishes.
4. Tag the release `vX.Y.Z` only after the publish succeeds.
