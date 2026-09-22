# Changelog

Release dates describe actual work. Existing history is preserved; no commits or releases are backdated.

## v3.0.0 — Portfolio release — 2026-09-23

- Complete public-channel workspace, responsive layout, search, pagination, reconnect/history merge, and signed guest sessions.
- Shared presence leases, message validation and rate limiting, readiness checks, metrics, and graceful connection cleanup.
- Repair simultaneous-join voice negotiation; verify two-peer audio and forced coturn relay.
- Add two-gateway Compose, hardened Helm deployment, multi-node kind workflow, optional HPA, ingress, GitOps and monitoring resources.
- Add backend integration and browser tests, measured fan-out, gateway replacement and dependency recovery experiments.
- Add actual screenshots, reproducible presentation fixtures, architecture decisions, threat model, and operational documentation.
- Upgrade the Nginx image after the CI scan rejected the previous version.

### Verified engineering milestones

- **Chat and voice:** `4919316` completed the workspace, shared leases, two-gateway behavior, and two-peer calls (roadmap v0.1–v1.5).
- **Delivery and security:** `1b4c5fa` introduced the platform; `484b454` and `c33d292` corrected recovery and scan findings; `d87fab9` pinned the first verified delivery images (v2.0).
- **Measured recovery:** `6e46825` recorded scaling/load/recovery evidence; `fdae07c` added observed GitOps repair, node drain, alert behavior, voice failures, and peer outcome metrics (v2.5).
- **Presentation:** v3.0 packages the results, screenshots, silent captioned walkthrough, short clip, and reproducible experiment scripts. Milestones were not backdated or given invented historical releases.

## v1.0.0 — Original prototype — 2026-08-25

The original release and tag remain unchanged. It introduced the early React/FastAPI chat prototype with PostgreSQL persistence and Redis coordination. Subsequent voice work and the portfolio engineering completion build on that history.
