# Runbook

## Local demo

```sh
docker compose up -d --build --wait
# Open http://localhost:8085
```

Ports 8001 and 8011 address independent gateways for testing; 8002 is signaling. All published ports are bound to localhost. PostgreSQL and Redis are only on the Compose network. If a port is busy, change the mapping and corresponding origin allowlist together.

```sh
python3 -m venv .venv
.venv/bin/pip install -r tests/requirements.txt
.venv/bin/pytest -q tests
cd client && npm ci && npx playwright install chromium && npm test
```

Browser tests use the running Compose client on port 8085. They include two guest sessions, persisted chat, mobile input, and WebRTC with synthetic microphones. `PULSE_URL=http://127.0.0.1:5173 npm test` tests the Vite development client instead.

## Monitoring

```sh
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
# http://localhost:3000/d/pulse-operations — read-only Grafana
# http://localhost:9090 — Prometheus
```

The local dashboard permits anonymous viewing. Admin credentials in the example are demo defaults. Do not expose this setup to the internet. Prometheus alert rules are included; an Alertmanager notification route is not configured.

## Failure guide

| Symptom | Inspect | Recover |
|---|---|---|
| Cannot enter workspace | Browser network tab; `docker compose logs gateway` | Start data services; inspect required session secret and schema initialization |
| Reconnecting banner | `/ready`, gateway logs, Redis connectivity | Restore dependency; client retries with capped exponential backoff |
| Message exists only after refresh | Commit/publish gap or subscriber interruption | Reload history; do not claim durable live delivery |
| Stale online member | Presence leases | Wait up to roughly 45 seconds after an unclean disconnect |
| Voice waiting indefinitely | Second peer must join same room | Join from second browser and permit microphone |
| Voice fails on restrictive network | ICE candidates, TURN URL and exposed relay range | Follow `VOICE.md`; test with Force TURN |
| Pod pending | `kubectl -n pulse describe pod` | Check node capacity, image availability and storage class |
| Gateway not ready | `/ready` checks subscriber + Redis + PostgreSQL | Restore dependency before restarting pods |
| Broken rollout | `kubectl -n pulse rollout status deployment/gateway` | `helm rollback pulse <revision> -n pulse` then verify chat/history |

## Kubernetes

Prerequisites: Docker, kind, kubectl, Helm 3. Use a dedicated local cluster. The script always specifies its `kind-pulse-demo` context.

```sh
./scripts/cluster-up.sh
kubectl --context kind-pulse-demo -n pulse port-forward svc/client 8088:8080
# Open http://localhost:8088
```

This creates three nodes, builds and loads local images, creates random Kubernetes secrets, and installs Helm. The default install uses port-forwarding and does not require an ingress controller. For ingress, install a controller, set `ingress.enabled`, `ingress.className`, `ingress.host`, `ingress.tlsSecret`, and `allowedOrigins`. A real browser voice session requires HTTPS or localhost.

Run `scripts/security-check.sh` to verify the allowed gateway-to-Redis path, blocked signaling-to-Redis path, and denied service-account secret access. The recorded kindnet build passed these checks. Repeat them after changing cluster networking; policy resources alone do not prove enforcement.

HPA is opt-in: install metrics-server, confirm `kubectl top pods` works, then set `autoscaling.enabled=true`. A CPU-driven HPA will not scale merely because there are idle sockets. Track both resource use and connection count; do not manufacture a capacity claim from a configured HPA.

For Prometheus Operator, enable `monitoring.enabled` only after its CRDs exist. The ServiceMonitor/PrometheusRule labels assume a monitoring stack release called `monitoring`. The standalone Compose dashboard is available without installing that stack.

## GitOps and delivery

CI runs integration/browser tests, Helm lint/rendering, container builds, critical fixable vulnerability scans, and immutable commit-SHA publication to GHCR. A failing scan blocks publication. GitHub package permissions/visibility must allow the target cluster to pull images; private packages need an image pull secret.

The ArgoCD Application in `deploy/argocd/application.yaml` uses this repository as its desired-state source. Update all tags in `values-gitops.yaml` to a successfully published commit SHA, provision `pulse-secrets` externally, then sync manually. A single repository keeps the demo reproducible; a separate manifests repository is unnecessary for this scope. Automated pruning is deliberately not enabled in the example.

## Shutdown and retention

`docker compose stop` preserves history. `docker compose down` also preserves the named data volume. `docker compose down -v` destroys local demo history; use it only intentionally. PostgreSQL data in the kind cluster disappears when that cluster is deleted. Export anything worth retaining before cleanup.

## Optional local delivery lab

After `cluster-up.sh`, run `scripts/addons-up.sh` with Helm and kubectl installed. This installs the pinned local ingress, GitOps, admission, metrics and encryption controllers. Install kubeseal 0.40.0, then run `python3 scripts/seal-demo-secret.py` (or set `KUBESEAL` to its executable). It seals the already-provisioned demo Secret in memory, applies the SealedSecret, and checks decrypted equality without writing plaintext credentials. Keep the controller encryption key out of Git and back it up separately if retaining encrypted manifests.

Apply `deploy/argocd/application.yaml`; review the immutable images in `values-gitops.yaml`, then sync in Argo CD. The example uses manual reconciliation and no automated prune. Once Argo manages the release, update desired state through Git rather than also performing Helm upgrades against it. Restore a bad live rollout by syncing the known-good Git revision; `scripts/verify-gitops.py` demonstrates this in the dedicated demo cluster.

Forward `svc/traefik` in `ingress-system` to `8089:80` for ingress and `svc/argocd-server` in `argocd` to `8090:443` for the local Argo UI. Its initial admin password comes from `argocd-initial-admin-secret`; do not commit or screenshot it. Traefik uses a ClusterIP Service and reports loopback as the local ingress endpoint. This is not public ingress or TLS provisioning.

After restarting Docker Desktop, kind node IPs may change. Inspect node addresses and kube-system readiness before blaming application code. In this test environment, restarting the dedicated cluster's kube-proxy/kindnet/CoreDNS restored networking; one earlier control-plane kubelet endpoint also required correction. Do not apply those repairs to another cluster blindly. Port-forward processes must be restarted if their selected pods are replaced.

`verify-alerts.py`, `verify-voice-failures.cjs`, and `verify-node-drain.py` deliberately interrupt the dedicated demo. Each restores what it stopped. Run them separately from ordinary regression tests. `verify-fresh-setup.py` builds an isolated project with new data, tests it, and removes only that temporary project's volumes.
