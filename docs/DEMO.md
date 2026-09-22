# Portfolio walkthrough

## Thirty seconds

“Pulse is a real-time workspace built with React, FastAPI, PostgreSQL, and Redis. Two gateway replicas can serve different people in the same conversation. I built reconnect/history recovery, expiring shared presence, a two-peer voice flow, container delivery, and a Helm deployment. The repository includes tests and measured local fan-out results, with limitations called out explicitly.”

## Three minutes

1. Open the landing page and enter a guest display name. Explain public, unverified guest identity.
2. Open a second browser session. Send a message and refresh to show durable history.
3. Show `tests/test_integration.py`: its two clients target different gateway ports and assert different instance IDs.
4. Open the Grafana operations dashboard. Explain active connections, persisted message rate, errors, and persistence latency.
5. Show Kubernetes pods and the gateway disruption budget. Delete one demo gateway pod; observe readiness/reconnection and replacement.
6. Join voice from both browsers. Explain signaling versus direct media, and distinguish local fake-microphone tests from TURN proof.
7. Finish on the delivery diagram and limitations: guest aliases, Pub/Sub loss window, single database/signaling, local benchmark scope.

## Fifteen minutes

Add the ADRs, message commit/publish failure window, multiple-tab presence leases, startup/readiness behavior, HPA metric choice, network-policy enforcement prerequisites, dependency scanning, rollback, and raw test reports. Explain what was observed and what remains an environment-specific exercise.

## Reproducing screenshots

`scripts/screenshots.cjs` creates a sample conversation through the real API, keeps real browser sessions online, and captures the landing page, workspace, and mobile view. It is presentation fixture data, not a claim of real users. Run after Compose startup with the client dependencies installed. Images are committed under `docs/images`.
