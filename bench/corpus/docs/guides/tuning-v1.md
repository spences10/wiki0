---
status: archived
---

# Tuning guide (v1)

For high throughput, raise `--batch-size` to 1000 and lower the poll
interval. Larger batches trade latency for throughput.
