# Key rotation

## Rotate the signing keys

1. Run `lanternfish keys rotate --dry-run` and check the output.
2. Run `lanternfish keys rotate`.
3. Restart brokers one at a time; each picks up the new key on start.
4. After 24 hours, run `lanternfish keys prune` to remove the old key.
