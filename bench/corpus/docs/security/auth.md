---
status: accepted
---

# Authentication

Clients authenticate with mutual TLS. Each client gets a certificate
signed by the Lanternfish CA; the broker rejects connections without
one. The admin API is only reachable from localhost and needs no
separate login.
