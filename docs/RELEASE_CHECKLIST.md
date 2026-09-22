# v3.0 release evidence checklist

The attached roadmap is the scope reference. A checked item requires a recorded test, screenshot, or reproducible command. Historical v1.0.0 is preserved; new releases do not rewrite its date or history.

- [x] Signed guest sessions, public rooms, durable history, input validation
- [x] Cross-instance messaging, expiring shared presence, duplicate event IDs
- [x] Browser chat, persistence, mobile layout, two-peer voice tests
- [x] Forced TURN relay with selected candidate types and received byte counts
- [x] Multi-pod Helm installation and cross-pod integration tests
- [x] Non-root workloads, restricted namespace, NetworkPolicy and RBAC negative checks
- [x] Real screenshots and repeatable screenshot fixture script
- [x] 20/50/100-client local fan-out measurements
- [x] Gateway deletion and Redis/PostgreSQL recovery observations
- [x] Green CI including image scans and immutable GHCR publication
- [x] Ingress WebSocket routing verified
- [x] Measured HPA scaling with healthy metrics API
- [x] GitOps desired-state reconciliation and rollback verified
- [x] Kyverno rejection and Sealed Secrets round trip verified
- [x] Monitoring screenshot and alert behavior verified
- [x] Node drain and signaling/TURN failure observations
- [x] Fresh setup, full final regression run, and secret scan
- [x] Final README, case study, walkthrough and short clip prepared for the v3.0 release

Release publication and attached media are tracked on the [GitHub release page](https://github.com/Muzammilpinger/Pulse/releases/tag/v3.0.0). The original v1.0.0 tag remains untouched.

The first resumed scaling run delivered 92,800 events but **did not demonstrate scaling** because the metrics API was unavailable after the local Docker restart. That observation is preserved. Two later healthy-metrics runs delivered the same 92,800 events and demonstrated scaling to five replicas.
