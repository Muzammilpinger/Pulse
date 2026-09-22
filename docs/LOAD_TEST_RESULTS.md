# Load and recovery results

These are local engineering experiments, not internet-scale capacity claims. Raw results are in [`evidence/`](evidence/).

## Fan-out workload

Two independent Compose gateways shared one Redis and one PostgreSQL instance on Docker Desktop, on macOS arm64. The client generator ran on the host. Each run opened the stated number of WebSockets split between ports 8001 and 8011. One sender published 10 messages, paced 550 ms apart; every connected client had to receive every message. Latency is sender-to-receive elapsed wall time and includes client scheduling.

| Clients | Expected / received deliveries | p50 | p95 | Maximum | Errors |
|---:|---:|---:|---:|---:|---:|
| 20 | 200 / 200 | 6.15 ms | 88.76 ms | 88.87 ms | 0 |
| 50 | 500 / 500 | 8.19 ms | 23.35 ms | 23.42 ms | 0 |
| 50, repeat | 500 / 500 | 9.48 ms | 20.80 ms | 22.44 ms | 0 |
| 100 | 1,000 / 1,000 | 10.63 ms | 21.16 ms | 22.30 ms | 0 |

The smaller run's larger tail illustrates warm-up and background contention. These short, deliberately paced runs establish correctness under fan-out, not maximum throughput. They do not establish an SLO, saturation point, geographically distributed latency, or database high availability.

Reproduce with `.venv/bin/python scripts/load.py --clients 100 --messages 10`. A failure raises an error; a successful JSON report is emitted only after every expected receipt.

## Recovery observations

| Experiment | Observed impact | Recovery | Evidence |
|---|---|---|---|
| Delete the browser's gateway pod | Socket detached; browser reconnected to another pod | 7.878 s; old message visible, new send succeeded | `gateway-recovery.json` |
| Stop/start Redis | Readiness returned 503; first post-ready application probe encountered a transient connection failure | Chat passed on probe 2, 3.92 s from stop | `dependency-recovery.json` |
| Stop/start PostgreSQL | Readiness returned 503 | Chat passed on probe 1, 1.42 s from stop | `dependency-recovery.json` |
| Forced TURN | Both local browsers selected relay candidates | Both reported connected and received media bytes | `turn-relay.json` |

The Redis experiment shows why a healthy endpoint is not a guarantee that every pre-existing pooled connection is already usable. The browser's reconnect path handles transient closes. Neither restart deleted volumes or corrupted data.

## Scope and limitations

The Kubernetes demo has one control plane, two workers, a single PostgreSQL volume, and single Redis/signaling instances. Gateway CPU requests are 100m, limits 500m; memory requests 128 MiB, limits 256 MiB. The HPA mechanics experiment uses a deliberately sensitive 25% CPU target and must not be described as capacity planning.

A complete Redis outage loses live Pub/Sub events. PostgreSQL history remains the catch-up source. The commit/publish gap is documented in the architecture decision record. Existing sockets stay on their original pods when new replicas are added.
