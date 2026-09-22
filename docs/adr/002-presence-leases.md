# ADR 002 — Presence is a connection lease

**Status:** accepted.

A process-local user set loses cross-instance visibility; a permanent Redis set leaves ghosts after crashes and incorrectly removes users with multiple tabs. Each connection therefore gets a unique sorted-set member and an expiry score. Browsers receive snapshots every 10 seconds; 35-second leases expire crashed connections. Inactive room keys expire after 70 seconds.

The tradeoff is bounded staleness, periodic Redis work, and wall-clock dependence. Presence is a best-effort UX hint, never authorization or a durable business record.
