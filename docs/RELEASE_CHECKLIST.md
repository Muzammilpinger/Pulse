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
- [ ] Green CI including image scans and immutable GHCR publication
- [ ] Ingress WebSocket routing verified
- [ ] Measured HPA scaling with healthy metrics API
- [ ] GitOps desired-state reconciliation and rollback verified
- [ ] Kyverno rejection and Sealed Secrets round trip verified
- [ ] Monitoring screenshot and alert behavior verified
- [ ] Node drain and signaling/TURN failure observations
- [ ] Fresh setup, full final regression run, and secret scan
- [ ] Final README, case study, walkthrough video, and v3.0 tag/release

The first resumed scaling run delivered 92,800 events but **did not demonstrate scaling** because the metrics API was unavailable after the local Docker restart. Preserve that observation and rerun after repairing the local cluster; do not count configuration alone as proof.
