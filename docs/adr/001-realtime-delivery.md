# ADR 001 — Redis Pub/Sub and PostgreSQL

**Status:** accepted.

Each WebSocket belongs to a single gateway process. Independent gateways need a shared fan-out path, while reconnecting clients need durable history. Redis Pub/Sub keeps live distribution small and fast; PostgreSQL gives messages durable IDs and a queryable order.

We accept an explicit commit/publish gap, at-most-once live fan-out, and no offline event replay. The browser deduplicates canonical IDs and merges recent history on reconnect. A transactional outbox and durable stream would close this gap at the cost of additional workers, retention, and consumer coordination. That is a future delivery-guarantee change, not something the current architecture claims.
