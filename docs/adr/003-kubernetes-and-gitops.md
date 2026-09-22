# ADR 003 — Helm and a single desired-state repository

**Status:** accepted.

The portfolio demonstrates operating a stateful-connection service across replicas, so Kubernetes is purposeful here even though Compose is sufficient for local use. Helm provides image, resource, origin, ingress and replica configuration. The generated raw manifests remain available as an inspection reference.

The ArgoCD Application points at this repository rather than adding a second repository solely for appearance. Successful CI publishes commit-SHA image tags. Desired-state updates explicitly select those tags. Secrets are provisioned externally. Manual sync and disabled automated prune keep desired-state changes reviewable. The checked-in image tags point to a successful published build; subsequent updates repeat that verification.

Signaling and the database remain single-instance. Gateway WebSockets do not need sticky sessions: the existing socket is already tied to one backend, and Redis bridges gateways.
