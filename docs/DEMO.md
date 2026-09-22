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

## Recorded release assets

The [v3.0.0 release](https://github.com/Muzammilpinger/Pulse/releases/tag/v3.0.0) includes:

- `pulse-walkthrough.mp4`: a 2–4 minute silent, captioned recording of actual chat, refresh/history, two-peer voice, Grafana and Argo CD. Synthetic microphones are disclosed.
- `pulse-short.mp4`: a 45-second portfolio excerpt.
- `pulse-scaling.mp4`: live Kubernetes observations during the real 80-socket workload. The display reads the cluster API; it does not simulate scaling.
- `pulse-recovery.mp4`: the real browser during deletion of its attached gateway, followed by history and a new message.

Reproduce with `node scripts/record-demo.cjs`, `node scripts/record-scaling.cjs`, and `PULSE_RECORD=1 PULSE_URL=http://localhost:8089 node scripts/chaos.cjs`. The first needs Compose, Grafana and the forwarded Argo UI. The scaling recorder temporarily creates an HPA in the dedicated kind cluster, then removes it and restores two replicas. Do not run competing fault experiments during a recording. Video artifacts are excluded from Git and attached to the release.

A new video run repeated the scaling workload: all 92,800 deliveries arrived, and replicas moved 2 → 3 → 5. The original 2 → 4 → 5 run is retained separately. That difference illustrates the sampling and environment dependence of the experiment.
