# Threat model

This is a public-room portfolio demo. It is not a confidential messenger or a production identity service.

| Boundary / threat | Control | Residual risk |
|---|---|---|
| Browser impersonates a signed session | HMAC-signed, expiring tokens; server derives sender alias from token | Anyone can request any display name. Aliases are not verified identities. |
| Cross-site WebSocket requests | Explicit Origin allowlist and signed session on socket handshake | Non-browser clients can omit Origin. This is not an abuse-prevention boundary. |
| Message flooding / giant frames | Redis-shared 20 messages per 10 seconds per alias, 4,000-character messages, 16 KiB frame cap | An attacker can rotate aliases or open many connections. Apply edge IP rate limiting before public hosting. |
| HTML / script injection | React renders message content as text | No rich HTML or Markdown input is supported. |
| Database compromise | SQLAlchemy parameterized queries; database reachable only internally in Compose | Demo PostgreSQL has one application role and no encryption-at-rest policy. |
| Leaked session keys | Required external secret in Helm; no secrets in Helm values; logs omit access URLs | Query tokens can appear in external ingress/proxy logs. Redact query strings and terminate HTTPS. |
| Container privilege escalation | Non-root application containers, dropped capabilities, read-only app roots, restricted namespace | Kernel/runtime vulnerabilities remain out of scope. |
| Kubernetes API access | No RBAC grants, service-account token automount disabled | Cluster administrators still have full access. |
| Lateral network access | Default-deny policies with explicit DNS, proxy, gateway, and data paths | Policies only enforce with a compatible CNI. The tested kind cluster blocked signaling-to-Redis while allowing gateway-to-Redis; rerun the negative test on other clusters. |
| Dependency supply chain | Explicit direct dependency versions, CI build, Trivy critical-fixable scan, SHA-tagged GHCR images | Tags and transitive dependencies can change. Full digest pinning/signing is future work. |
| TURN abuse | Local-only demo TURN bindings; opt-in voice profile | Static demo credentials must never be published on an internet-accessible relay. Use expiring TURN credentials. |
| Lost or duplicate events | PostgreSQL history and client ID deduplication | Commit/publish gap; no durable event bus or idempotent sends. |

## Sessions and data

Guest tokens live in tab-scoped sessionStorage and expire after one hour. Expiry is checked on new HTTP requests and WebSocket handshakes; an already established socket is not forcibly expired. All room history is public to any guest. There are no private channels, moderation tools, account recovery, deletion UI, or compliance claims.

The demo defaults in Compose are conspicuously local-only examples, not operational credentials. A shared deployment requires a random session secret, unique database password, HTTPS, edge controls, a real identity provider if identity matters, and an agreed retention policy.

## Secret handling

`scripts/cluster-up.sh` generates random secrets in memory and sends them directly to the Kubernetes API. They are not committed. Kubernetes Secrets are base64 objects, not encryption by themselves. For GitOps, provision the secret separately or encrypt it with an environment-owned Sealed Secrets controller. Do not commit a plaintext Secret manifest.

The local Sealed Secrets round trip and Kyverno resource-bounds rejection are recorded in `docs/evidence`. The secret scan records its tool version, scanned commit, exclusions, and zero findings; it is a bounded automated check, not a universal guarantee. Voice peer outcome reports are untrusted and may be falsified by clients; allowed labels and per-connection deduplication limit metric cardinality but do not make reports authoritative.
