# Configuration

All settings can be passed as flags or as environment variables with
the `LANTERNFISH_` prefix.

## Batching

| Flag              | Env                         | Default | Meaning                        |
| ----------------- | --------------------------- | ------- | ------------------------------ |
| `--max-batch`     | `LANTERNFISH_MAX_BATCH`     | 500     | most messages sent per fetch   |
| `--batch-timeout` | `LANTERNFISH_BATCH_TIMEOUT` | 50ms    | how long a fetch waits to fill |

## Storage

| Flag         | Env                    | Default  |
| ------------ | ---------------------- | -------- |
| `--data-dir` | `LANTERNFISH_DATA_DIR` | `./data` |
