# Changelog

Release dates describe actual work. Existing history is preserved; no commits or releases are backdated.

## Unreleased — Portfolio completion

- Complete public-channel workspace, responsive layout, search, pagination, reconnect/history merge, and signed guest sessions.
- Shared presence leases, message validation and rate limiting, readiness checks, metrics, and graceful connection cleanup.
- Repair simultaneous-join voice negotiation; verify two-peer audio and forced coturn relay.
- Add two-gateway Compose, hardened Helm deployment, multi-node kind workflow, optional HPA, ingress, GitOps and monitoring resources.
- Add backend integration and browser tests, measured fan-out, gateway replacement and dependency recovery experiments.
- Add actual screenshots, reproducible presentation fixtures, architecture decisions, threat model, and operational documentation.
- Upgrade the Nginx image after the CI scan rejected the previous version.

## v1.0.0 — Original prototype — 2026-08-25

The original release and tag remain unchanged. It introduced the early React/FastAPI chat prototype with PostgreSQL persistence and Redis coordination. Subsequent voice work and the portfolio engineering completion build on that history.
