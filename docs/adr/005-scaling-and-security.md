# ADR 005 — Measured scaling and bounded privileges

**Status:** accepted.

CPU HPA is included as a baseline because it works with metrics-server and resource requests. Idle sockets consume little CPU, so connection capacity cannot be inferred from that metric. A real capacity study should establish safe connections per pod, memory per socket, event-loop latency, and Redis/PostgreSQL saturation before adopting a custom scaling metric.

Application pods run non-root with no Kubernetes API token, no capabilities, and read-only filesystems. NetworkPolicies express intended traffic boundaries, but require an enforcing CNI and negative tests. A YAML file alone is not security evidence. Optional Kyverno policy checks resource bounds; namespace Pod Security enforces container restrictions.
