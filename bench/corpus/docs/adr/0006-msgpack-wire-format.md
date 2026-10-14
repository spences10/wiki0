---
status: accepted
supersedes: [docs/adr/0002-json-wire-format.md]
---

# ADR 0006: MessagePack wire format

Clients and the broker exchange messages encoded with MessagePack.
Payloads are about 40% smaller than JSON and parse faster. A debug
endpoint still renders messages as JSON for humans.
