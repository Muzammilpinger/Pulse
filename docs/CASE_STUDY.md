# Pulse engineering case study

Pulse is a real-time communication demo built to make distributed-systems behavior visible. Its product surface is intentionally small: public channels, message history, presence, and two-person audio. The engineering work is in coordinating state across connections and services, recovering from faults, and measuring the result.

## The problem behind a simple conversation

A WebSocket belongs to the gateway process that accepted it. Once browsers connect to different replicas, an in-memory broadcast is no longer enough. Pulse commits each message to PostgreSQL, publishes its canonical ID through Redis, and lets each gateway deliver the event to its own clients. The browser merges history with live events by ID on reconnect.

This creates a deliberate tradeoff: a process can fail after the database commit but before publication. Redis Pub/Sub also does not replay lost events. The project documents that window rather than implying exactly-once delivery. A transactional outbox would be the next step if durable event delivery became a requirement.

## Presence is a lease, not a fact

A permanent set of online users leaves ghosts after a crash. Removing a name on every disconnect also mishandles multiple tabs. Pulse instead leases a distinct presence entry for each connection. A browser is shown the union of unexpired connections in its room. The result is shared, crash-tolerant presence with explicitly bounded staleness.

## Voice exposed a concurrency bug

The initial browser test found that nearly simultaneous joins could make both peers initiate offers. Signaling now records existing membership before awaiting network I/O and assigns exactly one offerer. The client queues early ICE candidates, reports failures, and stops media tracks on exit.

A separate forced-relay experiment checked selected ICE candidate types and received bytes. That proves the local coturn path was used. It does not prove traversal across every real-world NAT or establish subjective audio quality; the test uses synthetic browser microphones.

## Deployment is part of the implementation

The local stack starts two gateways so cross-instance behavior can be tested deterministically. The Helm chart carries readiness, liveness and startup probes, non-root security settings, a disruption budget, resources, network boundaries, and optional autoscaling. Stateful services remain small, single-instance demo components.

The scaling experiment first failed because the metrics API was unavailable after a local Docker/network restart. That failure was preserved. After repairing the test environment, the same workload drove the gateway from two to five replicas. Existing sockets stayed on their original pods, illustrating why adding replicas is not instant redistribution of active connections.

A deletion experiment attached a real browser to a gateway, deleted that exact pod, then checked reconnection, retained history, and another successful send. Redis and PostgreSQL restarts were tested separately. Their results include transient failures and recovery time rather than only a successful final screenshot.

## Security controls need negative tests

The demo checks that the allowed gateway-to-Redis path works, signaling-to-Redis is blocked, and the application service account cannot read Kubernetes secrets. Container image publication is gated by vulnerability scanning. The first scan rejected an outdated Nginx image; the image was upgraded rather than suppressing that finding.

Guest display names remain unverified aliases, all channels are public, and the demo has no claim of commercial identity, moderation, compliance, or database high availability. These boundaries are part of the design, not fine print hidden behind a “production-ready” label.

## What the repository demonstrates

The useful portfolio story is a chain of evidence: a small user flow, an explicit state model, independent replicas, automated tests, observed failures, a reproducible deployment, and documentation that matches the actual system. The raw reports and commands make that chain inspectable without relying on a presentation alone.
